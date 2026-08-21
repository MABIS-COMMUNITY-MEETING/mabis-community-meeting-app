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
 * performance file" before Vite runs — the performance guarantees would look
 * violated when all that changed is which framework renders them.
 *
 * Solid groups some of this differently (the job wheel's canvas work is its own
 * component; LazySection's network guard lives in lib/perf.js), so a mapped
 * entry may list several files whose contents are concatenated.
 */
const SOLID_EQUIVALENTS = {
  "src/lib/routeLoaders.js": ["solid/lib/routes.js"],
  "src/lib/home-route-warmup.js": ["solid/lib/home-warmup.js"],
  "src/lib/query-client.js": ["solid/lib/query-client.js"],
  "src/components/home/LazySection.jsx": ["solid/components/home/LazySection.jsx", "solid/lib/perf.js"],
  // The React AuthContext went with the React UI; Solid has its own carrying
  // the same offline-recovery guarantees this rule protects.
  "src/lib/AuthContext.jsx": ["solid/lib/AuthContext.jsx"],
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

/* Optional source: absent is fine. Used for a rule about code that may not
   exist in this build at all (SmoothScroll is dead React code, never ported). */
function readIfPresent(requestedPath) {
  const files = resolveSourceFiles(requestedPath).filter((f) => fs.existsSync(path.join(root, f)));
  return files.map((f) => fs.readFileSync(path.join(root, f), "utf8")).join("\n");
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
const smoothScroll = readIfPresent("src/components/SmoothScroll.jsx") + readIfPresent("solid/lib/perf.js");
const chrome = read("solid/components/chrome.jsx");
const motionCss = read("solid/solid-motion.css");
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
const inputNavigation = read("solid/components/InputNavigation.jsx");
const spatialNavigation = read("solid/lib/input-navigation.js");
const docsEditorSolid = read("solid/components/DocsEditor.jsx");
const quillSetup = read("solid/lib/quill-setup.js");
const meetingMinutes = read("solid/components/MeetingMinutes.jsx");
const discussionDocumentEditor = read("solid/components/discussion/DiscussionDocumentEditor.jsx");
const platformProfile = read("src/lib/platform-profile.js");
const performanceTier = read("src/lib/performance-tier.js");
/*
 * The SHIPPED entry, not the root one.
 *
 * vite.config.js sets `root: solid/`, so solid/index.html is what Vite builds
 * and what dist/index.html is generated from. The root index.html is a React
 * leftover — it still points at /src/main.jsx, which no longer exists — and
 * this rule had been validating that dead file rather than the served one.
 */
const html = read("solid/index.html");

forbidText("src/pages/Home.jsx", home, 'from "moment"');
forbidText("src/pages/Home.jsx", home, "from 'moment'");

/* Each widget stays in its own chunk. React aliases src as "@", Solid as "~";
   the rule is the code split, not the alias. */
["AnnouncementsWidget", "CalendarWidget", "JobsWidget", "MembersWidget"].forEach((name) =>
  requireText("src/pages/Home.jsx", home, [
    `lazy(() => import("@/components/${name}"))`,
    `lazy(() => import("~/components/${name}"))`,
  ]));
requireText("src/pages/Home.jsx", home, "<IdleMount timeout={1800}>");

requireText("src/pages/Home.jsx", home, ['const discussionModule = import("@/components/DiscussionWidget")', 'lazy(() => import("~/components/DiscussionWidget"))']);
requireText("src/pages/Home.jsx", home, ["const DiscussionWidget = lazy(() => discussionModule)", 'const DiscussionWidget = lazy(() => import("~/components/DiscussionWidget"))']);
requireText("src/components/DiscussionWidget.jsx", discussion, "DiscussionDocumentEditor");
requireText("solid/components/discussion/DiscussionDocumentEditor.jsx", discussionDocumentEditor, 'lazy(() => import("~/components/DocsEditor"))');
requireText("src/components/DiscussionWidget.jsx", discussion, ['queryKey: ["topics", viewedWeek]', 'queryKey: ["topics", viewedWeek()]']);
requireText("src/components/DiscussionWidget.jsx", discussion, ['{ week_label: viewedWeek }', '{ week_label: viewedWeek() }']);
forbidText("src/pages/Home.jsx", home, '<LazySection minHeight={560}>\n            <Suspense fallback={<WidgetFallback minHeight={560} />}>\n              <DiscussionWidget');
requireText("src/pages/Feedback.jsx", feedback, ['lazy(() => import("@/components/AnalyticsTab"))', 'lazy(() => import("~/components/AnalyticsTab"))']);
requireText("src/pages/Feedback.jsx", feedback, ['enabled: filter === "analytics"', 'enabled: filter() === "analytics"']);
requireText("src/pages/Feedback.jsx", feedback, ["useDeferredValue(filter)", "filter()"]);
requireText("src/components/SettingsModal.jsx", settings, ["useDeferredValue(fontSearch)", "fontSearch()"]);
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "const INITIAL_THEME_LIMIT = 20;");
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, ["const ThemeOption = memo", "function ThemeOption("]);
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, "new IntersectionObserver");
/* The catalogue must stay progressively mounted — 20 at a time, never the
   whole set at once. The list being sliced gained a search filter in front of
   it (140 themes made the tail unreachable without one); what matters is that
   a slice still bounds what is mounted, not which array it slices. */
