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
  "/fonts/gnu-freefont/FreeMono.woff2?v=2",
  "/fonts/gnu-freefont/FreeMonoBold.woff2?v=2",
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

/* The boss chunk plus everything it pulls in, static and dynamic, minus
   anything the shared precache already holds — storing a file twice would be
   pure waste. Dynamic imports are followed here (unlike for the shared
   precache, which stops at one level) because the interludes are small, and a
   reader on this layout wants the whole thing offline, not most of it. */
function addBossEntry(key, visited = new Set()) {
  if (visited.has(key)) return;
  visited.add(key);
  const item = manifest[key];
  if (!item?.file) throw new Error(`Boss-layout manifest entry missing: ${key}`);
  if (!precache.has(`/${item.file}`)) bossPrecache.add(`/${item.file}`);
  for (const file of item.css || []) {
    if (!precache.has(`/${file}`)) bossPrecache.add(`/${file}`);
  }
  for (const importedKey of [...(item.imports || []), ...(item.dynamicImports || [])]) {
    addBossEntry(importedKey, visited);
  }
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
for (const key of bossKeys) addBossEntry(key);

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

async function staticAsset(request) {
  const cached = await caches.match(request, { ignoreSearch: true });
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok && response.type === "basic") {
    const runtime = await caches.open(RUNTIME_CACHE);
    await runtime.put(request, response.clone());
    await trim(runtime, MAX_RUNTIME_ENTRIES);
  }
  return response;
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

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

fs.writeFileSync(path.join(dist, "sw.js"), serviceWorker);
const bytes = [...precache].reduce((total, url) => {
  const relative = url.replace(/^\//, "").split("?")[0];
  return total + fs.statSync(path.join(dist, relative)).size;
}, 0);
console.log(
  `Offline shell generated: ${precache.size} files, ${(bytes / 1024).toFixed(1)} KiB uncompressed, revision ${version}.`,
);
