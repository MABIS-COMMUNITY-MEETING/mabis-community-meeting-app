import { render } from "solid-js/web";
import App from "~/App.jsx";
/*
 * Every stylesheet is linked from the entry, eagerly.
 *
 * glass.css and editorial-home.css were split out to travel with the boss
 * chunk instead — 25.4 KiB the default layout can never match. That was
 * correct on paper and it built clean, but the top bar rendered with no glass
 * afterwards and could not be diagnosed remotely, so it was reverted at
 * Novesce's request.
 *
 * The cost of being wrong is asymmetric: 25.4 KiB of unused CSS is a number in
 * a report, while a top bar with no material is the first thing anyone sees.
 * If the split is attempted again, verify it in a real browser before relying
 * on it — a green build proves the file is emitted, not that the link lands.
 */
import "@/index.css";
import "@/styles/glass.css";
import "@/styles/editorial-home.css";
import "@/styles/summer-home.css";
import "~/solid-motion.css";
import { applyThemeSnapshot } from "@/lib/theme-boot";
import { applyAnimationPreference } from "@/lib/motion-preference";
import { applyJapaneseTextPreference } from "@/lib/japanese-text-preference";
import { applySectionDescriptionsPreference } from "@/lib/section-descriptions-preference";
import { applyHomeLayoutPreference, syncHomeLayoutCache } from "@/lib/layout-preference";
import { applyScrollbarMode } from "@/lib/scrollbar-mode";
import { preloadRoute } from "~/lib/routes";

/*
 * Same visual result as src/main.jsx, reached with less work before first paint.
 *
 * The ordering is load-bearing: every visual preference resolves BEFORE the
 * first paint, or the app paints in the CSS default font/theme and visibly
 * swaps a moment later.
 *
 * What changed from the React bootstrap is where the theme comes from.
 * Importing @/lib/themes statically pulled the whole catalogue — themes, pride,
 * GMK and BFDI palettes, contrast maths, the font tables, ~117 KB of source —
 * into the boot chunk, to apply the one theme the user already had. Now a
 * snapshot of the previous paint is replayed (lib/theme-boot.js), and the real
 * modules load AFTER the app is on screen to re-apply authoritatively.
 *
 * The catalogue is still statically imported by ThemeSwitcher and
 * SettingsModal, which are lazy — so it lands in their chunk instead of the
 * boot path.
 */
async function bootstrap() {
  // Fire this before anything else, unawaited: it is the fix for the
  // "loading screen splashes a couple of times" bug on the current route
  // (most visibly /home right after the Google OAuth redirect lands on a
  // brand-new page load). Without it, the current route's lazy chunk only
  // starts loading once AuthProvider resolves and <Protected> switches to
  // its true branch — too late to beat the outer <Suspense>, which then
  // remounts LoadingScreen a second time (a real, visible flash) before
  // PageTransition's own curtain plays on top of that. Starting the chunk
  // fetch here lets it race the auth check instead of queueing behind it, so
  // by the time auth resolves the chunk is normally already cached and
  // <Home/> (or whichever route this is) renders synchronously — no second
  // Suspense fallback, no extra flash. idlePreloadRemainingRoutes() below
  // still warms every OTHER route, just later, since only this one is on the
  // critical path for first paint.
  preloadRoute(window.location.pathname);
  // The splash has exactly two possible destinations, and until auth
  // resolves there is no way to know which — so warm both. loaders["/home"]
  // is deliberately chunk-only (see routes.js), no entity reads, so this
  // cannot fire an unauthenticated data request; it only means Splash's
  // now-client-side Enter navigation (see pages/Splash.jsx) has Home's JS
  // already in cache instead of fetching it after the click.
  if (window.location.pathname === "/") {
    preloadRoute("/login");
    preloadRoute("/home");
  }

  applyAnimationPreference();
  applyJapaneseTextPreference();
  applySectionDescriptionsPreference();
  applyHomeLayoutPreference();
  /* Before first paint with the rest of them: the custom scrollbar must not
     render once and then swap. Costs one forced layout of a detached 100px
     box, and decides whether this machine gets the styled scrollbar at all —
     see lib/scrollbar-mode.js. */
  applyScrollbarMode();

  const replayed = applyThemeSnapshot();

  if (!replayed) {
    // First visit, cleared storage, or a changed preference: no usable
    // snapshot, so pay the original cost. Same code path as before.
    const themes = await import("@/lib/themes");
    themes.applyTheme(themes.getStoredTheme());
    const customColors = themes.getStoredCustomColors();
    if (customColors) themes.applyCustomColors(customColors.primary, customColors.secondary);
    await Promise.race([
      themes.applyFont(themes.getStoredFont()),
      new Promise((resolve) => window.setTimeout(resolve, 800)),
    ]);
  }

  document.documentElement.classList.add("ui-font-ready");
  render(() => <App />, document.getElementById("root"));

  /*
   * The inlined boot splash has done its job. It already hid itself the
   * moment #root stopped being empty (a sibling selector in index.html, so it
   * works even if this line never runs), but leaving a hidden fixed-position
   * element in the tree serves nothing — take it out.
   */


  // Opt-in only (?perf=1). Costs nothing otherwise — a monitor that slows the
  // page down would defeat its own purpose.
  startPerfMonitorIfRequested();

  if (replayed) reconcileThemeAfterPaint();
  idlePreloadRemainingRoutes();

  // Installing after load keeps precache traffic out of the critical path.
  // The worker is a progressive enhancement and never intercepts Base44 APIs.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    /*
     * The worker calls skipWaiting(), so a new build can take control of this
     * page while it is open. This page's own lazy chunks belong to the build
     * it loaded, and the new worker has just evicted them from the cache, so
     * the next route or widget import could 404. One reload lands cleanly on
     * the new build.
     *
     * Only when there WAS a controller: on a first visit controllerchange
     * fires because the very first worker took over, and reloading there
     * would be a pointless flash on every new device.
     */
    const hadController = Boolean(navigator.serviceWorker.controller);
    let reloading = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!hadController || reloading) return;
      reloading = true;
      window.location.reload();
    });

    const register = () => {
      const run = () => navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        // Only the layout in use belongs in the offline shell. Told once here
        // so a reader who never opens Settings still gets the right one, and
        // again from setHomeLayout() on every change.
        .then(() => syncHomeLayoutCache())
        .catch(() => {});
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 3000 });
      } else {
        window.setTimeout(run, 1000);
      }
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

