import { createContext, useContext, createSignal, onMount, createEffect, on, onCleanup } from "solid-js";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { createAxiosClient } from "@base44/sdk/dist/utils/axios-client";
import { isHackerMode, disableHackerMode, HACKER_USER } from "@/lib/hacker";
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
 *   · a real Base44 session always beating the local hacker-mode easter egg.
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

  const recoverOfflineState = async (error) => {
    if (!appParams.token || error?.status === 401 || error?.status === 403) return false;
    if (navigator.onLine !== false && error?.status && error.status < 500) return false;

    const { restoreOfflineQueries, restoreOfflineUser } = await import("@/lib/offline-cache");
    const offlineUser = restoreOfflineUser(appParams.token);
    if (!offlineUser) return false;

    await restoreOfflineQueries(queryClientInstance, offlineUser.id);
    setUser(offlineUser);
    setIsAuthenticated(true);
    setIsLoadingAuth(false);
    setIsLoadingPublicSettings(false);
    setAuthChecked(true);
    setAuthError(null);
    return true;
  };

  const checkUserAuth = async ({ silentUnauthenticated = false } = {}) => {
    try {
      setIsLoadingAuth(true);
      const authStarted = performance.now();
      const currentUser = await base44.auth.me();
      if (new URLSearchParams(window.location.search).get("perf") === "1") {
        // The one number that decides whether the warm-up is racing auth
        // usefully or just firing unauthenticated requests.
        console.log(`[auth] me() resolved in ${Math.round(performance.now() - authStarted)}ms `
          + `@${Math.round(performance.now())}ms`);
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

      try {
        const publicSettings = await appClient.get(`/prod/public-settings/by-id/${appParams.appId}`);
        setAppPublicSettings(publicSettings);

        const hasBase44Session = await checkUserAuth({ silentUnauthenticated: !appParams.token });

        if (!hasBase44Session && !appParams.token && isHackerMode()) {
          setUser(HACKER_USER);
          setIsAuthenticated(true);
          setIsLoadingAuth(false);
          setAuthChecked(true);
          setAuthError(null);
        }
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
    if (!id || id === HACKER_USER.id) return;
    let stop = () => {};
    let cancelled = false;

    void import("@/lib/offline-cache").then(({ startOfflineQueryPersistence }) => {
      if (!cancelled) stop = startOfflineQueryPersistence(queryClientInstance, id);
    });

    onCleanup(() => { cancelled = true; stop(); });
  }));

  const logout = async (shouldRedirect = true) => {
    const { clearOfflineData } = await import("@/lib/offline-cache");
    await clearOfflineData();
    queryClientInstance.clear();

    if (user()?.id === HACKER_USER.id) {
      disableHackerMode();
      setUser(null);
      setIsAuthenticated(false);
      window.location.href = "/login";
      return;
    }

    disableHackerMode();
    setUser(null);
    setIsAuthenticated(false);

    if (shouldRedirect) base44.auth.logout(window.location.href);
    else base44.auth.logout();
  };

  const navigateToLogin = () => base44.auth.redirectToLogin(window.location.href);

  const updateUser = async () => {
    try {
      const currentUser = await base44.auth.me();
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
