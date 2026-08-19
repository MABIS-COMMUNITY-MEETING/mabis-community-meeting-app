import { lazy, Suspense, Show, onMount } from "solid-js";
import { Router, Route, Navigate } from "@solidjs/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import { queryClientInstance } from "~/lib/query-client";
import { AuthProvider, useAuth } from "~/lib/AuthContext";
import { Toaster } from "~/lib/toast";
import { loadHomeRoute, startHomeModuleWarmup } from "~/lib/routes";
import OptionalCustomCursor from "~/components/OptionalCustomCursor";
import CjkFontLoader from "~/components/CjkFontLoader";
import LoadingScreen from "~/components/LoadingScreen";
import JapaneseUiCompanion from "~/components/JapaneseUiCompanion";
import MotionPreference from "~/components/MotionPreference";
import PrefsSync from "~/components/PrefsSync";
import ScrollToTop from "~/components/ScrollToTop";
import SoundEffects from "~/components/SoundEffects";
import PrideAmbience from "~/components/PrideAmbience";
import PageTransition from "~/components/PageTransition";
import UserNotRegisteredError from "~/components/UserNotRegisteredError";
import { GrainOverlay, PaletteStripe, ScrollProgress } from "~/components/chrome";

/*
 * Solid migration — application shell.
 *
 * Provider order matches the React build: motion preference outermost, then
 * auth, then the query client, then routes.
 *
 * Routes are code-split so the landing page never downloads Home. Solid's
 * lazy() starts the fetch on first render of the route, and Suspense holds
 * LoadingScreen so a route swap cannot shift layout.
 */
const Splash = lazy(() => import("~/pages/Splash"));
const Login = lazy(() => import("~/pages/Login"));
/* Routed through the reporting loader so the loading screen's counter reflects
   real progress instead of sitting at its initial value. */
const Home = lazy(() => loadHomeRoute());
const History = lazy(() => import("~/pages/History"));
const AnnouncementsHistory = lazy(() => import("~/pages/AnnouncementsHistory"));
const NewsHistory = lazy(() => import("~/pages/NewsHistory"));
const Feedback = lazy(() => import("~/pages/Feedback"));
const NotFound = lazy(() => import("~/pages/NotFound"));

/*
 * /register, /forgot-password and /reset-password are retired routes kept as
 * redirects so old bookmarks and any link still in the wild land on the Google
 * flow instead of a 404. Matches the React table exactly, including `replace`
 * (Solid's <Navigate> always replaces, same as React's `replace` prop).
 */
function RedirectToLogin() {
  return <Navigate href="/login" />;
}

/*
 * React shows LoadingScreen both as the Suspense fallback and while auth is
 * resolving. It is not lazy on purpose: it is the thing shown *while* chunks
 * load, so putting it behind a chunk of its own would leave a blank screen
 * exactly when it is needed.
 */
function RouteFallback() {
  return <LoadingScreen />;
}

/*
 * Fallback for a plain route swap.
 *
 * LoadingScreen says "CACHING STUFF" and reports warm-up progress — that is
 * Home's story, and showing it while a 2.5 KiB Login chunk loads is both a lie
 * and slower-feeling than nothing. Signed-out routes get a height-reserving
 * blank instead, so the page cannot shift and no false progress is implied.
 */
function ChunkFallback() {
  return <div style={{ "min-height": "100vh" }} aria-hidden />;
}

/*
 * Mirrors React's ProtectedRoute + AuthenticatedApp, including the auth-error
 * branch that was missing from this build: an unregistered Google account gets
 * the explanatory screen rather than being bounced silently back to login.
 */
function Protected(props) {
  const auth = useAuth();
  return (
    <Show when={!auth.isLoadingAuth() && !auth.isLoadingPublicSettings()} fallback={<RouteFallback />}>
      <Show
        when={auth.authError()?.type !== "user_not_registered"}
        fallback={<UserNotRegisteredError />}
      >
        <Show when={auth.isAuthenticated()} fallback={<Navigate href="/login" />}>
          <PageTransition>{props.children}</PageTransition>
        </Show>
      </Show>
    </Show>
  );
}

