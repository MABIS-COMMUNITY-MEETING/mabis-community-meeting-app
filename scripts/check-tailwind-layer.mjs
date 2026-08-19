/**
 * Assert Tailwind actually emitted a utility layer.
 *
 * WHY THIS EXISTS
 *
 * `@import "tailwindcss"` had drifted 267 lines down src/index.css, below the
 * @font-face block. A CSS @import is only honoured before every rule other
 * than @charset and @layer, so it was discarded and Tailwind injected nothing:
 * the shipped stylesheet had no .flex, no .grid, no .p-4, no .bg-card. Every
 * element styled by a utility class rendered with no background, no spacing
 * and no layout.
 *
 * Nothing failed. Vite exited 0, the bundle-budget check passed (a smaller
 * stylesheet looks like a win), and the parity suite lost one assertion out of
 * 77. The only visible signal was the app looking wrong in a browser.
 *
 * A second, independent way to lose the same layer: tailwind.config.js used
 * `module.exports` while package.json declares "type": "module", so @config
 * threw on load and every custom token (bg-card, the role hues, the radius
 * scale) silently vanished while the built-in utilities stayed.
 *
 * This checks the output rather than either cause, so any future way of
 * breaking it is caught too.
 *
 * Run: node scripts/check-tailwind-layer.mjs [dist-dir]
 */
import fs from "node:fs";
import path from "node:path";

const distDir = path.resolve(process.cwd(), process.argv[2] || "dist");
const assetsDir = path.join(distDir, "assets");

if (!fs.existsSync(assetsDir)) {
  console.error("Tailwind layer: dist/assets is missing. Run Vite first.");
  process.exit(1);
}

const cssFiles = fs.readdirSync(assetsDir).filter((f) => f.endsWith(".css"));
if (cssFiles.length === 0) {
  console.error("Tailwind layer: no stylesheet in the build.");
  process.exit(1);
}
const css = cssFiles.map((f) => fs.readFileSync(path.join(assetsDir, f), "utf8")).join("\n");

/*
 * Utilities are emitted into grouped selectors (`.bg-card,.bg-card\/10{...}`),
 * so match the class as a whole token followed by a grouping or opening brace
 * rather than assuming it sits alone.
 */
function emitted(utility) {
  const escaped = utility.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`\\.${escaped}(\\\\/[0-9]+)?\\s*[,{]`).test(css);
}

/* Split so a failure says which half broke: the layout utilities come from
   Tailwind itself, the themed ones only exist if @config loaded. */
const CORE = ["flex", "grid", "hidden", "relative", "absolute", "p-4", "w-full", "items-center", "text-sm", "font-bold"];
const THEMED = ["bg-card", "bg-background", "text-foreground", "text-muted-foreground", "border-border", "bg-primary", "rounded-lg", "rounded-2xl"];

const missingCore = CORE.filter((u) => !emitted(u));
const missingThemed = THEMED.filter((u) => !emitted(u));
const failures = [];

if (missingCore.length) {
  failures.push(
    `Tailwind emitted no utility layer — missing: ${missingCore.join(", ")}.\n`
    + `    Almost always means \`@import "tailwindcss"\` in src/index.css is no longer the\n`
    + `    first rule in the file. A CSS @import below any other rule is discarded.`
  );
}
if (missingThemed.length) {
  failures.push(
    `The themed utilities from tailwind.config.js are missing: ${missingThemed.join(", ")}.\n`
    + `    Means @config failed to load the config. Check that tailwind.config.js is a\n`
    + `    valid ES module — package.json declares "type": "module", so \`module.exports\`\n`
    + `    and \`require()\` throw there.`
  );
}

/*
 * A floor, not a budget. Healthy builds land around 175 KiB; the broken one was
 * 85 KiB. This is deliberately far below healthy so ordinary CSS cleanup does
 * not trip it — it only catches the layer disappearing wholesale.
 */
const FLOOR_BYTES = 120 * 1024;
const bytes = Buffer.byteLength(css);
if (bytes < FLOOR_BYTES) {
  failures.push(
    `The stylesheet is ${(bytes / 1024).toFixed(1)} KiB, below the ${FLOOR_BYTES / 1024} KiB floor.\n`
    + `    A healthy build is ~175 KiB. A sudden halving means a whole layer stopped\n`
    + `    being generated rather than that something got smaller.`
  );
}

if (failures.length > 0) {
  console.error("\nTailwind layer check failed:\n");
  failures.forEach((f) => console.error(`  - ${f}\n`));
  process.exit(1);
}

console.log(
  `\nTailwind layer: ${(bytes / 1024).toFixed(1)} KiB, `
  + `${CORE.length} core and ${THEMED.length} themed utilities all present.\n`
);
