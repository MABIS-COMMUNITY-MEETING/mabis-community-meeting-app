/**
 * Notes block-model contract.
 *
 * Meeting notes are persisted as plain HTML and re-parsed into blocks on every
 * open, so parseBlocks → serializeBlocks is a lossy-conversion risk sitting
 * directly on user data: anything the parser drops is silently deleted from the
 * saved document the next time it autosaves.
 *
 * src/components/notes/block_html.js is shared verbatim by the React and Solid
 * builds, so this guards both at once.
 *
 * Run: node scripts/check-notes-roundtrip.mjs
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/" });
globalThis.DOMParser = dom.window.DOMParser;
globalThis.document = dom.window.document;

const { parseBlocks, serializeBlocks, convertHtml, uid } =
  await import("../src/components/notes/block_html.js");

const failures = [];
let count = 0;
function check(name, condition, detail = "") {
  count += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

// ── parse ──────────────────────────────────────────────────────────────────
check("empty input yields no blocks", parseBlocks("").length === 0);
check("whitespace-only input yields no blocks", parseBlocks("   \n ").length === 0);
check("null-ish input does not throw", parseBlocks(undefined).length === 0);

const mixed = parseBlocks('<h1>Title</h1><p>Body text</p><ul><li>one</li><li>two</li></ul><p><img src="/a.png"/></p>');
check("mixed document parses to 4 blocks", mixed.length === 4, `got ${mixed.length}`);
check("heading type preserved", mixed[0]?.type === "h1");
check("heading content preserved", mixed[0]?.html === "Title");
check("paragraph type preserved", mixed[1]?.type === "p");
check("list type preserved", mixed[2]?.type === "ul");
check("list items preserved", (mixed[2]?.html || "").includes("<li>one</li>"));
check("image lifted out of its wrapper", mixed[3]?.type === "img");
check("image src preserved", (mixed[3]?.src || "").endsWith("/a.png"));
check("every block gets a unique id", new Set(mixed.map((b) => b.id)).size === 4);

// h3 is deliberately folded into h2 — the editor only offers two heading levels.
check("h3 folds to h2", parseBlocks("<h3>x</h3>")[0]?.type === "h2");

// A bare text node is legal HTML and must not be dropped.
check("bare text node becomes a paragraph", parseBlocks("loose text")[0]?.type === "p");
check("bare text node keeps its content", parseBlocks("loose text")[0]?.html === "loose text");

// ── round-trip ─────────────────────────────────────────────────────────────
const cases = [
  "<p>plain</p>",
  "<h1>Heading</h1><p>after</p>",
  "<ul><li>a</li><li>b</li></ul>",
  "<ol><li>1</li><li>2</li></ol>",
  '<p><img src="/x.png"/></p>',
  "<p>bold <b>here</b> and <i>italic</i></p>",
  "<h1>T</h1><p>b</p><ul><li>l</li></ul>",
];
for (const html of cases) {
  const once = serializeBlocks(parseBlocks(html));
  const twice = serializeBlocks(parseBlocks(once));
  check(`round-trip is stable: ${html.slice(0, 34)}`, once === twice, `${once} !== ${twice}`);
  check(`round-trip keeps text: ${html.slice(0, 34)}`,
    once.replace(/<[^>]+>/g, "").trim() === html.replace(/<[^>]+>/g, "").trim(),
    `text changed: "${html.replace(/<[^>]+>/g, "")}" -> "${once.replace(/<[^>]+>/g, "")}"`);
}

// Inline formatting inside a block must survive verbatim — this is what users
// lose first if the parser starts reading textContent instead of innerHTML.
const rich = serializeBlocks(parseBlocks("<p>keep <b>bold</b> and <i>italics</i></p>"));
check("inline markup survives the round-trip", rich.includes("<b>bold</b>") && rich.includes("<i>italics</i>"), rich);

// ── convertHtml ────────────────────────────────────────────────────────────
check("list → list keeps markup untouched",
  convertHtml("ul", "ol", "<li>a</li><li>b</li>") === "<li>a</li><li>b</li>");
check("list → paragraph joins items with <br>",
  convertHtml("ul", "p", "<li>a</li><li>b</li>") === "a<br>b");
check("paragraph → list wraps in <li>",
  convertHtml("p", "ul", "text") === "<li>text</li>");
check("empty paragraph → list still produces a usable item",
  convertHtml("p", "ul", "") === "<li><br></li>");
check("paragraph → heading is a no-op on content",
  convertHtml("p", "h1", "text") === "text");

// ── uid ────────────────────────────────────────────────────────────────────
check("uid is collision-free across 5000 draws",
  new Set(Array.from({ length: 5000 }, uid)).size === 5000);

console.log(`\nNotes block model: ${count - failures.length}/${count} checks passed\n`);
if (failures.length) {
  console.error("FAILED:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("parseBlocks/serializeBlocks round-trip without losing content.\n");