function ProtectedHome() {
  /*
   * Home's chunks need no token, so they start downloading now rather than
   * after auth resolves — <Home> is behind two Show gates that auth controls,
   * and lazy() would otherwise not even begin fetching until both had passed.
   *
   * onMount, not the component body: the body runs during render, which is
   * BEFORE AuthProvider's own onMount fires, so calling it there would put a
   * dozen chunk requests on the wire ahead of the auth calls they are meant to
   * overlap. Effects run in creation order, and the provider is created first.
   */
  onMount(() => { void startHomeModuleWarmup(); });
  return <Protected><Home /></Protected>;
}

function ProtectedHistory() {
  return <Protected><History /></Protected>;
}

function ProtectedAnnouncementsHistory() {
  return <Protected><AnnouncementsHistory /></Protected>;
}

function ProtectedNewsHistory() {
  return <Protected><NewsHistory /></Protected>;
}

function ProtectedFeedback() {
  return <Protected><Feedback /></Protected>;
}

/* React wraps every route except Splash in PageTransition. */
/*
 * /login, but never for someone who is already signed in.
 *
 * Splash decides where Enter goes, but it is not the only way in: a bookmark,
 * a back button, an old link in a chat, or the OAuth redirect landing after the
 * session was already restored all arrive here directly. Without this they
 * would sit on a login form they have no reason to see.
 *
 * Gated on isLoadingAuth so the probe gets to finish first — redirecting on the
 * initial `false` would bounce a signed-in reader to /home, fail Protected's
 * check, and send them straight back here.
 */
function TransitionedLogin() {
  const auth = useAuth();
  return (
    <Show when={auth.isLoadingAuth() || !auth.isAuthenticated()} fallback={<Navigate href="/home" />}>
      <PageTransition><Login /></PageTransition>
    </Show>
  );
}

function TransitionedNotFound() {
  return <PageTransition><NotFound /></PageTransition>;
}

export default function App() {
  return (
    <MotionPreference>
      <QueryClientProvider client={queryClientInstance}>
        <AuthProvider>
          {/* Shell effects, mounted once and never re-run by navigation. Order
              matches the React tree: the CJK stylesheet is requested before the
              companion layer starts writing lang="ja" nodes into the DOM. */}
          <CjkFontLoader />
          <JapaneseUiCompanion />
          <PrefsSync />
          <SoundEffects />
          <GrainOverlay />
          <PrideAmbience />
          <PaletteStripe />
          <ScrollProgress />
          <Suspense fallback={<ChunkFallback />}>
            <Router root={ScrollResetRoot}>
              <Route path="/" component={Splash} />
              <Route path="/login" component={TransitionedLogin} />
              <Route path="/register" component={RedirectToLogin} />
              <Route path="/forgot-password" component={RedirectToLogin} />
              <Route path="/reset-password" component={RedirectToLogin} />
              <Route path="/home" component={ProtectedHome} />
              <Route path="/history" component={ProtectedHistory} />
              <Route path="/history/announcements" component={ProtectedAnnouncementsHistory} />
              <Route path="/history/news" component={ProtectedNewsHistory} />
              <Route path="/feedback" component={ProtectedFeedback} />
              <Route path="*" component={TransitionedNotFound} />
            </Router>
          </Suspense>
          <OptionalCustomCursor />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </MotionPreference>
  );
}

/*
 * ScrollToTop needs useLocation(), which only resolves inside the Router — so
 * it goes in the router's `root` layout rather than beside the other shell
 * effects above. Everything else up there is router-independent.
 */
function ScrollResetRoot(props) {
  return (
    <>
      <ScrollToTop />
      {props.children}
    </>
  );
}
