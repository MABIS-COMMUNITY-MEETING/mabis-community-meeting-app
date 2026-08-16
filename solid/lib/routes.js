import { saveDataEnabled } from "@/lib/performance-tier";

/*
 * Solid route loaders.
 *
 * This deliberately does NOT reuse src/lib/routeLoaders.js. That module
 * dynamic-imports the React pages, and importing it from a Solid component
 * pulls those React files into the Solid module graph, where vite-plugin-solid
 * compiles them with the Solid JSX transform. The result builds without
 * erroring but is nonsense at runtime, and it inflated the Solid bundle from
 * ~281 KiB to 686 KiB gzip before this was caught.
 *
 * Route preloading is therefore defined here against the Solid pages, and the
 * two builds keep separate route tables. Any Solid component that wants to
 * warm a route must import from this file, never from @/lib/routeLoaders.
 */
const loaders = {
  "/": () => import("~/pages/Splash"),
  "/home": () => import("~/pages/Home"),
  "/history": () => import("~/pages/History"),
};

const started = new Map();

/** Warm a route's chunk. Skipped entirely when the user asked to save data. */
export function preloadRoute(pathname) {
  if (saveDataEnabled()) return undefined;
  const loader = loaders[pathname];
  if (!loader) return undefined;
  // Memoised: hovering a link repeatedly must not queue repeated imports.
  if (!started.has(pathname)) started.set(pathname, loader());
  return started.get(pathname);
}

export const routeLoaders = loaders;
