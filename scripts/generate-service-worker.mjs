import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
// Accepts an explicit target dir so this can generate a service worker for
// either build (`node scripts/generate-service-worker.mjs dist-solid`). With
// no argument it keeps its original default so the legacy `npm run build`
// (React, vite.config.js → dist/) still works unchanged.
const distName = process.argv[2] || "dist";
const dist = path.join(root, distName);
const manifestPath = path.join(dist, ".vite", "manifest.json");

if (!fs.existsSync(manifestPath)) {
  throw new Error("Vite manifest missing; build.manifest must remain enabled.");
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const entryKey = manifest["index.html"]
  ? "index.html"
  : Object.keys(manifest).find((key) => manifest[key].isEntry);
if (!entryKey) throw new Error("Unable to find the Vite HTML entry in the build manifest.");

const precache = new Set([
  "/index.html",
  "/manifest.json",
  /* The first-paint subsets only. The matching *-rest.woff2 files carry the
     other 3600 codepoints and are deliberately left out: precaching 265 KiB of
     Georgian and Arabic coverage for an offline shell that renders English
     would cost more than the shell itself. A page that needs them fetches them
     when online, and the runtime font handler below caches them then. */
  "/fonts/gnu-freefont/FreeMono-subset.woff2?v=3",
  "/fonts/gnu-freefont/FreeMonoBold-subset.woff2?v=3",
]);

function addManifestEntry(key, visited = new Set()) {
  if (visited.has(key)) return;
  visited.add(key);
  const item = manifest[key];
  if (!item?.file) throw new Error(`Offline manifest entry missing: ${key}`);
  precache.add(`/${item.file}`);
  for (const file of item.css || []) precache.add(`/${file}`);
  for (const importedKey of item.imports || []) addManifestEntry(importedKey, visited);
}

// Widgets on Home are all `lazy(() => import(...))`, so they never show up in
// `imports` (Vite only puts *static* imports there) — they land in
// `dynamicImports` instead. Left alone, that means a first-time visitor's
// widgets are only cache-first from their *second* load: the very thing the
// query client already does for widget *data* (staleTime, no refetch-on-mount)
// was not true yet for the widget *code*. Precaching each widget's own chunk
// (plus whatever it statically imports) closes that gap.
//
// Deliberately ONE level deep: a widget's *own* further lazy imports (Settings
// modal, the AI assistant, DocsEditor/Quill inside Discussion) stay out of the
// precache. Those are lazy specifically to keep heavy, occasionally-used
// features off the critical path (see check-bundle-budget.mjs) — pulling them
// in here would undo that.
function addDirectDynamicImports(key) {
  const item = manifest[key];
  for (const importedKey of item?.dynamicImports || []) {
    if (isBossOnly(importedKey)) continue;
    addManifestEntry(importedKey);
  }
}

/*
 * The boss Home layout is one chunk, and it belongs to nobody by default.
 *
 * Home defaults to the original MABIS interface, so precaching the editorial
 * layout would download and store code the great majority of visits never
 * execute. It is emitted as a separate list instead, and the worker fetches it
 * only once the page says the boss layout is in use — dropping it again when
 * the reader switches back. See applyLayout() below.
 */
const BOSS_ONLY_CHUNKS = new Set(["boss"]);
const isBossOnly = (key) => BOSS_ONLY_CHUNKS.has(manifest[key]?.name);

const bossPrecache = new Set();

/* The boss chunk and its STATIC dependencies, minus anything the shared
   precache already holds — storing a file twice would be pure waste.

   Static only, and its direct dynamic imports are added separately below, for
   the same reason the shared precache stops at one level: walking dynamic
   imports transitively reaches DocsEditor/Quill and the other deliberately
   deferred features through shared modules, and pulls ~100 KiB of them into a
   list that is supposed to hold two small interludes. */
function addBossEntry(key, visited = new Set()) {
  if (visited.has(key)) return;
  visited.add(key);
  const item = manifest[key];
  if (!item?.file) throw new Error(`Boss-layout manifest entry missing: ${key}`);
  if (!precache.has(`/${item.file}`)) bossPrecache.add(`/${item.file}`);
  for (const file of item.css || []) {
    if (!precache.has(`/${file}`)) bossPrecache.add(`/${file}`);
  }
  for (const importedKey of item.imports || []) addBossEntry(importedKey, visited);
}

addManifestEntry(entryKey);
const homeKey = Object.keys(manifest).find((key) => manifest[key].name === "Home");
if (!homeKey) throw new Error("Home route missing from the Vite manifest.");
addManifestEntry(homeKey);
addDirectDynamicImports(homeKey);

const bossKeys = (manifest[homeKey].dynamicImports || []).filter(isBossOnly);
if (bossKeys.length !== BOSS_ONLY_CHUNKS.size) {
  throw new Error(
    `Expected ${BOSS_ONLY_CHUNKS.size} boss-layout chunk(s) in Home's dynamic imports, found ${bossKeys.length}. `
    + "If the boss layout stopped being lazily imported, the default layout is paying for it again.",
  );
}
for (const key of bossKeys) {
  addBossEntry(key);
  /* The interludes: boss-layout only, and the reader who chose this layout
     scrolls straight past them, so they belong in its offline set. */
  for (const dynamicKey of manifest[key].dynamicImports || []) addBossEntry(dynamicKey);
}

/* The Solid build roots Vite at solid/, so shared modules under src/ appear in
   the manifest as "../src/...". Accept either spelling — the module is the
   same file, only the path is relative to a different root. */
const offlineCacheKey = ["src/lib/offline-cache.js", "../src/lib/offline-cache.js"]
  .find((key) => manifest[key]);
if (!offlineCacheKey) throw new Error("Offline data module missing from the Vite manifest.");
addManifestEntry(offlineCacheKey);

const revision = crypto.createHash("sha256");
for (const url of precache) {
  const relative = url.replace(/^\//, "").split("?")[0];
  const absolute = path.join(dist, relative);
  if (!fs.existsSync(absolute)) throw new Error(`Offline shell asset missing: ${url}`);
  revision.update(url);
  revision.update(fs.readFileSync(absolute));
}
/* Hashed too, so changing a boss chunk still busts the worker — it is cached
   under the same revision, just fetched later and on demand. */
for (const url of bossPrecache) {
  const absolute = path.join(dist, url.replace(/^\//, "").split("?")[0]);
  if (!fs.existsSync(absolute)) throw new Error(`Boss-layout asset missing: ${url}`);
  revision.update(url);
  revision.update(fs.readFileSync(absolute));
}
const version = revision.digest("hex").slice(0, 12);
const urls = JSON.stringify([...precache], null, 2);
const bossUrls = JSON.stringify([...bossPrecache], null, 2);

const serviceWorker = `/* Generated by scripts/generate-service-worker.mjs. */
const CACHE_PREFIX = "mabis-offline-";
const SHELL_CACHE = CACHE_PREFIX + "shell-${version}";
const RUNTIME_CACHE = CACHE_PREFIX + "runtime-${version}";
const LAYOUT_CACHE = CACHE_PREFIX + "layout-${version}";
const PRECACHE_URLS = ${urls};
/* Assets only the boss Home layout executes. Not in the install precache: the
   default layout would pay to download and store code it never runs. */
const BOSS_LAYOUT_URLS = ${bossUrls};
const MAX_RUNTIME_ENTRIES = 48;

self.addEventListener("install", (event) => {
  /*
   * Take over immediately instead of waiting for every tab to close.
   *
   * Without this, a new build installs and then sits in "waiting" for as long
   * as ANY tab of the app is open — and because staticAsset() is cache-first,
   * the old worker keeps serving the old JS and CSS from its shell cache the
   * whole time. Even a hard reload gets the stale build. On a PWA that people
   * leave open on a phone, "as long as any tab is open" is close to forever:
   * fixes were shipping, building green, and never reaching anyone.
   *
   * The trade-off is the usual one — a page loaded from the previous build
   * may afterwards ask for a chunk this build has renamed. The client handles
   * that by reloading once on controllerchange (see solid/main.jsx), which is
   * a single refresh against a fix that otherwise never arrives.
   */
  self.skipWaiting();
  event.waitUntil(caches.open(SHELL_CACHE).then((cache) => cache.addAll(PRECACHE_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter((name) => name.startsWith(CACHE_PREFIX)
          && name !== SHELL_CACHE && name !== RUNTIME_CACHE && name !== LAYOUT_CACHE)
        .map((name) => caches.delete(name)),
    );
    if (self.registration.navigationPreload) {
      await self.registration.navigationPreload.enable();
    }
    await self.clients.claim();
  })());
});

/*
 * Cache exactly one layout's assets: whichever one the reader is using.
 *
 * The page posts this on boot and on every change, so switching to the boss
 * layout fetches its chunks into the offline shell, and switching back deletes
 * them rather than leaving a layout in storage that is no longer rendered.
 */
async function applyLayout(layout) {
  const cache = await caches.open(LAYOUT_CACHE);
  if (layout === "boss") {
    await cache.addAll(BOSS_LAYOUT_URLS);
    return;
  }
  await Promise.all(BOSS_LAYOUT_URLS.map((url) => cache.delete(url)));
}

self.addEventListener("message", (event) => {
  if (event.data?.type !== "mabis-home-layout") return;
  // Never let a cache write fail the message: an offline switch just means the
  // chunks are fetched on demand the next time the layout renders.
  event.waitUntil(applyLayout(event.data.layout).catch(() => {}));
});

async function trim(cache, limit) {
  const keys = await cache.keys();
  const overflow = keys.length - limit;
  if (overflow > 0) {
    await Promise.all(keys.slice(0, overflow).map((request) => cache.delete(request)));
  }
}

async function appShellNavigation(event) {
  const shell = await caches.open(SHELL_CACHE);
  try {
    const preloaded = await event.preloadResponse;
    if (preloaded?.ok) {
      const type = preloaded.headers.get("content-type") || "";
      if (type.includes("text/html")) await shell.put("/index.html", preloaded.clone());
      return preloaded;
    }

    const response = await fetch(event.request);
    if (response.ok && (response.headers.get("content-type") || "").includes("text/html")) {
      await shell.put("/index.html", response.clone());
    }
    return response;
  } catch {
    return (await shell.match("/index.html")) || Response.error();
  }
}

/* Prefixes, not a regex. This file is emitted from a template literal, so any
   backslash in it is an escape sequence for the GENERATOR first — a regex
   literal here silently lost its \/ and shipped a worker that would not parse.
   Plain string prefixes have nothing to escape. */
const DEV_SERVER_PREFIXES = ["/@vite/", "/@id/", "/@fs/", "/node_modules/", "/src/", "/solid/"];

async function staticAsset(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok && response.type === "basic") {
      const runtime = await caches.open(RUNTIME_CACHE);
      await runtime.put(request, response.clone());
      await trim(runtime, MAX_RUNTIME_ENTRIES);
    }
    return response;
  } catch (error) {
    /*
     * The network failed and this is not in the cache.
     *
     * This used to fall straight through as a rejected promise, and a
     * rejection inside respondWith() makes the browser fail the resource
     * OUTRIGHT — no retry, no fallback to the network it would have used
     * without a worker. For a stylesheet that reads as "the CSS randomly did
     * not load": the page renders unstyled with nothing in the console
     * pointing at the worker.
     *
     * Try the cache once more, ignoring Vary this time — a stale copy of a
     * hashed asset is always better than none. Only if that misses does the
     * error propagate, and then it is the browser's own network error rather
     * than one this worker manufactured.
     */
    const stale = await caches.match(request, { ignoreSearch: true, ignoreVary: true });
    if (stale) return stale;
    throw error;
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  /*
   * Never touch the dev server.
   *
   * A worker installed by an earlier PRODUCTION visit keeps controlling this
   * origin, and the Base44 preview serves the app from Vite's dev server on
   * that same origin. Those module URLs (/@vite/, /@fs/, /src/, HMR "?t="
   * stamps) exist in no build this worker has ever cached, so every one was a
   * guaranteed cache miss handed to a network fetch that fails the instant the
   * dev server reloads — which is constantly. The result is stylesheets and
   * chunks that intermittently do not arrive, in the preview only, with the
   * built site working perfectly.
   *
   * Returning early leaves them to the browser, which is what a worker that
   * knows nothing about them should have done from the start.
   */
  if (DEV_SERVER_PREFIXES.some((prefix) => url.pathname.startsWith(prefix)) || url.searchParams.has("t")) {
    return;
  }

  // Authenticated Base44 data is deliberately never placed in Cache Storage.
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/functions/") ||
    request.headers.has("authorization")
  ) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(appShellNavigation(event));
    return;
  }

  if (
    url.pathname.startsWith("/assets/") ||
    url.pathname.startsWith("/fonts/") ||
    ["script", "style", "font", "image"].includes(request.destination)
  ) {
    event.respondWith(staticAsset(request));
  }
});
`;

/*
 * Parse the worker before writing it.
 *
 * This file is assembled inside a template literal, so every backslash in it
 * is an escape sequence for the generator first. A regex literal here lost its
 * `\/` on the way out and produced `/^/(@vite|...)//` — not valid JavaScript.
 *
 * That failure is completely silent: the build succeeds, sw.js is written, and
 * the browser simply refuses to install the worker. Offline support and the
 * layout cache stop working and nothing anywhere says why. Parsing it here
 * turns a silent breakage into a failed build.
 */
try {
  new Function(serviceWorker);
} catch (error) {
  console.error(`Generated service worker is not valid JavaScript: ${error.message}`);
  console.error("Check for backslashes in the template literal — they are escaped twice.");
  process.exit(1);
}

fs.writeFileSync(path.join(dist, "sw.js"), serviceWorker);
const bytes = [...precache].reduce((total, url) => {
  const relative = url.replace(/^\//, "").split("?")[0];
  return total + fs.statSync(path.join(dist, relative)).size;
}, 0);
console.log(
  `Offline shell generated: ${precache.size} files, ${(bytes / 1024).toFixed(1)} KiB uncompressed, revision ${version}.`,
);
