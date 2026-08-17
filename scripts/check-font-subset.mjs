/**
 * Keep the first-paint font subset honest.
 *
 * scripts/build-font-subsets.py splits GNU FreeMono into a 30 KiB subset that
 * is preloaded and a 170 KiB remainder that is not. The split only pays off
 * while the shipped UI stays inside the subset's unicode-range: one rendered
 * character outside it and every visitor fetches the big file too, on the
 * critical path, with font-display:block holding the paint.
 *
 * That failure is silent — the text renders correctly, it just renders late —
 * so it needs a check rather than a code review. This one reads the BUILT
 * bundle, which is the only honest place to look: the source is full of Greek
 * and box-drawing characters in comments that minification strips and no user
 * ever sees, and asserting against the source would demand glyphs for
 * characters that do not ship.
 *
 * It also asserts the CSS ranges still match the manifest the subsetter wrote,
 * so editing one without re-running the other fails here instead of in
 * production.
 *
 * Run: node scripts/check-font-subset.mjs [dist-dir]
 */
import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), process.argv[2] || "dist");
const fontDir = path.resolve(process.cwd(), "public/fonts/gnu-freefont");
const cssPath = path.resolve(process.cwd(), "src/index.css");
const manifestPath = path.join(fontDir, "subset-manifest.json");

const failures = [];

if (!fs.existsSync(distDir)) {
  console.error(`Font subset check: ${path.relative(process.cwd(), distDir)} is missing. Run Vite first.`);
  process.exit(1);
}
if (!fs.existsSync(manifestPath)) {
  console.error("Font subset check: subset-manifest.json is missing. Run scripts/build-font-subsets.py.");
  process.exit(1);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
const css = fs.readFileSync(cssPath, "utf8");

// ── the generated files still exist, and are still the small ones ──────────
for (const [face, stats] of Object.entries(manifest.faces)) {
  for (const [suffix, expected] of [["subset", stats.subset_bytes], ["rest", stats.rest_bytes]]) {
    const file = path.join(fontDir, `${face}-${suffix}.woff2`);
    if (!fs.existsSync(file)) {
      failures.push(`${face}-${suffix}.woff2 is missing — re-run scripts/build-font-subsets.py`);
    } else if (fs.statSync(file).size !== expected) {
      failures.push(`${face}-${suffix}.woff2 is ${fs.statSync(file).size} bytes, manifest says ${expected} — the two are out of step`);
    }
  }
}

// ── index.css declares exactly the ranges the subsetter produced ───────────
const subsetRange = manifest.css.subset_unicode_range;
const restRange = manifest.css.rest_unicode_range;
if (!css.includes(subsetRange)) {
  failures.push("src/index.css does not contain the subset unicode-range from the manifest — re-run scripts/build-font-subsets.py and paste both ranges");
}
if (!css.includes(restRange)) {
  failures.push("src/index.css does not contain the rest unicode-range from the manifest — re-run scripts/build-font-subsets.py and paste both ranges");
}

/* Both weights, both halves, or a weight silently loses its coverage. */
for (const face of Object.keys(manifest.faces)) {
  for (const suffix of ["subset", "rest"]) {
    if (!css.includes(`${face}-${suffix}.woff2`)) {
      failures.push(`src/index.css has no @font-face for ${face}-${suffix}.woff2`);
    }
  }
}

// ── nothing in the shipped bundle escapes the subset ───────────────────────
function parseRanges(spec) {
  return spec.split(",").map((part) => {
    const [from, to] = part.trim().replace(/^U\+/i, "").split("-");
    return [parseInt(from, 16), parseInt(to ?? from, 16)];
  });
}
const ranges = parseRanges(subsetRange);
const covered = (cp) => ranges.some(([from, to]) => cp >= from && cp <= to);

/*
 * The only characters that matter are the ones the rest files actually carry.
 *
 * A character GNU FreeMono never had — ✓, ☐, ▼, and everything CJK or Thai —
 * already resolves to a later family in the stack and cannot pull the big file
 * down no matter where it appears. Checking against the subset range alone
 * flagged all of those, which would have pushed someone into adding whole
 * blocks of glyphs that do not exist.
 */
const restCoverage = manifest.rest_coverage;
const inRestFile = (cp) => restCoverage.some(([from, to]) => cp >= from && cp <= to);

const assetsDir = path.join(distDir, "assets");
const escapes = new Map();
for (const name of fs.readdirSync(assetsDir)) {
  if (!/\.(js|css)$/.test(name)) continue;
  const text = fs.readFileSync(path.join(assetsDir, name), "utf8");
  for (const ch of text) {
    const cp = ch.codePointAt(0);
    if (cp < 0x100 || covered(cp) || !inRestFile(cp)) continue;
    if (!escapes.has(cp)) escapes.set(cp, name);
  }
}

if (escapes.size > 0) {
  const listed = [...escapes.entries()]
    .sort((a, b) => a[0] - b[0])
    .slice(0, 12)
    .map(([cp, file]) => `U+${cp.toString(16).toUpperCase().padStart(4, "0")} ${String.fromCodePoint(cp)} (${file})`);
  failures.push(
    `${escapes.size} codepoint(s) in the built bundle fall outside the preloaded subset, so every visitor `
    + `would also fetch FreeMono-rest.woff2 (170 KiB) on the critical path:\n      ${listed.join("\n      ")}`
    + `\n    Fix by either replacing the character with one in the subset, or adding its block to `
    + `CRITICAL_RANGES in scripts/build-font-subsets.py and re-running it.`
  );
}

if (failures.length > 0) {
  console.error("\nFont subset check failed:\n");
  failures.forEach((failure) => console.error(`  - ${failure}`));
  console.error("");
  process.exit(1);
}

const preloaded = Object.values(manifest.faces).reduce((n, f) => n + f.subset_bytes, 0);
const original = Object.values(manifest.faces).reduce((n, f) => n + f.source_bytes, 0);
console.log(
  `\nFont subset: ${(preloaded / 1024).toFixed(1)} KiB preloaded instead of ${(original / 1024).toFixed(1)} KiB `
  + `(${(100 * (1 - preloaded / original)).toFixed(0)}% less), and nothing in the bundle needs the remainder.\n`
);
