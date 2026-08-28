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
const appErrorBoundary = read("solid/components/AppErrorBoundary.jsx");
const home = read("src/pages/Home.jsx");
const discussion = read("src/components/DiscussionWidget.jsx");
const feedback = read("src/pages/Feedback.jsx");
const optionalCursor = read("src/components/OptionalCustomCursor.jsx");
const smoothScroll = readIfPresent("src/components/SmoothScroll.jsx") + readIfPresent("solid/lib/perf.js");
const chrome = read("solid/components/chrome.jsx");
const motionCss = read("solid/solid-motion.css");
const editorialShell = read("solid/components/home/shell.jsx");
const scrollScaleRitual = read("src/components/home/ScrollScaleRitual.jsx");
const pointer = read("src/lib/physics/pointer.js");
const physicsScheduler = read("src/lib/physics/scheduler.js");
const selectSolid = read("solid/components/ui/select.jsx");
const glass = read("src/styles/glass.css");
const glassPointer = read("src/lib/glass_pointer.js");
const glassComponentSolid = read("solid/components/Glass.jsx");
const siteHeaderSolid = read("solid/components/SiteHeader.jsx");
const themeSwitcherSolid = read("solid/components/ThemeSwitcher.jsx");
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
const solidPerf = read("solid/lib/perf.js");
const perfMonitor = read("solid/lib/perf-monitor.js");
const membersWidgetSolid = read("solid/components/MembersWidget.jsx");
const membersQuerySolid = read("solid/lib/members-query.js");
const presenceSolid = read("solid/lib/usePresence.js");
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
requireText("src/pages/Home.jsx", home, "export function preloadBossHome()");
requireText("src/pages/Home.jsx", home, "const BossHome = lazy(preloadBossHome);");
requireText("src/lib/routeLoaders.js", routeLoaders, 'homeLayout() === "boss"');
requireText("src/lib/routeLoaders.js", routeLoaders, "preloadBossHome");
requireText("src/lib/routeLoaders.js", routeLoaders, "HOME_WARMUP_BUDGET_MS");
requireText("src/lib/routeLoaders.js", routeLoaders, "waitWithinBudget");
requireText("src/lib/home-route-warmup.js", homeRouteWarmup, "isConstrainedNetwork()");
requireText("src/lib/home-route-warmup.js", homeRouteWarmup, "queryClientInstance.prefetchQuery");

/* Members must reach a useful paint without one monolithic row/control mount. */
requireText("solid/lib/members-query.js", membersQuerySolid, "const MEMBER_FIELDS = [");
requireText("solid/lib/members-query.js", membersQuerySolid, 'Member.list("name", 200, undefined, MEMBER_FIELDS)');
requireText("src/pages/Home.jsx", home, "queryFn: listMembers");
requireText("src/lib/home-route-warmup.js", homeRouteWarmup, "prefetch(MEMBER_QUERY_KEY, listMembers)");
requireText("solid/components/MembersWidget.jsx", membersWidgetSolid, "Array.isArray(props.members)");
forbidText("solid/components/MembersWidget.jsx", membersWidgetSolid, "base44.entities.Member.list");
requireText("solid/components/MembersWidget.jsx", membersWidgetSolid, "FIRST_MEMBER_ROWS = 24");
requireText("solid/components/MembersWidget.jsx", membersWidgetSolid, "afterNextPaint(append)");
requireText("solid/components/MembersWidget.jsx", membersWidgetSolid, "useActivePresence(presenceReady)");
requireText("solid/lib/usePresence.js", presenceSolid, "enabled: isEnabled()");
requireText("solid/lib/usePresence.js", presenceSolid, "if (!isEnabled()) return;");
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
requireText("scroll implementation", smoothScroll, "lastScrollAt");
requireText("scroll implementation", smoothScroll, "settleAfterInactivity");
forbidText("scroll implementation", smoothScroll, "clearTimeout(idleTimer);\n    idleTimer = setTimeout(settle, 140);");
forbidText("solid/components/chrome.jsx", chrome, "subscribeScrollProgress");
requireText("src/lib/physics/pointer.js", pointer, "scrollRetargetTimer");
requireText("src/lib/physics/pointer.js", pointer, "latestNode = e.target");
forbidText("src/lib/physics/pointer.js", pointer, "latestEl = cursorTargetAt(e.target)");
requireText("src/lib/physics/pointer.js", pointer, "if (pointer.inside) return;");
requireText("src/lib/physics/scheduler.js", physicsScheduler, "const primed = new WeakSet()");
requireText("src/lib/physics/scheduler.js", physicsScheduler, "const activeSubs = []");
requireText("src/lib/physics/scheduler.js", physicsScheduler, "const runAll = firstWakeFrame");
requireText("src/lib/physics/scheduler.js", physicsScheduler, "firstWakeFrame = true");
requireText("src/lib/physics/scheduler.js", physicsScheduler, "if (runAll || initial || !s.settled || !s.settled())");
requireText("src/lib/physics/scheduler.js", physicsScheduler, "for (const s of activeSubs) s.step(FIXED_DT)");
requireText("src/lib/physics/scheduler.js", physicsScheduler, "for (const s of activeSubs) {\n    s.render(alpha);");
requireText("src/lib/physics/pointer.js", pointer, 'const LITE_SELECTOR = "[data-cursor-lite]"');
requireText("solid/components/ui/select.jsx", selectSolid, "createMemo(() => normalise(local.options))");
requireText("solid/components/ui/select.jsx", selectSolid, "data-cursor-lite");
requireText("src/components/JobsWidget.jsx", jobs, "data-cursor-lite");
requireText("src/components/JobsWidget.jsx", jobs, 'lazy(() => import("~/components/jobs/JobListStudio"))');
forbidText("src/components/JobsWidget.jsx", jobs, 'import JobListStudio from "~/components/jobs/JobListStudio"');
const cursorMaterialStart = css.indexOf(".cursor-dot, .cursor-ring");
const cursorMaterialEnd = css.indexOf(".cursor-label", cursorMaterialStart);
const cursorMaterial = cursorMaterialStart === -1 || cursorMaterialEnd === -1
  ? ""
  : css.slice(cursorMaterialStart, cursorMaterialEnd);
