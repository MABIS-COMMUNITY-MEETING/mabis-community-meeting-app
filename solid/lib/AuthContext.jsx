import { createContext, useContext, createSignal, onMount, createEffect, on, onCleanup } from "solid-js";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { createAxiosClient } from "@base44/sdk/dist/utils/axios-client";
import { disableHackerMode } from "@/lib/hacker";
import {
  isMabisSchoolEmail,
  SCHOOL_EMAIL_REQUIRED_REASON,
} from "@/lib/school-email";
import { queryClientInstance } from "~/lib/query-client";

/*
 * Port of src/lib/AuthContext.jsx.
 *
 * The auth *logic* is carried over verbatim, deliberately — it encodes several
 * hard-won behaviours that are easy to lose in a rewrite:
 *
 *   · the silent cookie probe, so a Google OAuth return that restores a
 *     session via cookie (no access_token in the URL) is not mistaken for a
 *     signed-out visit, which used to force users through the provider twice;
 *   · offline recovery, so a network failure with a cached user restores the
 *     session instead of bouncing to login;
 *   · exact school-domain validation before any online or cached identity can
 *     become authenticated.
 *
 * What changed is only the reactive plumbing: useState→createSignal, and
 * context values are exposed as getter functions because Solid tracks reads,
 * not renders — handing over a plain object would snapshot the values once
 * and never update.
 */

const AuthContext = createContext(null);

