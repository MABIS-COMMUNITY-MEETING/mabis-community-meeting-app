/**
 * Which of the render-blocking stylesheet does first paint actually need?
 *
 * The stylesheet is the largest single asset on the critical path, and the
 * obvious idea — "split it" — is worthless without knowing WHAT to split. A
 * guess here is expensive: CSS deferred that turns out to be needed produces a
 * flash of unstyled content, which is worse than the bytes it saved.
 *
 * So this measures instead. It boots the real built bundle in jsdom exactly as
 * check-solid-parity.mjs does — same seeded session, same dead XHR, same
 * stubs — waits for the route to settle, and reads the class names that
 * actually reached the DOM. Every rule in the built stylesheet is then sorted
 * into one of four buckets:
 *
 *   NEEDED    a selector matches the rendered DOM, or it is structural
 *             (html, :root, *, @font-face) and cannot be proven unnecessary.
 *   LAZY      no match now, but its class names appear in code-split chunks
 *             that first paint does not load. This is the interesting bucket:
 *             the CSS can travel WITH the chunk that renders the markup, the
 *             way DocsEditor's stylesheet already does, which is safe by
 *             construction because the styles and the elements arrive
 *             together.
 *   EAGER     no match now, but its class names appear in a chunk that first
 *             paint DOES load. Deferring these risks a flash, because the code
 *             that applies them is already running.
 *   ORPHAN    the class names appear in no chunk at all. Either dead, or
 *             composed at runtime from string fragments.
 *
 * The heuristic is deliberately conservative in the direction of keeping CSS:
 * a rule counts as needed if ANY of its comma-separated selectors could match,
 * and selectors carrying no class token at all are always kept.
 *
 * This measures a moment, not a lifetime. A rule in LAZY is not dead — it is
 * "not needed until the chunk that uses it loads". Read it as a defer
 * shortlist, never as a delete list.
 *
 * Run: node scripts/measure-css-coverage.mjs [route] [flags...]
 *      node scripts/measure-css-coverage.mjs /home
 *      node scripts/measure-css-coverage.mjs /home boss
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";
import zlib from "node:zlib";

const dist = path.join(process.cwd(), process.env.DIST_DIR || "dist");
const route = process.argv[2] || "/home";
const flags = process.argv.slice(3);
const assets = path.join(dist, "assets");

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const cssFiles = fs.readdirSync(assets).filter((f) => f.endsWith(".css"));
const jsFiles = fs.readdirSync(assets).filter((f) => f.endsWith(".js"));

/* The eager set is whatever the entry HTML pulls in itself: the entry script
   plus every modulepreload. Anything else arrives only when something imports
   it, which is the distinction this whole measurement turns on. */
