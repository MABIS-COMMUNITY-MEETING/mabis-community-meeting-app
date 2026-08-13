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

forbidText("src/pages/Home.jsx", home, 'from "moment"');
forbidText("src/pages/Home.jsx", home, "from 'moment'");

[
  'lazy(() => import("@/components/AnnouncementsWidget"))',
  'lazy(() => import("@/components/DiscussionWidget"))',
  'lazy(() => import("@/components/CalendarWidget"))',
  'lazy(() => import("@/components/JobsWidget"))',
  'lazy(() => import("@/components/MembersWidget"))',
  '<IdleMount timeout={1800}>',
].forEach((text) => requireText("src/pages/Home.jsx", home, text));

requireText("src/components/DiscussionWidget.jsx", discussion, 'lazy(() => import("@/components/DocsEditor"))');
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

if (failures.length > 0) {
  console.error("\nPerformance-contract check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nRestore the lazy boundaries, idle mounting, shared scroll signal, canvas caching and rendering containment.\n");
  process.exit(1);
}

console.log("React performance contract: lazy boundaries and runtime safeguards intact.");
