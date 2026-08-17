/**
 * Boss-layout CSS must not be on the critical path.
 *
 * glass.css styles the `.lg-*` surfaces. Glass is rendered only by SiteHeader,
 * SiteHeader is imported only by boss.jsx, and boss.jsx is a lazy chunk — so
 * for everyone on the default Home layout these rules cannot match a single
 * element, yet they were linked from the entry HTML and blocked first paint
 * for every visitor.
 *
 * This is a silent class of regression, which is why it is pinned. Moving the
 * import back into solid/main.jsx (or into any module the entry reaches
 * eagerly) would put the bytes back on the critical path, and nothing else
 * would notice: the build stays green, the page looks identical, the bundle
 * budget passes because the budget watches JS. The only visible symptom is a
 * slower first paint on the connections least able to absorb it.
 *
 * The inverse failure matters just as much. If the rules end up in NO
 * stylesheet the boss layout renders unstyled, so this asserts both halves:
 * absent from the blocking sheet, present in a chunk sheet.
 *
 * Run: node scripts/check-css-split.mjs [distDir]
 */
import fs from "node:fs";
import path from "node:path";

const dist = path.join(process.cwd(), process.argv[2] || "dist");
const assets = path.join(dist, "assets");

const failures = [];
let count = 0;
function check(name, condition, detail = "") {
  count += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

if (!fs.existsSync(assets)) {
  console.error(`No build found at ${dist}. Build first.`);
  process.exit(1);
}

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const cssFiles = fs.readdirSync(assets).filter((f) => f.endsWith(".css"));

/* Render-blocking means "linked from the entry HTML". A chunk stylesheet is
   injected at runtime by Vite's preload helper and blocks only its own
   dynamic import, which is the whole point. */
const blocking = [...html.matchAll(/href="[^"]*\/assets\/([^"]+\.css)"/g)].map((m) => m[1]);
check("the entry HTML links exactly one stylesheet", blocking.length === 1, `links ${blocking.length}`);

const blockingCss = blocking.map((f) => fs.readFileSync(path.join(assets, f), "utf8")).join("\n");
const chunkCss = cssFiles
  .filter((f) => !blocking.includes(f))
  .map((f) => fs.readFileSync(path.join(assets, f), "utf8"))
  .join("\n");

/* Selectors unique to the glass system. `.lg-surface` is the plane itself and
   the variants are the thickness scale — if any of these are in the blocking
   sheet the import has drifted back to an eager module. */
const GLASS_SELECTORS = [".lg-surface", ".lg-navigation", ".lg-thick", ".lg-scroll-edge"];

for (const selector of GLASS_SELECTORS) {
  check(`${selector} is absent from the render-blocking stylesheet`,
    !blockingCss.includes(selector),
    "glass.css is being imported from a module the entry reaches eagerly");
}

check("the glass rules still ship in a chunk stylesheet",
  GLASS_SELECTORS.every((s) => chunkCss.includes(s)),
  "glass.css is in no stylesheet at all — the boss layout would render unstyled");

/* The import belongs with the component that owns the classes, not scattered.
   Checking the source too means a future refactor that keeps the bytes off the
   critical path by some other means still has to be deliberate about it. */
const glassComponent = fs.readFileSync(path.join(process.cwd(), "solid/components/Glass.jsx"), "utf8");
check("Glass.jsx imports its own stylesheet",
  /import\s+["']@\/styles\/glass\.css["']/.test(glassComponent));

const entry = fs.readFileSync(path.join(process.cwd(), "solid/main.jsx"), "utf8");
check("the entry does not import glass.css",
  !/import\s+["']@\/styles\/glass\.css["']/.test(entry));

if (failures.length) {
  console.error(`\nCSS split: ${count - failures.length}/${count} checks passed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}

const blockingBytes = Buffer.byteLength(blockingCss);
const chunkBytes = Buffer.byteLength(chunkCss);
console.log(`\nCSS split: ${count}/${count} checks passed`);
console.log(`\nRender-blocking ${(blockingBytes / 1024).toFixed(1)} KiB; ${(chunkBytes / 1024).toFixed(1)} KiB deferred into chunk stylesheets that only the routes needing them fetch.\n`);
