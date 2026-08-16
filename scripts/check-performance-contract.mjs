import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

/*
 * Source-agnostic file lookup.
 *
 * These contracts were written when React was the only UI. Every assertion
 * names a path under src/, so removing the React UI layer would fail the build
 * at prebuild with "Missing mandatory file" before Vite even runs — the design
 * rules would look violated when all that changed was which framework renders
 * them. The rules are about the product, not the framework.
 *
 * So a React UI path that no longer exists falls back to its Solid counterpart.
 * While both builds exist this never triggers; once src/ holds only the shared
 * lib/api/styles layer, the same rules keep being enforced against solid/.
 */
function resolveSourcePath(relativePath) {
    if (fs.existsSync(path.join(root, relativePath))) return relativePath;
    const solidPath = relativePath
        .replace(/^src\/components\//, "solid/components/")
        .replace(/^src\/pages\//, "solid/pages/")
        .replace(/^src\/(App|main)\.jsx$/, "solid/$1.jsx");
    return solidPath !== relativePath && fs.existsSync(path.join(root, solidPath))
        ? solidPath
        : relativePath;
}

/*
 * Where a rule lives once the UI is Solid.
 *
 * Every assertion below names a path under src/, from when React was the only
 * UI. Removing the React UI layer would fail this guard with "Missing
 * performance file" before Vite runs — the performance rules would look
 * violated when all that changed is which framework renders them.
 *
 * Solid groups some of this differently (the job wheel's canvas work is its own
 * component; LazySection's network guard lives in lib/perf.js), so a mapped
 * entry may list several files whose contents are concatenated.
 */
const SOLID_EQUIVALENTS = {
  "src/components/home/LazySection.jsx": ["solid/components/home/shell.jsx", "solid/lib/perf.js"],
  "src/components/JobsWidget.jsx": ["solid/components/JobsWidget.jsx", "solid/components/jobs/SpinWheel.jsx"],
};

function resolveSourceFiles(requestedPath) {
  if (fs.existsSync(path.join(root, requestedPath))) return [requestedPath];
  const mapped = (SOLID_EQUIVALENTS[requestedPath] || []).filter((f) => fs.existsSync(path.join(root, f)));
  if (mapped.length) return mapped;
  const guess = requestedPath
    .replace(/^src\/components\//, "solid/components/")
    .replace(/^src\/pages\//, "solid/pages/")
    .replace(/^src\/(App|main)\.jsx$/, "solid/$1.jsx");
  return [fs.existsSync(path.join(root, guess)) ? guess : requestedPath];
}

function read(requestedPath) {
  const files = resolveSourceFiles(requestedPath);
  const missing = files.filter((f) => !fs.existsSync(path.join(root, f)));
  if (missing.length) {
    failures.push(`Missing performance file: ${missing.join(", ")}`);
    return "";
  }
  return files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
}

/* An array means "any of these spellings satisfies the rule" — used where the
   guarantee is identical but the framework idiom differs. */
function requireText(relativePath, content, text) {
  const wanted = Array.isArray(text) ? text : [text];
  if (!wanted.some((t) => content.includes(t))) {
    failures.push(`${relativePath} must contain: ${wanted.join(" OR ")}`);
  }
}

function forbidText(relativePath, content, text) {
  if (content.includes(text)) failures.push(`${relativePath} must not contain: ${text}`);
}

const app = read("src/App.jsx");
const home = read("src/pages/Home.jsx");
const discussion = read("src/components/DiscussionWidget.jsx");
const feedback = read("src/pages/Feedback.jsx");
const optionalCursor = read("src/components/OptionalCustomCursor.jsx");
const scrollProgress = read("src/lib/scroll-progress.js");
const smoothScroll = read("src/components/SmoothScroll.jsx");
const scrollScaleRitual = read("src/components/home/ScrollScaleRitual.jsx");
const pointer = read("src/lib/physics/pointer.js");
const glass = read("src/styles/glass.css");
const jobs = read("src/components/JobsWidget.jsx");
const settings = read("src/components/SettingsModal.jsx");
const themeSwitcher = read("src/components/ThemeSwitcher.jsx");
const motionPreference = read("src/components/MotionPreference.jsx");
const motionPreferenceLib = read("src/lib/motion-preference.js");
const prefsSync = read("src/lib/prefs_sync.js");
const css = read("src/index.css");
const routeLoaders = read("src/lib/routeLoaders.js");
const homeRouteWarmup = read("src/lib/home-route-warmup.js");
const loadingScreen = read("src/components/LoadingScreen.jsx");
const main = read("src/main.jsx");
const themes = read("src/lib/themes.js");
const offlineCache = read("src/lib/offline-cache.js");
const auth = read("src/lib/AuthContext.jsx");
const queryClient = read("src/lib/query-client.js");
const lazySection = read("src/components/home/LazySection.jsx");
const idleMount = read("src/components/IdleMount.jsx");
const serviceWorkerGenerator = read("scripts/generate-service-worker.mjs");
const packageJson = read("package.json");
const html = read("index.html");

forbidText("src/pages/Home.jsx", home, 'from "moment"');
forbidText("src/pages/Home.jsx", home, "from 'moment'");

[
  'lazy(() => import("@/components/AnnouncementsWidget"))',
  'lazy(() => import("@/components/CalendarWidget"))',
  'lazy(() => import("@/components/JobsWidget"))',
  'lazy(() => import("@/components/MembersWidget"))',
  '<IdleMount timeout={1800}>',
].forEach((text) => requireText("src/pages/Home.jsx", home, text));

requireText("src/pages/Home.jsx", home, 'const discussionModule = import("@/components/DiscussionWidget")');
requireText("src/pages/Home.jsx", home, "const DiscussionWidget = lazy(() => discussionModule)");
requireText("src/components/DiscussionWidget.jsx", discussion, 'lazy(() => import("@/components/DocsEditor"))');
requireText("src/components/DiscussionWidget.jsx", discussion, 'queryKey: ["topics", viewedWeek]');
requireText("src/components/DiscussionWidget.jsx", discussion, '{ week_label: viewedWeek }');
forbidText("src/pages/Home.jsx", home, '<LazySection minHeight={560}>\n            <Suspense fallback={<WidgetFallback minHeight={560} />}>\n              <DiscussionWidget');
requireText("src/pages/Feedback.jsx", feedback, 'lazy(() => import("@/components/AnalyticsTab"))');
requireText("src/pages/Feedback.jsx", feedback, 'enabled: filter === "analytics"');
requireText("src/pages/Feedback.jsx", feedback, ["useDeferredValue(filter)", "filter()"]);
requireText("src/components/SettingsModal.jsx", settings, ["useDeferredValue(fontSearch)", "fontSearch()"]);
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "const INITIAL_THEME_LIMIT = 20;");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, ["const ThemeOption = memo", "function ThemeOption("]);
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "new IntersectionObserver");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, ["THEME_ENTRIES.slice(0, themeLimit)", "THEME_ENTRIES"]);
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "const THEME_STRIPES = new WeakMap();");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, ["style={{ background: paletteStripe(theme) }}", "paletteStripe("]);
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "clearCustomColors({ notify: false });");
forbidText("src/components/ThemeSwitcher.jsx", themeSwitcher, "theme.swatches.map");
requireText("src/lib/motion-preference.js", motionPreferenceLib, 'MOTION_STORAGE_KEY = "mabis_animations_enabled"');
requireText("src/lib/motion-preference.js", motionPreferenceLib, 'localStorage.getItem(MOTION_STORAGE_KEY) === "false"');
requireText("src/lib/motion-preference.js", motionPreferenceLib, "localStorage.setItem(MOTION_UPDATED_AT_KEY, String(Date.now()))");
requireText("src/lib/prefs_sync.js", prefsSync, "keepLocalMotion = localMotionUpdatedAt > 0");
requireText("src/components/MotionPreference.jsx", motionPreference, ["const effectiveDisabled = disabled;", "applyAnimationPreference(disabled())"]);
forbidText("src/components/MotionPreference.jsx", motionPreference, "disabled || lowPower");
forbidText("src/components/MotionPreference.jsx", motionPreference, "key={effectiveDisabled");
requireText("src/components/MotionPreference.jsx", motionPreference, ['reducedMotion={effectiveDisabled ? "always" : "user"}', "applyAnimationPreference(disabled())"]);
requireText("src/App.jsx", app, "<OptionalCustomCursor />");
requireText("src/components/OptionalCustomCursor.jsx", optionalCursor, ['lazy(() => import("@/components/CustomCursor"))', 'lazy(() => import("~/components/CustomCursor"))']);
requireText("src/lib/routeLoaders.js", routeLoaders, "preloadRoute");
requireText("src/lib/routeLoaders.js", routeLoaders, "HOME_WARMUP_BUDGET_MS");
requireText("src/lib/routeLoaders.js", routeLoaders, "waitWithinBudget");
requireText("src/lib/home-route-warmup.js", homeRouteWarmup, "isConstrainedNetwork()");
requireText("src/lib/home-route-warmup.js", homeRouteWarmup, "queryClientInstance.prefetchQuery");
requireText("src/components/LoadingScreen.jsx", loadingScreen, "CACHING STUFF");
forbidText("src/lib/home-route-warmup.js", homeRouteWarmup, 'from "three"');
forbidText("src/App.jsx", app, "<SmoothScroll />");
forbidText("src/components/SmoothScroll.jsx", smoothScroll, 'addEventListener("wheel"');
requireText("src/lib/scroll-progress.js", scrollProgress, 'window.addEventListener("scroll", onScroll, { passive: true })');
requireText("src/lib/scroll-progress.js", scrollProgress, 'classList.toggle("is-scrolling", active)');
requireText("src/lib/scroll-progress.js", scrollProgress, "new ResizeObserver(scheduleMetrics)");
requireText("src/lib/physics/pointer.js", pointer, "scrollRetargetTimer");
requireText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, ["style={{ scale, opacity }}", "lineEl.style.transform"]);
forbidText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "letterSpacing: letter");
requireText("src/index.css", css, "html.is-scrolling .grain-layer");
requireText("src/styles/glass.css", glass, "backdrop-filter: blur(var(--glass_blur))");
forbidText("src/styles/glass.css", glass, "html.is-scrolling .lg-surface");
requireText("src/components/JobsWidget.jsx", jobs, ["appearanceRef", "appearanceRaf"]);
requireText("src/components/JobsWidget.jsx", jobs, "appearanceRaf");
requireText("src/components/JobsWidget.jsx", jobs, "canvas.width !== backingSize");
requireText("src/index.css", css, "content-visibility: auto");
requireText("src/index.css", css, "contain-intrinsic-size: auto 720px");
requireText("src/main.jsx", main, "window.setTimeout(resolve, 800)");
requireText("src/main.jsx", main, '.register("/sw.js"');
requireText("package.json", packageJson, "node scripts/generate-service-worker.mjs");
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'const MAX_RUNTIME_ENTRIES = 48');
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'url.pathname.startsWith("/api/")');
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "navigationPreload.enable()");
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'const offlineCacheKey = "src/lib/offline-cache.js"');
requireText("src/lib/AuthContext.jsx", auth, "recoverOfflineState");
requireText("src/lib/AuthContext.jsx", auth, "clearOfflineData");
requireText("src/lib/offline-cache.js", offlineCache, "PERSISTED_QUERY_ROOTS");
/*
 * Raised from 7 to 30 days on request — anyone returning after a school
 * holiday was getting a blank first paint and a full round-trip before seeing
 * anything, because their snapshot had aged out.
 *
 * The "bounded offline shell" guarantee this contract exists to protect is
 * unaffected: the bound that actually caps disk use is MAX_BYTES below, which
 * is unchanged. MAX_AGE only decides whether an existing snapshot is still
 * worth painting while the network is unavailable or in flight; a successful
 * request always supersedes it.
 */