if (!cursorMaterial) {
  failures.push("src/index.css: custom cursor material rules are missing");
} else if (/backdrop-filter|mix-blend-mode/.test(cursorMaterial)) {
  failures.push("src/index.css: moving cursor dot/ring must not use live backdrop blur or blend-mode compositing");
}
/* Voice Your Words deliberately follows scroll again, but the event handler
   only marks one sample stale and wakes the shared fixed-timestep scheduler.
   Geometry is read in the scheduler's sample phase and transform/opacity are
   written together in render, preserving read-before-write frame ordering. */
requireText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, 'addEventListener("scroll", markForMeasure, { passive: true })');
requireText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "sample: () =>");
requireText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "wake();");
requireText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "settled: () => !needsMeasure");
forbidText("src/components/home/ScrollScaleRitual.jsx", scrollScaleRitual, "letterSpacing: letter");
/* A service-worker handoff must never replace an active meeting/document
   with the boot screen. The new worker waits until old tabs close, keeping its
   hashed chunks paired with the page that loaded them; activation may still
   claim the next normal visit. Chunk failures also require an explicit click. */
forbidText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "self.skipWaiting();");
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "await self.clients.claim();");
forbidText("src/main.jsx", main, 'navigator.serviceWorker.addEventListener("controllerchange"');
forbidText("src/main.jsx", main, "window.location.reload()");
requireText("src/App.jsx", app, "resolvedOnce");
forbidText("solid/components/AppErrorBoundary.jsx", appErrorBoundary, "claimReloadAttempt");
requireText("solid/components/AppErrorBoundary.jsx", appErrorBoundary, "onClick={() => window.location.reload()}");

requireText("src/index.css", css, "html.is-scrolling .grain-layer");
requireText("src/styles/glass.css", glass, "backdrop-filter: blur(var(--glass_blur))");
requireText("src/styles/glass.css", glass, ".liquidGlass-matte");
/* The grain is the material, so its two defining numbers are pinned the way the
   blur radius used to be: a dense, fine turbulence at full strength. Drop
   either and the surface quietly goes back to being a plain tinted panel. */
requireText("src/styles/glass.css", glass, "baseFrequency='1.5'");
requireText("src/styles/glass.css", glass, "background-blend-mode: overlay");
requireText("src/styles/glass.css", glass, "data:image/svg+xml");
/* The frost is off: the material is grain now (.liquidGlass-matte), so every
   tier sits at zero backdrop radius. saturate() and brightness() still sample
   the backdrop, which is why the property stays.

   Pinned rather than free-floating because backdrop blur is the most expensive
   thing this stylesheet does, and the last time it moved it moved everywhere.
   Editing this line is how you decide to bring frost back. */
