import { saveDataEnabled } from "@/lib/performance-tier";
import { setLoadingState } from "@/lib/loading-state";

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
/*
 * Home reports its progress while it loads.
 *
 * LoadingScreen renders whatever setLoadingState() last published. Nothing in
 * this build ever called it, so the counter sat frozen at its initial value for
 * the whole load — the app looked stuck rather than busy, which reads as far
 * slower than it is. React drove this from routeLoaders.js; this is the same
 * contract, without the speculative data warm-up.
 */
let homeRoutePromise;
function loadHomeRoute() {
  if (homeRoutePromise) return homeRoutePromise;
  setLoadingState({ progress: 8, label: "CACHING STUFF", detail: "HOME / SECTIONS 01\u201310" });

  /*
   * Home's own chunk and the section warm-up run together, and the route waits
   * for BOTH — that is the point. Resolving as soon as Home's chunk lands would
   * put the user in front of ten empty widgets that then each start fetching;
   * spending those same seconds on the loading screen means the widgets have
   * their data the moment they mount.
   *
   * The warm-up is bounded so a slow or dead endpoint cannot strand anyone on
   * the loading screen: past the budget the route resolves anyway and the
   * widgets fall back to fetching for themselves.
   */
  // React used 2800ms and waited for ALL warm-up tasks. This waits only for
  // the first viewport, so the budget is a backstop rather than the norm.
  //
  // 1500 → 900: isConstrainedNetwork() (saveData / effectiveType) already
  // gives slow-2g/2g connections a lighter warm-up (3 sections + 4 data calls
  // instead of 21 tasks), so the budget's real job is bounding the tail case
  // it does NOT catch — a connection with normal effectiveType but high
  // latency or a slow endpoint. On a fast connection this changes nothing:
  // 21 concurrent small JSON calls plus already-compiled JS chunks routinely
  // finish well under 900ms, so `warm` wins the Promise.race either way and
  // the budget never fires. On a slow-but-not-detected-as-constrained
  // connection, this shaves 600ms off the worst case before falling back to
  // the already-designed degradation path: the route resolves, Home mounts,
  // and any widget that missed its prefetch just fetches for itself. Pairs
  // with LoadingScreen's trickle animation — the wait that remains no longer
  // reads as frozen either way.
  const budget = 900;
  homeRoutePromise = (async () => {
    const chunk = import("~/pages/Home");
    const warm = import("~/lib/home-warmup")
      .then(({ warmHomeRoute }) => warmHomeRoute((p) => setLoadingState({
        progress: p.progress, label: "CACHING STUFF", detail: p.detail,
      })))
      .catch(() => undefined);

    const mod = await chunk;
    mark("home: chunk ready");
    let timer;
    await Promise.race([
      warm,
      new Promise((resolve) => { timer = setTimeout(resolve, budget); }),
    ]).finally(() => clearTimeout(timer));

    mark("home: warm-up settled (or budget hit)");
    setLoadingState({ progress: 100, label: "CACHING STUFF", detail: "SECTIONS READY" });
    return mod;
  })()
    .catch((error) => {
      // A failed chunk must not leave the counter parked mid-way forever.
      setLoadingState({ progress: 100, label: "CACHING STUFF", detail: "RETRYING" });
      homeRoutePromise = undefined;
      throw error;
    });
  return homeRoutePromise;
}

const loaders = {
  "/": () => import("~/pages/Splash"),
  "/login": () => import("~/pages/Login"),
  "/home": loadHomeRoute,
  "/history": () => import("~/pages/History"),
  "/history/announcements": () => import("~/pages/AnnouncementsHistory"),
  "/history/news": () => import("~/pages/NewsHistory"),
  "/feedback": () => import("~/pages/Feedback"),
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
