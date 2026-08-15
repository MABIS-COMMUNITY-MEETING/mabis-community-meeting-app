import { render } from "solid-js/web";
import App from "~/App.jsx";
import "@/index.css";
import "@/styles/editorial-home.css";
import "~/solid-motion.css";
import { applyTheme, getStoredTheme, getStoredCustomColors, applyCustomColors, applyFont, getStoredFont } from "@/lib/themes";
import { applyAnimationPreference } from "@/lib/motion-preference";
import { applyJapaneseTextPreference } from "@/lib/japanese-text-preference";
import { startPerfMonitor } from "~/lib/perf-monitor";

/*
 * Identical bootstrap order to src/main.jsx.
 *
 * This sequence is load-bearing for the look, not incidental: every visual
 * preference is resolved BEFORE the first paint, otherwise the app paints in
 * the CSS default font/theme and visibly swaps a moment later. The theme and
 * font modules are the React app's own — they touch documentElement directly
 * and contain no React, so both builds share one source of truth.
 */
async function bootstrap() {
  applyAnimationPreference();
  applyJapaneseTextPreference();

  applyTheme(getStoredTheme());
  const customColors = getStoredCustomColors();
  if (customColors) applyCustomColors(customColors.primary, customColors.secondary);

  const fontLoad = applyFont(getStoredFont());
  await Promise.race([
    fontLoad,
    new Promise((resolve) => window.setTimeout(resolve, 800)),
  ]);
  document.documentElement.classList.add("ui-font-ready");

  render(() => <App />, document.getElementById("root"));

  // Opt-in only (?perf=1). Costs nothing otherwise — a monitor that slows the
  // page down would defeat its own purpose.
  startPerfMonitor();
}

bootstrap();
