import { lazy, Suspense, Show } from "solid-js";
import { Router, Route, Navigate } from "@solidjs/router";
import { QueryClientProvider } from "@tanstack/solid-query";
import { queryClientInstance } from "~/lib/query-client";
import { AuthProvider, useAuth } from "~/lib/AuthContext";
import { Toaster } from "~/lib/toast";
import OptionalCustomCursor from "~/components/OptionalCustomCursor";

/*
 * Solid migration — application shell.
 *
 * Provider order matches the React build: query client outermost (auth writes
 * into its cache), then auth, then routes.
 *
 * Routes are code-split so the landing page never downloads Home. Solid's
 * lazy() starts the fetch on first render of the route, and Suspense holds a
 * height-reserving fallback so a route swap cannot shift layout.
 */
const Splash = lazy(() => import("~/pages/Splash"));
const Home = lazy(() => import("~/pages/Home"));
const History = lazy(() => import("~/pages/History"));
const AnnouncementsHistory = lazy(() => import("~/pages/AnnouncementsHistory"));
const NewsHistory = lazy(() => import("~/pages/NewsHistory"));

function RouteFallback() {
  return <div style={{ "min-height": "100vh" }} aria-hidden />;
}

/** Mirrors the React ProtectedRoute: unauthenticated users go to login. */
function Protected(props) {
  const auth = useAuth();
  return (
    <Show when={!auth.isLoadingAuth()} fallback={<RouteFallback />}>
      <Show when={auth.isAuthenticated()} fallback={<Navigate href="/login" />}>
        {props.children}
      </Show>
    </Show>
  );
}

function ProtectedHome() {
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

export default function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <AuthProvider>
        <Suspense fallback={<RouteFallback />}>
          <Router>
            <Route path="/" component={Splash} />
            <Route path="/home" component={ProtectedHome} />
            <Route path="/history" component={ProtectedHistory} />
            <Route path="/history/announcements" component={ProtectedAnnouncementsHistory} />
            <Route path="/history/news" component={ProtectedNewsHistory} />
          </Router>
        </Suspense>
        <OptionalCustomCursor />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}
