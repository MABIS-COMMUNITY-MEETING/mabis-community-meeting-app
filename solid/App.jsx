import Splash from "~/pages/Splash";

/*
 * Solid migration — Splash vertical slice.
 *
 * Renders the ported Splash page against the shared theme engine and
 * stylesheet, so it can be compared side by side with the React build at
 * dist/ before the remaining pages are touched.
 *
 * Routing is intentionally not wired yet: @solidjs/router replaces
 * react-router-dom as its own migration step, and pulling it in here would
 * mix two concerns into one slice.
 */
export default function App() {
  return <Splash />;
}