requireText("src/components/ThemeSwitcher.jsx", themeSwitcher, [
  "THEME_ENTRIES.slice(0, themeLimit)",
  "THEME_ENTRIES.slice(0, themeLimit())",
  "matchingThemes().slice(0, themeLimit())",
]);
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
requireText("src/lib/home-route-warmup.js", homeRouteWarmup, "return Promise.allSettled");
requireText("src/lib/routeLoaders.js", routeLoaders, "if (moduleWarmup) await moduleWarmup");
requireText("src/components/LoadingScreen.jsx", loadingScreen, "CACHING STUFF");
requireText("src/components/LoadingScreen.jsx", loadingScreen, "lockBodyScroll()");
requireText("src/components/LoadingScreen.jsx", loadingScreen, "overscroll-none touch-none");
forbidText("src/lib/home-route-warmup.js", homeRouteWarmup, 'from "three"');
forbidText("src/App.jsx", app, "<SmoothScroll />");
forbidText("scroll implementation", smoothScroll, 'addEventListener("wheel"');
/*
 * Scrolling is the browser's, and only one thing may listen to it.
 *
 * src/lib/scroll-progress.js used to own a passive scroll listener, a rAF
 * publisher and a ResizeObserver, feeding a progress bar, a section counter,
 * a marquee band and the glass optical response. All of that was removed: the
 * page now scrolls natively and nothing redraws itself in response.
 *
 * What must survive is the opposite of decoration — installScrollStateClass()
 * toggles html.is-scrolling, which solid-motion.css uses to drop
 * backdrop-filter, hide the grain layer and pause infinite animations for the
 * duration of a gesture. That is what keeps a native scroll at frame rate on
 * an integrated GPU, so it is required, and required in the shell rather than
 * in one page.
 */
requireText("src/App.jsx", app, "installScrollStateClass()");
requireText("scroll implementation", smoothScroll, 'classList.add("is-scrolling")');
forbidText("solid/components/chrome.jsx", chrome, "subscribeScrollProgress");
requireText("src/lib/physics/pointer.js", pointer, "scrollRetargetTimer");
/* Static. It used to measure its own rect on every scroll event and drive a
   spring through the shared physics scheduler to write transform and opacity
   per frame; a line that resizes because the page moved is the clearest signal
   that the site, not the browser, is doing the scrolling. */
forbidText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, 'addEventListener("scroll"');
forbidText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "lineEl.style.transform");
forbidText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "letterSpacing: letter");
/* A cache-first worker that never skips waiting serves the previous build to
   every open tab until all of them close. That turned into shipped fixes that
   users could not see, so both halves of the handover are pinned: the worker
   takes over, and the page reloads once when it does. */
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "self.skipWaiting();");
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "await self.clients.claim();");
requireText("src/main.jsx", main, 'navigator.serviceWorker.addEventListener("controllerchange"');

requireText("src/index.css", css, "html.is-scrolling .grain-layer");
requireText("src/styles/glass.css", glass, "backdrop-filter: blur(var(--glass_blur))");
forbidText("src/styles/glass.css", glass, "html.is-scrolling .lg-surface");

/*
 * .lg-surface must never declare containment.
 *
 * It is the wrapper every glass panel renders its content into, including the
 * site header. `contain: paint` clips descendants to the padding box and makes
 * the element a containing block for fixed descendants, so any menu opened
 * from a glass panel silently vanishes — present in the DOM, correct in every
 * computed style, invisible on screen. That shipped once; the file carried a
 * comment warning against it at the time, so a comment is not enough.
 *
 * Containment on ::before / ::after is fine and deliberately still allowed:
 * pseudo-elements cannot have children.
 */
const surfaceStart = glass.indexOf(".lg-surface {");
/* Comments are stripped first: the rule carries a prose warning that names the
   very declaration being forbidden, and matching that would fail the build for
   documenting the rule. */
