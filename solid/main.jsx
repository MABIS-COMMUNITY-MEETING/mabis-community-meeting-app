import { render } from "solid-js/web";
import App from "~/App.jsx";
import "@/index.css";
import "@/styles/editorial-home.css";
import "~/solid-motion.css";
import { applyThemeSnapshot } from "@/lib/theme-boot";
import { applyAnimationPreference } from "@/lib/motion-preference";
import { applyJapaneseTextPreference } from "@/lib/japanese-text-preference";
import { applySectionDescriptionsPreference } from "@/lib/section-descriptions-preference";
import { startPerfMonitor } from "~/lib/perf-monitor";

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
  applyAnimationPreference();
  applyJapaneseTextPreference();
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
