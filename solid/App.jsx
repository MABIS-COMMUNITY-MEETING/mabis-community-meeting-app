import { lazy, Suspense } from "solid-js";
import { Router, Route } from "@solidjs/router";

/*
 * Solid migration — routing shell.
 *
 * Splash is eager because it is the landing view; Home is code-split so the
 * landing page never downloads the heavier route. Solid's lazy() + Suspense
 * mirror the React build's boundaries, and the fallback reserves height so a
 * route swap does not shift layout.
 */
const Splash = lazy(() => import("~/pages/Splash"));
const Home = lazy(() => import("~/pages/Home"));

function RouteFallback() {
  return <div style={{ "min-height": "100vh" }} aria-hidden />;
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Router>
        <Route path="/" component={Splash} />
        <Route path="/home" component={Home} />
      </Router>
    </Suspense>
  );
}
