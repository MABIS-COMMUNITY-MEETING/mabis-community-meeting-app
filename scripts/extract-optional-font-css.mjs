import fs from "node:fs";
import path from "node:path";

const sourcePath = path.resolve("src/index.css");
const outputDir = path.resolve("public/fonts/font-css");
const source = fs.readFileSync(sourcePath, "utf8");

const families = new Map([
  ["IosevkaUI", "iosevka.css"],
  ["LilexUI", "lilex.css"],
  ["GoUI", "go.css"],
  ["GoMonoUI", "go.css"],
  ["GNUFreeSansUI", "gnu-free-sans.css"],
  ["GNUFreeSerifUI", "gnu-free-serif.css"],
]);

const blocks = source.match(/@font-face\s*\{[\s\S]*?\}\s*/g) || [];
const grouped = new Map();
let nextSource = source.replace("@import url('/fonts/by-womxn/fonts.css');\n\n", "");

for (const block of blocks) {
  const match = block.match(/font-family:\s*['\"]([^'\"]+)['\"]/);
  const family = match?.[1];
  const filename = families.get(family);
  if (!filename) continue;
  const current = grouped.get(filename) || [];
  current.push(block.trim());
  grouped.set(filename, current);
  nextSource = nextSource.replace(block, "");
}

fs.mkdirSync(outputDir, { recursive: true });
for (const [filename, fontBlocks] of grouped) {
  fs.writeFileSync(path.join(outputDir, filename), `${fontBlocks.join("\n")}\n`);
}
fs.writeFileSync(sourcePath, nextSource.replace(/\n{4,}/g, "\n\n\n"));

const cataloguePath = path.resolve("public/fonts/by-womxn/fonts.css");
const catalogue = fs.readFileSync(cataloguePath, "utf8");
const catalogueBlocks = catalogue.match(/@font-face\s*\{[\s\S]*?\}/g) || [];
const individualDir = path.resolve("public/fonts/by-womxn/individual");
fs.mkdirSync(individualDir, { recursive: true });
const perFamily = new Map();

for (const block of catalogueBlocks) {
  const match = block.match(/font-family:\s*['\"]([^'\"]+)['\"]/);
  if (!match) continue;
  const family = match[1];
  const rewritten = block.replace(/url\((['\"]?)([^)'\"]+)\1\)/g, (_all, quote, url) => {
    if (/^(?:data:|https?:|\/)/.test(url)) return `url(${quote}${url}${quote})`;
    return `url(${quote}../${url}${quote})`;
  });
  const current = perFamily.get(family) || [];
  current.push(rewritten);
  perFamily.set(family, current);
}

for (const [family, fontBlocks] of perFamily) {
  const safe = family.replace(/[^a-zA-Z0-9_-]/g, "-");
  fs.writeFileSync(path.join(individualDir, `${safe}.css`), `${fontBlocks.join("\n")}\n`);
}

console.log(`Optional font CSS: ${grouped.size} files; catalogue split into ${perFamily.size} family files.`);
