import { render } from "solid-js/web";
import App from "~/App.jsx";
import "@/index.css";
import "@/styles/glass.css";
import "@/styles/editorial-home.css";
import "@/styles/summer-home.css";
import "~/solid-motion.css";
import { applyThemeSnapshot } from "@/lib/theme-boot";
import { applyAnimationPreference } from "@/lib/motion-preference";
import { applyJapaneseTextPreference } from "@/lib/japanese-text-preference";
import { applyHomeLayoutPreference } from "@/lib/layout-preference";
import { applySectionDescriptionsPreference } from "@/lib/section-descriptions-preference";
import { startPerfMonitor } from "~/lib/perf-monitor";
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
  // The splash has exactly one destination. Warming it here means the button
  // press is a render, not a download.
  if (window.location.pathname === "/") preloadRoute("/login");

  applyAnimationPreference();
  applyJapaneseTextPreference();
  /* Puts home-layout-simple / home-layout-boss on <html> BEFORE first paint,
     so editorial-home.css (which is gated on the boss class) either matches or
     does not from the very first frame. Doing this after render would flash the
     wrong style. */
  applyHomeLayoutPreference();
  applySectionDescriptionsPreference();

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

  // Opt-in only (?perf=1). Costs nothing otherwise — a monitor that slows the
  // page down would defeat its own purpose.
  startPerfMonitor();

  if (replayed) reconcileThemeAfterPaint();
  idlePreloadRemainingRoutes();

  // Installing after load keeps precache traffic out of the critical path.
  // The worker is a progressive enhancement and never intercepts Base44 APIs.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    const register = () => {
      const run = () => navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
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

bootstrap();