const surfaceBody = surfaceStart === -1
  ? ""
  : glass.slice(surfaceStart, glass.indexOf("}", surfaceStart)).replace(/\/\*[\s\S]*?\*\//g, "");
if (surfaceStart === -1) {
  failures.push("src/styles/glass.css: .lg-surface rule not found — the containment guard below cannot run");
} else if (/contain\s*:/.test(surfaceBody)) {
  failures.push("src/styles/glass.css: .lg-surface must not declare `contain` — it clips every dropdown rendered inside a glass panel (move it to ::before/::after)");
}
requireText("src/components/JobsWidget.jsx", jobs, ["appearanceRef", "appearanceRaf"]);
requireText("src/components/JobsWidget.jsx", jobs, "appearanceRaf");
requireText("src/components/JobsWidget.jsx", jobs, "canvas.width !== backingSize");
/*
 * content-visibility is allowed, but ONLY gated on cv-ready.
 *
 * solid-motion.css skips a section once `.cv-ready` says its entrance has
 * played. That gate is what makes it safe: a section the browser has rendered
 * at least once has a real measured height for `contain-intrinsic-size: auto`
 * to remember, so skipping it again on the way past costs no layout shift.
 *
 * index.css also carried `main [data-gp-section] { content-visibility: auto;
 * contain-intrinsic-size: auto 720px }`, ungated. Its 720px was dead on arrival
 * — both section components set contain-intrinsic-size inline, per section, and
 * an inline style always wins — but its content-visibility applied before first
 * render, which defeated the gate. Sections were skipped with nothing measured
 * to remember, so each one jumped from its estimate to its true height as it
 * revealed and the scroll position moved under the reader; it also discarded
 * the entrance animation, the exact bug the gate was introduced to fix.
 *
 * So: required in solid-motion.css behind cv-ready, forbidden ungated in
 * index.css.
 */
requireText("solid/solid-motion.css", motionCss, ".cv-section.cv-ready");
/* Declarations only. index.css documents this removal at length and names the
   property while doing so; prose about why it is gone is not a regression. */
forbidText("src/index.css", css.replace(/\/\*[\s\S]*?\*\//g, ""), "content-visibility: auto");
requireText("src/components/home/LazySection.jsx", lazySection, "contain-intrinsic-size");
requireText("src/main.jsx", main, "window.setTimeout(resolve, 800)");
requireText("src/main.jsx", main, '.register("/sw.js"');
requireText("package.json", packageJson, "node scripts/generate-service-worker.mjs");
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'const MAX_RUNTIME_ENTRIES = 48');
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'url.pathname.startsWith("/api/")');
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "navigationPreload.enable()");
/* The rule is that the offline data module is precached by name, not the exact
   literal — the Solid build roots Vite at solid/, so the same file appears in
   the manifest as "../src/lib/offline-cache.js". */
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "src/lib/offline-cache.js");
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
/* Preload the first-paint subsets. Preloading the full pan-Unicode faces put
   287 KiB of font-display:block ahead of first paint; see the header of
   scripts/build-font-subsets.py. check-font-subset.mjs guards the rest. */
/*
 * The boot splash must stay in the entry HTML.
 *
 * #root ships empty and LoadingScreen is a Solid component, so without this
 * markup the page is a flat #11131a rectangle from first paint until the
 * stylesheet, the entry chunks and bootstrap()'s font wait have all finished —
 * seconds on a cold cache, and long enough that the custom cursor appears over
 * a blank screen. Deleting it would not fail any build or change any test:
 * the app still works, it just looks broken while it loads. Hence the pin.
 *
 * The hide rule is pinned separately because losing only that leaves the
 * splash covering the app forever, which is the worse failure of the two.
 */
requireText("solid/index.html", html, 'id="boot-splash"');
requireText("solid/index.html", html, "#root:not(:empty) + #boot-splash");
requireText("solid/index.html", html, 'id="mabis-theme-prepaint"');
requireText("solid/index.html", html, 'localStorage.getItem("mabis-theme-snapshot-v1")');
requireText("solid/index.html", html, 'root.setAttribute("style", snapshot.style)');
requireText("solid/index.html", html, "background: hsl(var(--background");
requireText("solid/index.html", html, "color: hsl(var(--foreground");
requireText("solid/index.html", html, "background: hsl(var(--primary");
requireText("package.json", packageJson, '"check:theme-prepaint": "node scripts/check-theme-prepaint.mjs"');
requireText("src/components/LoadingScreen.jsx", loadingScreen, "bg-background text-foreground");
requireText("src/index.css", css, "hsl(var(--secondary) / 0.1)");

/* Global arrows and hidden controller navigation share one geometric engine,
   but text editors retain their native arrow/caret behavior. */
