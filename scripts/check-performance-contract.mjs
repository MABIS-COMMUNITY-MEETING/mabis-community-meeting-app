import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function read(relativePath) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    failures.push(`Missing performance file: ${relativePath}`);
    return "";
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function requireText(relativePath, content, text) {
  if (!content.includes(text)) failures.push(`${relativePath} must contain: ${text}`);
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
const jobs = read("src/components/JobsWidget.jsx");
const settings = read("src/components/SettingsModal.jsx");
const css = read("src/index.css");
const routeLoaders = read("src/lib/routeLoaders.js");
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
requireText("src/pages/Feedback.jsx", feedback, "useDeferredValue(filter)");
requireText("src/components/SettingsModal.jsx", settings, "useDeferredValue(fontSearch)");
requireText("src/App.jsx", app, "<OptionalCustomCursor />");
requireText("src/components/OptionalCustomCursor.jsx", optionalCursor, 'lazy(() => import("@/components/CustomCursor"))');
requireText("src/lib/routeLoaders.js", routeLoaders, "preloadRoute");
requireText("src/lib/scroll-progress.js", scrollProgress, 'window.addEventListener("scroll", schedule, { passive: true })');
requireText("src/components/JobsWidget.jsx", jobs, "appearanceRef");
requireText("src/components/JobsWidget.jsx", jobs, "canvas.width !== backingSize");
requireText("src/index.css", css, "content-visibility: auto");
requireText("src/index.css", css, "contain-intrinsic-size: auto 720px");
requireText("src/main.jsx", main, '.register("/sw.js"');
requireText("package.json", packageJson, "node scripts/generate-service-worker.mjs");
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'const MAX_RUNTIME_ENTRIES = 48');
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'url.pathname.startsWith("/api/")');
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, "navigationPreload.enable()");
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, 'const offlineCacheKey = "src/lib/offline-cache.js"');
requireText("src/lib/AuthContext.jsx", auth, "recoverOfflineState");
requireText("src/lib/AuthContext.jsx", auth, "clearOfflineData");
requireText("src/lib/offline-cache.js", offlineCache, "PERSISTED_QUERY_ROOTS");
requireText("src/lib/offline-cache.js", offlineCache, "MAX_AGE = 7 * 24 * 60 * 60 * 1000");
requireText("src/lib/offline-cache.js", offlineCache, "MAX_BYTES = 2 * 1024 * 1024");
forbidText("src/lib/offline-cache.js", offlineCache, '  "feedback",');
requireText("src/lib/themes.js", themes, 'import("@/lib/font-catalog")');
forbidText("src/lib/themes.js", themes, 'import { BY_WOMXN_FONTS }');
forbidText("src/index.css", css, "@import url('/fonts/by-womxn/fonts.css')");
requireText("index.html", html, "/fonts/gnu-freefont/FreeMono.woff2?v=2");
requireText("src/lib/routeLoaders.js", routeLoaders, "saveDataEnabled()");
requireText("src/lib/query-client.js", queryClient, "CACHE_LIFETIME");
requireText("src/components/home/LazySection.jsx", lazySection, "isConstrainedNetwork()");
requireText("src/components/IdleMount.jsx", idleMount, "isConstrainedNetwork()");

if (failures.length > 0) {
  console.error("\nPerformance-contract check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nRestore the lazy boundaries, bounded offline shell, deferred fonts, constrained-network safeguards, shared scroll signal, canvas caching and rendering containment.\n");
  process.exit(1);
}

console.log("React performance contract: lazy boundaries and runtime safeguards intact.");