/*
 * Warm every remaining route chunk once the app is up, so a first visit to a
 * new section resolves from cache instead of suspending.
 *
 * SiteHeader already preloads on pointerenter/focus, but that only gives a
 * real head start with a mouse. On touch, pointerenter fires essentially
 * alongside the tap itself — no dwell time before the click — so on a phone
 * (the app's primary layout) every first visit to Home, History, Feedback etc.
 * still suspended and the fixed-fullscreen LoadingScreen took the whole app
 * over again, on top of the one shown on initial boot. That repeat takeover is
 * the "splashes multiple times" symptom. Warming all chunks here means the
 * Suspense boundary almost never has anything left to wait on after boot.
 *
 * Idle-scheduled and route-loader-driven (preloadRoute already yields when
 * the user has Save-Data on), so it never competes with first paint or a slow
 * connection.
 */
function idlePreloadRemainingRoutes() {
  const run = () => {
    import("~/lib/routes").then(({ preloadRoute, routeLoaders }) => {
      const current = window.location.pathname;
      Object.keys(routeLoaders).forEach((path) => {
        if (path !== current) preloadRoute(path);
      });
    }).catch(() => {
      /* offline or a chunk 404: navigation still works, it just suspends again */
    });
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 4000 });
  else window.setTimeout(run, 1800);
}

/*
 * The snapshot is a cache, not the source of truth. Once the page is up, load
 * the real modules and re-apply: idempotent when the snapshot was right, and
 * self-repairing when it was written by an older build with different theme
 * definitions. Deferred to idle so it cannot compete with first paint.
 */
function reconcileThemeAfterPaint() {
  const run = () => {
    import("@/lib/themes").then((themes) => {
      themes.applyTheme(themes.getStoredTheme());
      const customColors = themes.getStoredCustomColors();
      if (customColors) themes.applyCustomColors(customColors.primary, customColors.secondary);
      themes.applyFont(themes.getStoredFont());
    }).catch(() => {
      /* offline: the replayed snapshot is already correct on screen */
    });
  };
  if ("requestIdleCallback" in window) window.requestIdleCallback(run, { timeout: 3000 });
  else window.setTimeout(run, 1200);
}

/*
 * startPerfMonitor() returns immediately when the monitor is off, so importing
 * it looked free — but the import is not the call. The whole module (five
 * PerformanceObservers, the rAF frame sampler and the console report) was
 * compiled into the boot chunk on every visit: 3.6 KiB of parse work to decide
 * to do nothing. Reading the flag is a two-line localStorage lookup, so it
 * happens here and the module is fetched only when it is going to run.
 *
 * This is a read only. Persisting ?perf=1 stays in perf-monitor's own
 * perfEnabled(), which runs again inside startPerfMonitor() — one writer, and
 * this gate cannot drift into disagreeing with it about what to store.
 */
const PERF_FLAG = "mabis-perf";

function startPerfMonitorIfRequested() {
  let requested = false;
  try {
    requested = new URLSearchParams(location.search).has("perf")
      || localStorage.getItem(PERF_FLAG) === "1";
  } catch {
    return;
  }
  if (!requested) return;
  import("~/lib/perf-monitor").then(({ startPerfMonitor }) => startPerfMonitor()).catch(() => {});
}

bootstrap();
