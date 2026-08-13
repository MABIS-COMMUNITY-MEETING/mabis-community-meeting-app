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
const networkPolicy = read("src/lib/network-policy.js");
const serviceWorker = read("src/lib/service-worker.js");
const serviceWorkerGenerator = read("scripts/generate-service-worker.mjs");
const indexHtml = read("index.html");
const packageJson = read("package.json");
const queryClient = read("src/lib/query-client.js");
const sound = read("src/lib/sound.js");

forbidText("src/pages/Home.jsx", home, 'from "moment"');
forbidText("src/pages/Home.jsx", home, "from 'moment'");

[
  'lazy(() => import("@/components/AnnouncementsWidget"))',
  'lazy(() => import("@/components/DiscussionWidget"))',
  'lazy(() => import("@/components/CalendarWidget"))',
  'lazy(() => import("@/components/JobsWidget"))',
  'lazy(() => import("@/components/MembersWidget"))',
  '<IdleMount timeout={1800} constrainedTimeout={12000}>',
  '<OnDemandTools />',
].forEach((text) => requireText("src/pages/Home.jsx", home, text));

requireText("src/components/DiscussionWidget.jsx", discussion, 'lazy(() => import("@/components/DocsEditor"))');
requireText("src/pages/Feedback.jsx", feedback, 'lazy(() => import("@/components/AnalyticsTab"))');
requireText("src/pages/Feedback.jsx", feedback, 'enabled: filter === "analytics"');
requireText("src/pages/Feedback.jsx", feedback, "useDeferredValue(filter)");
requireText("src/components/SettingsModal.jsx", settings, "useDeferredValue(fontSearch)");
requireText("src/App.jsx", app, "<OptionalCustomCursor />");
requireText("src/components/OptionalCustomCursor.jsx", optionalCursor, 'lazy(() => import("@/components/CustomCursor"))');
requireText("src/lib/routeLoaders.js", routeLoaders, "preloadRoute");
requireText("src/lib/routeLoaders.js", routeLoaders, "allowSpeculativeFetch()");
requireText("src/lib/network-policy.js", networkPolicy, 'connection?.saveData === true');
requireText("src/lib/network-policy.js", networkPolicy, 'effectiveType === "slow-2g"');
requireText("src/lib/network-policy.js", networkPolicy, 'root.classList.toggle("network-lite"');
requireText("src/lib/service-worker.js", serviceWorker, 'navigator.serviceWorker.register("/sw.js"');
requireText("scripts/generate-service-worker.mjs", serviceWorkerGenerator, '/(?:api|auth|functions|integrations|entities)');
requireText("package.json", packageJson, "node scripts/generate-service-worker.mjs");
requireText("src/lib/query-client.js", queryClient, "networkMode: 'offlineFirst'");
requireText("src/lib/query-client.js", queryClient, "gcTime: 2 * 60 * 60 * 1000");
requireText("index.html", indexHtml, "/fonts/gnu-freefont/FreeMono-Core.woff2?v=3");
forbidText("index.html", indexHtml, "FreeMono.ttf");
forbidText("index.html", indexHtml, "FreeMonoBold.ttf");
forbidText("src/index.css", css, "@import url('/fonts/by-womxn/fonts.css')");
forbidText("src/lib/sound.js", sound, "media.base44.com");
requireText("src/lib/scroll-progress.js", scrollProgress, 'window.addEventListener("scroll", schedule, { passive: true })');
requireText("src/components/JobsWidget.jsx", jobs, "appearanceRef");
requireText("src/components/JobsWidget.jsx", jobs, "canvas.width !== backingSize");
requireText("src/index.css", css, "content-visibility: auto");
requireText("src/index.css", css, "contain-intrinsic-size: auto 720px");

if (failures.length > 0) {
  console.error("\nPerformance-contract check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nRestore the lazy boundaries, data-saver policy, on-demand resources, safe cache generation, shared scroll signal, canvas caching and rendering containment.\n");
  process.exit(1);
}

console.log("React performance contract: network adaptation, lazy boundaries and runtime safeguards intact.");