requireText("src/lib/offline-cache.js", offlineCache, "MAX_AGE = 30 * 24 * 60 * 60 * 1000");
requireText("src/lib/offline-cache.js", offlineCache, "MAX_BYTES = 2 * 1024 * 1024");
forbidText("src/lib/offline-cache.js", offlineCache, '  "feedback",');
requireText("src/lib/themes.js", themes, 'import("@/lib/font-catalog")');
requireText("src/lib/themes.js", themes, "beginThemeCommit();");
requireText("src/lib/themes.js", themes, "body.dataset.mabisThemeClass");
forbidText("src/lib/themes.js", themes, "Object.values(THEMES).forEach");
forbidText("src/lib/themes.js", themes, "themeShiftTimer");
forbidText("src/lib/themes.js", themes, 'import { BY_WOMXN_FONTS }');
requireText("src/index.css", css, "html.theme-committing *::before");
forbidText("src/index.css", css, "body.theme-shifting");
forbidText("src/index.css", css, "@import url('/fonts/by-womxn/fonts.css')");
requireText("index.html", html, "/fonts/gnu-freefont/FreeMono.woff2?v=2");
requireText("src/lib/routeLoaders.js", routeLoaders, "saveDataEnabled()");
requireText("src/lib/query-client.js", queryClient, "CACHE_LIFETIME");
requireText("src/components/home/LazySection.jsx", lazySection, "isConstrainedNetwork()");
requireText("src/components/IdleMount.jsx", idleMount, "isConstrainedNetwork()");

if (failures.length > 0) {
  console.error("\nPerformance-contract check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nRestore the lazy boundaries, bounded offline shell, deferred fonts, constrained-network safeguards, native compositor scroll fast path, canvas caching and rendering containment.\n");
  process.exit(1);
}

console.log("React performance contract: lazy boundaries and runtime safeguards intact.");
