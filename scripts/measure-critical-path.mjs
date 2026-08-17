/*
 * Critical-path measurement harness.
 *
 * There is no headless browser in this sandbox, so LCP/FCP/INP cannot be
 * measured here. What CAN be measured exactly, and is what those metrics are
 * mostly made of on a phone, is:
 *
 *   1. Bytes the browser must fetch before it can run the app — the entry
 *      script plus every <link rel=modulepreload> plus the render-blocking
 *      stylesheet. Reported raw and gzipped; raw drives CPU, gzip drives
 *      network.
 *
 *   2. V8 parse + compile time for that JavaScript. Node and Chrome run the
 *      same engine, so `new vm.Script(src)` does the same parse and compile
 *      work the browser does before a single line of app code executes. This
 *      is the part of boot that a slow phone pays for in full and that no
 *      amount of caching removes.
 *
 * Timings are noisy on a shared 1-vCPU box, so every compile is run
 * REPEATS times and the median and p95 are reported rather than a single
 * sample. Compare medians; treat a p95 swing alone as noise.
 *
 * Usage:  node scripts/measure-critical-path.mjs [dist-dir] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { gzipSync } from "node:zlib";

const distDir = path.resolve(process.cwd(), process.argv[2]?.startsWith("--") ? "dist" : process.argv[2] || "dist");
const asJson = process.argv.includes("--json");
const REPEATS = 7;

const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");

/* The eager set, exactly as the browser sees it: the module the document
   executes, everything the build told it to preload alongside, and the
   stylesheet that blocks the first paint. Anything reached by a dynamic
   import() is deliberately excluded — that is the whole point of it. */
function hrefs(re) {
  return [...html.matchAll(re)].map((m) => m[1]).filter((u) => u.startsWith("/assets/"));
}
const entry = hrefs(/<script[^>]+type="module"[^>]+src="([^"]+)"/g);
const preloads = hrefs(/<link[^>]+rel="modulepreload"[^>]+href="([^"]+)"/g);
const styles = hrefs(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g);

function measureFile(url) {
  const file = path.join(distDir, url.replace(/^\//, ""));
  const buf = fs.readFileSync(file);
  const row = { url, raw: buf.byteLength, gzip: gzipSync(buf, { level: 9 }).byteLength, compileMs: null };
  if (!url.endsWith(".js")) return row;

  /* An ES module cannot be handed to vm.Script, and wrapping it would change
     what V8 parses. vm.SourceTextModule does the real thing: the same parse
     and compile path, no execution. */
  const source = buf.toString("utf8");
  const samples = [];
  for (let i = 0; i < REPEATS; i++) {
    const t = process.hrtime.bigint();
    // eslint-disable-next-line no-new
    new vm.SourceTextModule(source, { identifier: `${url}#${i}` });
    samples.push(Number(process.hrtime.bigint() - t) / 1e6);
  }
  samples.sort((a, b) => a - b);
  row.compileMs = samples[(samples.length - 1) >> 1];
  row.compileP95Ms = samples[Math.min(samples.length - 1, Math.ceil(samples.length * 0.95) - 1)];
  return row;
}

const rows = [...entry, ...preloads, ...styles].map(measureFile);
const js = rows.filter((r) => r.url.endsWith(".js"));
const css = rows.filter((r) => r.url.endsWith(".css"));

const total = {
  files: rows.length,
  jsFiles: js.length,
  raw: rows.reduce((n, r) => n + r.raw, 0),
  gzip: rows.reduce((n, r) => n + r.gzip, 0),
  jsRaw: js.reduce((n, r) => n + r.raw, 0),
  jsGzip: js.reduce((n, r) => n + r.gzip, 0),
  cssRaw: css.reduce((n, r) => n + r.raw, 0),
  cssGzip: css.reduce((n, r) => n + r.gzip, 0),
  compileMs: Number(js.reduce((n, r) => n + r.compileMs, 0).toFixed(2)),
};

/* Everything the build produced, eager or not. A change that only moves bytes
   from the eager set into a lazy chunk is a real win; one that moves them out
   of the build entirely is a bigger one, and this is how to tell them apart. */
const allJs = fs.readdirSync(path.join(distDir, "assets")).filter((f) => f.endsWith(".js"));
total.bundleJsFiles = allJs.length;
total.bundleJsRaw = allJs.reduce((n, f) => n + fs.statSync(path.join(distDir, "assets", f)).size, 0);

if (asJson) {
  console.log(JSON.stringify({ total, rows }, null, 2));
} else {
  const kb = (n) => (n / 1024).toFixed(1).padStart(7);
  console.log(`\nCritical path — ${path.relative(process.cwd(), distDir)}/index.html\n`);
  console.log("     raw     gzip   compile  file");
  for (const r of rows) {
    console.log(`${kb(r.raw)}K ${kb(r.gzip)}K ${(r.compileMs === null ? "     —" : `${r.compileMs.toFixed(2)}ms`).padStart(9)}  ${r.url.replace("/assets/", "")}`);
  }
  console.log("  " + "-".repeat(60));
  console.log(`${kb(total.raw)}K ${kb(total.gzip)}K ${`${total.compileMs.toFixed(2)}ms`.padStart(9)}  TOTAL EAGER (${total.files} files, ${total.jsFiles} JS)`);
  console.log(`\n  JS  ${kb(total.jsRaw)}K raw ${kb(total.jsGzip)}K gzip   ·   CSS ${kb(total.cssRaw)}K raw ${kb(total.cssGzip)}K gzip`);
  console.log(`  Whole bundle: ${total.bundleJsFiles} JS chunks, ${kb(total.bundleJsRaw)}K raw\n`);
}
