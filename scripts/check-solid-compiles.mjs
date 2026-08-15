/**
 * Compile every file under solid/, including ones nothing imports yet.
 *
 * Why this exists: `vite build` only compiles modules reachable from the entry.
 * A freshly ported component that no page imports yet is tree-shaken away, so
 * the build goes green while the file has never been parsed at all. DocsEditor
 * was ported with a syntax error and reported BUILD:0 twice before this check
 * caught it.
 *
 * Run: node scripts/check-solid-compiles.mjs
 */
import { build } from "vite";
import solid from "vite-plugin-solid";
import fs from "node:fs";
import path from "node:path";

const root = path.resolve("solid");

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) out.push(...walk(full));
    else if (/\.(jsx?|tsx?)$/.test(name)) out.push(full);
  }
  return out;
}

const files = walk(root).filter((f) => !f.endsWith("__compilecheck.jsx"));
const failures = [];

for (const file of files) {
  try {
    await build({
      configFile: false,
      logLevel: "silent",
      plugins: [solid()],
      resolve: { alias: { "@": path.resolve("src"), "~": root } },
      build: {
        write: false,
        minify: false,
        lib: { entry: file, formats: ["es"], fileName: "cc" },
        rollupOptions: {
          external: [
            /^solid-js/, /^quill/, /^lucide-solid/, /^@tanstack/,
            /^@solidjs/, /^@base44/, /^date-fns/, /\.css$/,
          ],
        },
      },
    });
  } catch (error) {
    const loc = error?.loc ? ` (line ${error.loc.line}, col ${error.loc.column})` : "";
    const msg = String(error?.message || error).split("\n")[0];
    failures.push(`${path.relative(process.cwd(), file)}${loc}\n      ${msg}`);
  }
}

console.log(`\nSolid compile check: ${files.length - failures.length}/${files.length} files compiled\n`);
if (failures.length) {
  console.error("FAILED:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
process.exit(0);