export function AuthProvider(props) {
  const [user, setUser] = createSignal(null);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);
  const [isLoadingAuth, setIsLoadingAuth] = createSignal(true);
  const [isLoadingPublicSettings, setIsLoadingPublicSettings] = createSignal(true);
  const [authError, setAuthError] = createSignal(null);
  const [authChecked, setAuthChecked] = createSignal(false);
  const [appPublicSettings, setAppPublicSettings] = createSignal(null);

  const clearLocalSession = async () => {
    disableHackerMode();
    setUser(null);
    setIsAuthenticated(false);
    queryClientInstance.clear();

    const { clearOfflineData } = await import("@/lib/offline-cache");
    await clearOfflineData();
  };

  const rejectDisallowedUser = async () => {
    await clearLocalSession();
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
    setAuthError({
      type: SCHOOL_EMAIL_REQUIRED_REASON,
      message: "A @montessoribkk.com Google account is required",
    });

    const loginUrl = `${window.location.origin}/login?reason=${SCHOOL_EMAIL_REQUIRED_REASON}`;
    base44.auth.logout(loginUrl);
  };

  const recoverOfflineState = async (error) => {
    if (!appParams.token || error?.status === 401 || error?.status === 403) return false;
    if (navigator.onLine !== false && error?.status && error.status < 500) return false;

    const { restoreOfflineQueries, restoreOfflineUser } = await import("@/lib/offline-cache");
    const offlineUser = restoreOfflineUser(appParams.token);
    if (!offlineUser) return false;
    if (!isMabisSchoolEmail(offlineUser.email)) {
      await rejectDisallowedUser();
      return true;
    }

    await restoreOfflineQueries(queryClientInstance, offlineUser.id);
    setUser(offlineUser);
    setIsAuthenticated(true);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
    setAuthError(null);
    return true;
  };

  /*
   * `session` lets the caller hand in an already-in-flight base44.auth.me().
   * Everything else about this function — the order it writes signals in, the
   * error branches — is unchanged, which is the point: the request moves
   * earlier, the state machine does not move at all.
   */
  const checkUserAuth = async ({ silentUnauthenticated = false, session } = {}) => {
    try {
      setIsLoadingAuth(true);
      const currentUser = await (session || base44.auth.me());
      if (!isMabisSchoolEmail(currentUser?.email)) {
        await rejectDisallowedUser();
        return false;
      }

      disableHackerMode();
      setUser(currentUser);
      setIsAuthenticated(true);
      setIsLoadingAuth(false);
      setAuthChecked(true);

      // Cache hydration must never hold the signed-in UI behind an IndexedDB
      // read or a second chunk, so it is fired and forgotten.
      void import("@/lib/offline-cache").then(async ({ restoreOfflineQueries, saveOfflineUser }) => {
        await restoreOfflineQueries(queryClientInstance, currentUser.id);
        saveOfflineUser(currentUser, appParams.token);
      });
      return true;
    } catch (error) {
      const reason = error.data?.extra_data?.reason;
      const expectedSignedOut = silentUnauthenticated
        && (error.status === 401 || error.status === 403)
        && reason !== "user_not_registered";
      if (!expectedSignedOut) console.error("User auth check failed:", error);
      if (await recoverOfflineState(error)) return true;

      setUser(null);
      setIsLoadingAuth(false);
      setIsAuthenticated(false);
      setAuthChecked(true);

      if (reason === "user_not_registered") {
        setAuthError({ type: "user_not_registered", message: "User not registered for this app" });
      } else if (!silentUnauthenticated && (error.status === 401 || error.status === 403)) {
        setAuthError({ type: "auth_required", message: "Authentication required" });
      } else if (silentUnauthenticated) {
        // A missing cookie on the initial probe is an ordinary signed-out
        // state, not an application error.
        setAuthError(null);
      }
      return false;
    }
  };

  const checkAppState = async () => {
    try {
      setIsLoadingPublicSettings(true);
      setAuthError(null);

      const appClient = createAxiosClient({
        baseURL: "/api/apps/public",
        headers: { "X-App-Id": appParams.appId },
        token: appParams.token,
        interceptResponses: true,
      });

      /*
       * Who you are and how the app is configured are independent questions,
       * but they used to be asked one after the other — so every cold load
       * paid two serial round-trips before a single entity read could start,
       * and /home's widgets were stuck behind both.
       *
       * Issued here, awaited below in exactly the old order. Overlapping the
       * REQUESTS is safe; overlapping the state writes would not be, because
       * the failure branches below decide which error wins.
       */
      const session = base44.auth.me();
      /* Marks `session` handled so a failing app-state check — which returns
         before the await below — cannot surface as an unhandled rejection.
         The rejection is still delivered to checkUserAuth, which owns it. */
      session.catch(() => {});

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        await checkUserAuth({ silentUnauthenticated: !appParams.token, session });
        setIsLoadingPublicSettings(false);
      } catch (appError) {
        console.error("App state check failed:", appError);
        if (await recoverOfflineState(appError)) return;

        if (appError.status === 403 && appError.data?.extra_data?.reason) {
          const reason = appError.data.extra_data.reason;
          if (reason === "auth_required") {
            setAuthError({ type: "auth_required", message: "Authentication required" });
          } else if (reason === "user_not_registered") {
            setAuthError({ type: "user_not_registered", message: "User not registered for this app" });
          } else {
            setAuthError({ type: reason, message: appError.message });
          }
        } else {
          setAuthError({ type: "unknown", message: appError.message || "Failed to load app" });
        }
        setIsLoadingPublicSettings(false);
        setIsLoadingAuth(false);
      }
    } catch (error) {
      console.error("Unexpected error:", error);
      if (await recoverOfflineState(error)) return;
      setAuthError({ type: "unknown", message: error.message || "An unexpected error occurred" });
      setIsLoadingPublicSettings(false);
      setIsLoadingAuth(false);
    }
  };

  onMount(() => { void checkAppState(); });

  // Offline persistence follows the signed-in user, and is torn down when the
  // user changes or the provider is disposed.
  createEffect(on(() => user()?.id, (id) => {
    if (!id) return;
    let stop = () => {};
    let cancelled = false;

    void import("@/lib/offline-cache").then(({ startOfflineQueryPersistence }) => {
      if (!cancelled) stop = startOfflineQueryPersistence(queryClientInstance, id);
    });

    onCleanup(() => { cancelled = true; stop(); });
  }));

  const logout = async (shouldRedirect = true) => {
    await clearLocalSession();

    if (shouldRedirect) base44.auth.logout(window.location.href);
    else base44.auth.logout();
  };

  const navigateToLogin = () => base44.auth.redirectToLogin(window.location.href);

  const updateUser = async () => {
    try {
      const currentUser = await base44.auth.me();
      if (!isMabisSchoolEmail(currentUser?.email)) {
        await rejectDisallowedUser();
        return;
      }

      disableHackerMode();
      const { saveOfflineUser } = await import("@/lib/offline-cache");
      saveOfflineUser(currentUser, appParams.token);
      setUser(currentUser);
    } catch { /* ignore */ }
  };

  // Getters, not values: Solid tracks property reads, so passing snapshots
  // here would freeze consumers at their initial state.
  const value = {
    user,
    isAuthenticated,
    isLoadingAuth,
    isLoadingPublicSettings,
    authError,
    appPublicSettings,
    authChecked,
    logout,
    navigateToLogin,
    checkUserAuth,
    refetchUser: checkUserAuth,
    updateUser,
    checkAppState,
  };

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
}