requireText("src/styles/glass.css", glass, "--glass_blur: 0px;");
forbidText(
  "src/styles/glass.css",
  glass.replace(/\/\*[\s\S]*?\*\//g, ""),
  "--glass_blur: 9px",
);
/*
 * The lens belongs in the backdrop, never on `filter`.
 *
 * Two things ride on this. It is what makes the SVG filter refract the page
 * behind the pane rather than distort an empty span's own pixels — the effect
 * only works at all this way round. And an element carrying both `filter` and
 * `backdrop-filter` loses the backdrop entirely in Gecko, which is what made
 * the glass render fully transparent in Firefox; keeping `filter` off
 * .liquidGlass-effect is what retired that bug rather than papering over it.
 */
requireText("src/styles/glass.css", glass, "backdrop-filter: var(--glass-lens-filter");
if (/\.liquidGlass-effect\s*\{[^}]*[;\s]filter\s*:/.test(glass.replace(/\/\*[\s\S]*?\*\//g, ""))) {
  failures.push(
    "src/styles/glass.css: .liquidGlass-effect must not set `filter`. The lens goes in the "
    + "backdrop-filter list; an element with both loses its backdrop in Gecko and the glass "
    + "renders fully transparent in Firefox.",
  );
}
/* url() in a backdrop is the newest syntax here, and where it is unsupported
   the whole declaration dies — taking saturate and brightness with it and
   leaving a bare tinted box. The fallback restates them without the lens. */
if (!glass.includes('@supports not (backdrop-filter: url("#lens"))')) {
  failures.push(
    "src/styles/glass.css: the lens needs its `@supports not (backdrop-filter: url(\"#lens\"))` "
    + "fallback. Without it, any engine that cannot resolve url() in a backdrop loses saturate "
    + "and brightness too and the surface flattens to a plain tint.",
  );
}
requireText("solid/components/Glass.jsx", glassComponentSolid, [
  "liquidGlass-effect", "liquidGlass-tint", "liquidGlass-matte",
  "liquidGlass-shine", "liquidGlass-text",
]);
/* The lens graph. feImage carries the prebaked displacement ramp (feTurbulence
   is noise and cannot describe an edge), and the three feDisplacementMap passes
   at different scales are the chromatic dispersion that reads as thickness.
   Losing any of them turns the lens back into a plain blur. */
requireText("solid/components/Glass.jsx", glassComponentSolid, "<feImage");
requireText("solid/components/Glass.jsx", glassComponentSolid, 'preserveAspectRatio="none"');
if ((glassComponentSolid.match(/<feDisplacementMap/g) || []).length < 3) {
  failures.push(
    "solid/components/Glass.jsx: the lens needs three feDisplacementMap passes, one per colour "
    + "channel. Fewer than that is a plain displacement with no chromatic dispersion.",
  );
}
requireText("solid/components/Glass.jsx", glassComponentSolid, "<feDisplacementMap");
forbidText("solid/components/Glass.jsx", glassComponentSolid, "src=");
forbidText("solid/components/Glass.jsx", glassComponentSolid, "https://");
forbidText("src/styles/glass.css", glass, "https://");
forbidText("src/styles/glass.css", glass, 'url("http');
forbidText("src/styles/glass.css", glass, "html.is-scrolling .lg-surface");
/* Glass uses native CSS plus a local inline SVG filter. A document snapshot plus a WebGL canvas on every glass
   surface caused long tasks and scroll hitching, especially in the persistent
   menu. Keep the native backdrop material and prevent that renderer from being
   wired back into the component or stylesheet. */
requireText("solid/components/Glass.jsx", glassComponentSolid, "onCleanup(() => unregister?.());");
requireText("src/lib/glass_pointer.js", glassPointer, "scheduleSettle()");
requireText("src/lib/glass_pointer.js", glassPointer, 'latestTarget?.closest?.(".lg-surface")');
requireText("src/lib/glass_pointer.js", glassPointer, "if (!surface.measured || surface.el === targetSurface)");
forbidText("src/lib/glass_pointer.js", glassPointer, "clearTimeout(settleTimer);\n\tsettleTimer = setTimeout");
forbidText("solid/components/Glass.jsx", glassComponentSolid, 'import("@/lib/liquid-glass-js")');
forbidText("src/styles/glass.css", glass, ".lg-liquid-canvas");
forbidText("src/styles/glass.css", glass, ".lg-webgl-ready");
forbidText("src/styles/glass.css", glass, "--liquid-glass-overlay-opacity");
requireText("solid/components/SiteHeader.jsx", siteHeaderSolid, 'import { Portal } from "solid-js/web"');
requireText("solid/components/SiteHeader.jsx", siteHeaderSolid, '<Portal>\n      <header class="site-header-shell fixed top-0 left-0 right-0 z-50">');
requireText("solid/components/SiteHeader.jsx", siteHeaderSolid, "0.03 + i * 0.035");
requireText("solid/components/ThemeSwitcher.jsx", themeSwitcherSolid, 'import { Portal } from "solid-js/web"');
requireText("solid/components/ThemeSwitcher.jsx", themeSwitcherSolid, "z-[150]");

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
/*
 * The light tone must be built from theme tokens, not pigments.
 *
 * --ink and --bone never flip: themes.js gives --ink the darker of
 * background/foreground and --bone the lighter, in all 140 themes plus custom
 * colours and Material You. A tint made of --bone is a sheet of light paper
 * always, so on any dark scheme it painted a white bar under the header's
 * --foreground text — which is light there. The navigation was unreadable.
 *
 * --background/--foreground are the same two values on a light theme, so this
 * costs nothing there and self-corrects on every dark one, whichever theme
 * system produced it. check:themes does not catch this because it does not
 * evaluate glass surfaces.
 */
const onLightTint = glass.match(/\.lg-on-light\s*>\s*\.liquidGlass-tint\s*\{[^}]*\}/)?.[0] ?? "";
if (!onLightTint) {
  failures.push("src/styles/glass.css: .lg-on-light > .liquidGlass-tint is missing.");
} else if (/--bone|--ink/.test(onLightTint)) {
  failures.push(
    "src/styles/glass.css: .lg-on-light's tint must use --background/--foreground, not "
    + "--bone/--ink. Those two never flip between light and dark themes, so a tone=\"light\" "
    + "surface paints light paper on a dark scheme and its text becomes unreadable.",
  );
}

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
/*
 * No forwards-filling transform animation may wrap a widget.
 *
 * A CSS animation over `transform` that fills forwards leaves the element a
 * containing block for position:fixed descendants after it finishes, even when
 * the last keyframe is `transform: none`. Both wrappers between a route and a
 * widget animate transform on entry — .page-content-lift around every route and
 * .widget-rise around every LazySection child — so either one filling forwards
 * pins every fullscreen widget to that box instead of the viewport, and the
 * widget vanishes when you open it.
 *
 * .page-content-lift was already `backwards` with a note explaining why;
 * .widget-rise was `both` and had exactly the documented symptom. Neither has
 * an animation-delay worth covering, so `backwards` costs nothing.
 */
/*
 * The Boss layout's reveal wrapper must settle to `transform: none`.
 *
 * EditorialSection wraps {props.children} — the widget — in a div carrying an
 * inline reveal style. Settling that to `translateY(0)` instead of `none` looks
 * identical and behaves completely differently: any transform other than none
 * makes the element a containing block for position:fixed descendants, and this
 * one is inline and permanent, so every fullscreen widget was pinned to and
 * clipped by the wrapper instead of filling the viewport.
 *
 * Third instance of the same trap, after .page-content-lift and .widget-rise.
 */
if (/transform:\s*revealed\(\)\s*\?\s*["']translateY\(0\)["']/.test(editorialShell)) {
  failures.push(
    "solid/components/home/shell.jsx: the reveal helper must settle to `transform: \"none\"`, "
    + "not `\"translateY(0)\"` — a non-none transform makes the wrapper a containing block for "
    + "position:fixed, so fullscreen widgets are clipped to it instead of the viewport.",
  );
}

for (const rule of [".page-content-lift", ".widget-rise"]) {
  const declaration = motionCss.match(new RegExp(`\\${rule}\\s*\\{[^}]*animation:[^;}]*`));
  const value = declaration?.[0] ?? "";
  if (!/\bbackwards\b/.test(value) || /\b(both|forwards)\b/.test(value)) {
    failures.push(
      `solid/solid-motion.css: ${rule} must use animation-fill-mode \`backwards\`, not `
      + `\`both\`/\`forwards\` — a forwards-filled transform makes it a containing block for `
      + `position:fixed, which hides every fullscreen widget. Saw: ${value.trim() || "no animation"}`,
    );
  }
}
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
requireText("solid/lib/perf.js", solidPerf, "const revealCallbacks = new WeakMap();");
requireText("solid/lib/perf.js", solidPerf, 'classList.toggle("cv-onscreen", entry.isIntersecting)');
requireText("src/index.css", css, "html.platform-linux .cv-section.cv-ready:not(.cv-onscreen)");
forbidText("src/index.css", css, "transform-style: preserve-3d");
requireText("solid/lib/perf-monitor.js", perfMonitor, "softwareRendering: isSoftwareRendered()");

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
