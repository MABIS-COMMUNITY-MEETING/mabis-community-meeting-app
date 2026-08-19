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

/*
 * What counts as "glass CSS on the critical path".
 *
 * Not merely a selector mentioning `.lg-`. index.css legitimately carries a
 * handful of cross-cutting overrides that reach into glass from outside it —
 * `body.theme-frutigeraero .lg-surface`, `html.performance-lite .lg-surface`,
 * and an `html.is-scrolling` rule that also targets `.mabis-widget`, which the
 * DEFAULT layout uses. Those belong to the theme, the performance tier and the
 * scroll state, not to the glass component, and they are ~1.1 KiB in total.
 * Demanding their removal would either break the shared scroll rule or force
 * an artificial split of three unrelated systems.
 *
 * What must not be here is the component's own definitions: a rule whose
 * LEFTMOST compound selector is a glass class. That is the 8 KiB that only the
 * boss layout can ever match, and the leftmost test separates it cleanly from
 * a descendant override without needing a real CSS parser.
 */
function ownDefinitions(css) {
  const found = [];
  let i = 0;
  while (i < css.length) {
    const open = css.indexOf("{", i);
    if (open === -1) break;
    let depth = 1;
    let j = open + 1;
    while (j < css.length && depth > 0) {
      if (css[j] === "{") depth++;
      else if (css[j] === "}") depth--;
      j++;
    }
    const prelude = css.slice(i, open).trim();
    if (!prelude.startsWith("@")) {
      for (const alt of prelude.split(",")) {
        if (/^\.lg-[\w-]+/.test(alt.trim())) { found.push(alt.trim().slice(0, 80)); break; }
      }
    }
    i = j;
  }
  return found;
}

const blockingOwn = ownDefinitions(blockingCss);
check("the glass component's own rules are absent from the render-blocking stylesheet",
  blockingOwn.length === 0,
  blockingOwn.length ? `${blockingOwn.length} found, e.g. ${blockingOwn.slice(0, 3).join(" / ")}` : "");

const chunkOwn = ownDefinitions(chunkCss);
check("the glass rules still ship in a chunk stylesheet",
  chunkOwn.length > 20,
  `only ${chunkOwn.length} found — glass.css may be in no stylesheet at all, which would render the boss layout unstyled`);

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