const eagerNames = new Set(
  [...html.matchAll(/(?:href|src)="[^"]*\/assets\/([^"]+\.js)"/g)].map((m) => m[1])
);

/* The render-blocking sheet is the one the entry HTML links. Chunk stylesheets
   (DocsEditor's) are already split and are not the subject here. */
const blockingCss = [...html.matchAll(/href="[^"]*\/assets\/([^"]+\.css)"/g)].map((m) => m[1]);
const target = blockingCss[0] || cssFiles[0];
const css = fs.readFileSync(path.join(assets, target), "utf8");

/* ── Boot the app, exactly as the parity harness does ─────────────────────── */

const dom = new JSDOM(html, { url: `http://localhost${route}`, pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;

window.matchMedia = (q) => ({
  matches: /hover: hover|pointer: fine/.test(q) && !/reduce/.test(q),
  media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});
if (!window.requestIdleCallback) window.requestIdleCallback = (fn) => setTimeout(fn, 0);

if (flags.includes("ja")) window.localStorage.setItem("mabis-japanese-text-enabled", "true");
if (flags.includes("boss")) window.localStorage.setItem("mabis-home-layout", "boss");

if (route.startsWith("/home")) {
  const token = "parity-token";
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  window.localStorage.setItem("base44_access_token", token);
  window.localStorage.setItem("mabis-offline-user-v1", JSON.stringify({
    user: { id: "coverage-user", full_name: "Coverage Tester", email: "coverage@example.com", role: "admin" },
    marker: (hash >>> 0).toString(36),
    savedAt: Date.now(),
  }));
}

const noopFetch = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(""), json: () => Promise.resolve({}) });
window.fetch = noopFetch;
globalThis.fetch = noopFetch;

class DeadXHR {
  open() {}
  setRequestHeader() {}
  abort() {}
  addEventListener(type, cb) { if (type === "error") this._onerror = cb; }
  removeEventListener() {}
  getAllResponseHeaders() { return ""; }
  send() { setTimeout(() => { this.status = 0; this.readyState = 4; this.onerror?.(new Error("offline")); this._onerror?.(new Error("offline")); this.onreadystatechange?.(); }, 0); }
}
window.XMLHttpRequest = DeadXHR;
globalThis.XMLHttpRequest = DeadXHR;

for (const k of ["window", "document", "navigator", "localStorage", "sessionStorage", "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "getComputedStyle", "CustomEvent", "Event", "MutationObserver", "IntersectionObserver", "PerformanceObserver", "location", "history"]) {
  if (window[k] !== undefined) globalThis[k] = window[k];
}
for (const k of Object.getOwnPropertyNames(window)) {
  if (/^[A-Z]/.test(k) && globalThis[k] === undefined) {
    try { globalThis[k] = window[k]; } catch { /* getter-only */ }
  }
}
Object.defineProperty(window, "performance", { value: globalThis.performance, configurable: true });
globalThis.self = window;

const entry = jsFiles.find((f) => /^index-.*\.js$/.test(f));
const watchdog = setTimeout(() => { console.error("Timed out waiting for the app to settle."); process.exit(1); }, 40000);
watchdog.unref?.();

try {
  await import(pathToFileURL(path.join(assets, entry)).href);
  await new Promise((r) => setTimeout(r, 2500));
} catch (e) {
  console.error("Bundle threw during mount:", String(e).slice(0, 300));
  process.exit(1);
}

const root = window.document.getElementById("root");
if (!root || root.children.length === 0) {
  console.error(`Nothing rendered at ${route}. Coverage would be meaningless.`);
  process.exit(1);
}

/* ── What reached the DOM ─────────────────────────────────────────────────── */

const domClasses = new Set();
for (const el of window.document.querySelectorAll("*")) {
  for (const c of el.classList) domClasses.add(c);
}

/* ── Split the stylesheet into rules, keeping at-rule nesting ─────────────── */

/* A real CSS parser is not needed and not wanted here: the only facts required
   per rule are its selector text and its byte cost. Brace matching gives both,
   survives @layer/@supports/oklch/nesting that a naive parser would reject,
   and cannot silently drop a rule it fails to understand. */
function rules(text, out = []) {
  let i = 0;
  while (i < text.length) {
    const open = text.indexOf("{", i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === "{") depth++;
      else if (text[j] === "}") depth--;
      j++;
    }
    const prelude = text.slice(i, open).trim();
    const body = text.slice(open + 1, j - 1);
    const bytes = j - i;
    if (/^@(media|supports|layer|container|scope)/i.test(prelude)) {
      rules(body, out);                      // conditional group: recurse
    } else if (prelude.startsWith("@")) {
      out.push({ selector: prelude, bytes, atRule: true });
    } else if (prelude) {
      out.push({ selector: prelude, bytes, atRule: false });
    }
    i = j;
  }
  return out;
}

const parsed = rules(css);

/* Tailwind escapes selectors — .md\:flex, .w-1\/2, .bg-\[\#abc\]. Strip the
   backslashes to recover the class name the DOM would actually carry. */
const classesIn = (selector) =>
  [...selector.matchAll(/\.((?:[\w-]|\\.)+)/g)].map((m) => m[1].replace(/\\/g, ""));

const jsSource = new Map();
for (const f of jsFiles) jsSource.set(f, fs.readFileSync(path.join(assets, f), "utf8"));

const chunkCache = new Map();
function chunksMentioning(cls) {
  if (chunkCache.has(cls)) return chunkCache.get(cls);
  const hits = [];
  for (const [name, src] of jsSource) if (src.includes(cls)) hits.push(name);
  chunkCache.set(cls, hits);
  return hits;
}

const bucket = { NEEDED: [], THEMED: [], LAZY: [], EAGER: [], ORPHAN: [] };

for (const rule of parsed) {
  if (rule.atRule) { bucket.NEEDED.push(rule); continue; }

  /* Theme-conditional rules are their own problem and must not be counted as
   * deferrable. The class lands on <body> from the entry JS, so for a visitor
   * whose stored theme is this one the rule IS first-paint critical even
   * though it matches nothing in a default render. Deferring it would flash
   * that visitor's whole page. Splitting per theme is possible but needs the
   * choice known before the sheet is requested, which is another round trip —
   * bad on 2G, which is a hard requirement here. */
  if (/\.theme-/.test(rule.selector)) { bucket.THEMED.push(rule); continue; }

  const alternatives = rule.selector.split(",").map((s) => s.trim()).filter(Boolean);
  let matches = false;
  const allClasses = new Set();

  for (const alt of alternatives) {
    const cls = classesIn(alt);
    /* No class token at all: html, :root, *, body > div, [data-x]. Cannot be
       shown unnecessary from a class list, so it stays. */
    if (cls.length === 0) { matches = true; break; }
    cls.forEach((c) => allClasses.add(c));
    if (cls.every((c) => domClasses.has(c))) { matches = true; break; }
  }

  if (matches) { bucket.NEEDED.push(rule); continue; }

  const mentions = [...allClasses].flatMap(chunksMentioning);
  if (mentions.length === 0) bucket.ORPHAN.push(rule);
  else if (mentions.some((m) => eagerNames.has(m))) bucket.EAGER.push(rule);
  else bucket.LAZY.push(rule);
}

/* ── Report ───────────────────────────────────────────────────────────────── */

const sum = (list) => list.reduce((a, r) => a + r.bytes, 0);
const total = css.length;
const gz = (n) => (n / total) * (zlib.gzipSync(css, { level: 9 }).length / 1024);
const kib = (n) => (n / 1024).toFixed(1).padStart(7);

console.log(`\nCSS coverage — ${target} at ${route}${flags.length ? ` +${flags.join(" ")}` : ""}`);
console.log(`Rendered ${window.document.querySelectorAll("*").length} elements carrying ${domClasses.size} distinct classes.\n`);
console.log("      raw   ~gzip    rules  bucket");
for (const name of ["NEEDED", "THEMED", "LAZY", "EAGER", "ORPHAN"]) {
  const b = sum(bucket[name]);
  console.log(`${kib(b)}K ${gz(b).toFixed(1).padStart(6)}K ${String(bucket[name].length).padStart(8)}  ${name}`);
}
console.log(`${kib(total)}K ${gz(total).toFixed(1).padStart(6)}K ${String(parsed.length).padStart(8)}  TOTAL`);

/* Which chunks the deferrable rules belong to. This is the actionable output:
   a chunk with a large share here is one whose CSS should travel with it. */
const byChunk = new Map();
for (const r of bucket.LAZY) {
  const cls = new Set(r.selector.split(",").flatMap((alt) => classesIn(alt)));
  const owners = new Set([...cls].flatMap(chunksMentioning));
  for (const o of owners) byChunk.set(o, (byChunk.get(o) || 0) + r.bytes / owners.size);
}
console.log(`\nDeferrable CSS attributed to the chunk that would carry it:`);
for (const [name, bytes] of [...byChunk].sort((a, b) => b[1] - a[1]).slice(0, 18)) {
  console.log(`  ${(bytes / 1024).toFixed(1).padStart(6)}K  ${name}`);
}

console.log(`\nLargest deferrable rules (LAZY — CSS that can travel with its chunk):`);
for (const r of [...bucket.LAZY].sort((a, b) => b.bytes - a.bytes).slice(0, 20)) {
  console.log(`  ${String(r.bytes).padStart(6)}  ${r.selector.replace(/\s+/g, " ").slice(0, 100)}`);
}

console.log(`\nLargest ORPHAN rules (in no chunk — dead, or composed at runtime):`);
for (const r of [...bucket.ORPHAN].sort((a, b) => b.bytes - a.bytes).slice(0, 15)) {
  console.log(`  ${String(r.bytes).padStart(6)}  ${r.selector.replace(/\s+/g, " ").slice(0, 100)}`);
}

console.log("\nGzip figures are the rule bytes' share of the whole sheet's compressed size,");
console.log("not a real recompression: split out separately they will compress somewhat worse.\n");
process.exit(0);