requireText("src/App.jsx", app, "<InputNavigation />");
requireText("solid/components/InputNavigation.jsx", inputNavigation, "isEditingTarget(event.target)");
requireText("solid/components/InputNavigation.jsx", inputNavigation, "navigator.getGamepads");
requireText("solid/lib/input-navigation.js", spatialNavigation, "findDirectionalTarget");
requireText("solid/lib/input-navigation.js", spatialNavigation, "gamecube|0079");

/* Home and Meeting Mode intentionally render the exact same MeetingMinutes
   and DocsEditor path. Its nested lazy + idle boundaries keep Quill out of the
   first-paint work while preventing the two document experiences from drifting. */
requireText("solid/components/DocsEditor.jsx", docsEditorSolid, "sanitizePastedHtml(html)");
requireText("solid/components/DocsEditor.jsx", docsEditorSolid, "props.stickyTop");
requireText("src/index.css", css, ".docs-toolbar {\n  position: sticky;");
requireText("solid/components/DocsEditor.jsx", docsEditorSolid, "readableInkForHex(hex)");
requireText("solid/components/DocsEditor.jsx", docsEditorSolid, 'toggleList("bullet")');
requireText("solid/lib/quill-setup.js", quillSetup, "ql-user-paint");
requireText("solid/components/MeetingMinutes.jsx", meetingMinutes, 'lazy(() => import("~/components/DocsEditor"))');
requireText("solid/components/MeetingMinutes.jsx", meetingMinutes, "<IdleMount timeout={1200}>");
requireText("solid/components/MeetingMinutes.jsx", meetingMinutes, "stickyTop={props.stickyTop}");
requireText("src/components/DiscussionWidget.jsx", discussion, 'stickyTop="0px"');
const meetingMinutesUses = discussion.match(/<MeetingMinutes\b/g)?.length || 0;
if (meetingMinutesUses !== 2) {
  failures.push("src/components/DiscussionWidget.jsx must use MeetingMinutes once in Home and once in Meeting Mode");
}
forbidText("src/components/DiscussionWidget.jsx", discussion, "MeetingNotesEditor");
requireText("package.json", packageJson, '"check:input-editor": "node scripts/check-input-editor.mjs"');

/* Linux gets the complete visual tier, with only browser-exposed scheduling
   and compositor hints—never pretend access to kernel/Vulkan APIs. */
requireText("src/main.jsx", main, "applyPlatformProfile();");
requireText("src/lib/platform-profile.js", platformProfile, "platform-linux");
requireText("src/lib/performance-tier.js", performanceTier, "if (isLinuxPlatform()) return false;");
requireText("src/lib/performance-tier.js", performanceTier, "if (isLinuxPlatform()) return () => {};");

requireText("solid/index.html", html, "/fonts/gnu-freefont/FreeMono-subset.woff2?v=3");
requireText("solid/index.html", html, "/fonts/gnu-freefont/FreeMonoBold-subset.woff2?v=3");
forbidText("solid/index.html", html, "/fonts/gnu-freefont/FreeMono.woff2");
requireText("src/lib/routeLoaders.js", routeLoaders, "saveDataEnabled()");
requireText("src/lib/query-client.js", queryClient, "CACHE_LIFETIME");
requireText("src/components/home/LazySection.jsx", lazySection, "isConstrainedNetwork()");
requireText("src/components/IdleMount.jsx", idleMount, "isConstrainedNetwork()");

/*
 * Auth must not serialise ahead of Home's chunk downloads.
 *
 * Two separate guarantees, both easy to undo by accident:
 *
 *   1. The session probe is ISSUED before the app-state response is awaited.
 *      Re-inlining `await base44.auth.me()` into the call below restores the
 *      old two-round-trip stall, and nothing about the app looks broken — it
 *      is just slower on every cold load.
 *
 *   2. The chunk warm-up is started from onMount, NOT the component body.
 *      The body runs during render, which is before AuthProvider's own
 *      onMount, so a dozen chunk requests would go out ahead of the auth
 *      calls they exist to overlap — turning an optimisation into a delay.
 */
const appShell = read("src/App.jsx");
requireText("src/lib/AuthContext.jsx", auth, "const session = base44.auth.me();");
requireText("src/lib/AuthContext.jsx", auth, "session });");
requireText("src/App.jsx", appShell, "onMount(() => { void startHomeModuleWarmup(); });");
requireText("src/lib/routeLoaders.js", routeLoaders, "warmHomeModules");

if (failures.length > 0) {
  console.error("\nPerformance-contract check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nRestore the lazy boundaries, bounded offline shell, deferred fonts, constrained-network safeguards, native compositor scroll fast path, canvas caching and rendering containment.\n");
  process.exit(1);
}

console.log("React performance contract: lazy boundaries and runtime safeguards intact.");
