/**
 * ODT export contract.
 *
 * The exporter hand-rolls a ZIP writer, so a mistake produces a file that looks
 * fine until someone tries to open it in LibreOffice a week later. This
 * validates the archive structurally — signatures, CRCs, offsets, entry order —
 * and checks the ODF body, rather than trusting that it "looked right".
 *
 * Run: node scripts/check-odt-export.mjs
 */
import { JSDOM } from "jsdom";

const dom = new JSDOM("", { url: "http://localhost/" });
globalThis.DOMParser = dom.window.DOMParser;

const { htmlToOdt, htmlToOdfBody, safeOdtFilename } =
  await import("../src/lib/odt-export.js");

const failures = [];
let count = 0;
function check(name, condition, detail = "") {
  count += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const dec = new TextDecoder();
const u32 = (b, o) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint32(o, true);
const u16 = (b, o) => new DataView(b.buffer, b.byteOffset, b.byteLength).getUint16(o, true);

/** Parse the archive back out via the central directory, as a reader would. */
function readZip(bytes) {
  let eocd = -1;
  for (let i = bytes.length - 22; i >= 0; i -= 1) {
    if (u32(bytes, i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error("no end-of-central-directory record");
  const total = u16(bytes, eocd + 10);
  const cdSize = u32(bytes, eocd + 12);
  const cdOffset = u32(bytes, eocd + 16);

  const entries = [];
  let p = cdOffset;
  for (let n = 0; n < total; n += 1) {
    if (u32(bytes, p) !== 0x02014b50) throw new Error(`bad central header at entry ${n}`);
    const method = u16(bytes, p + 10);
    const crc = u32(bytes, p + 16);
    const size = u32(bytes, p + 24);
    const nameLen = u16(bytes, p + 28);
    const localOffset = u32(bytes, p + 42);
    const name = dec.decode(bytes.subarray(p + 46, p + 46 + nameLen));

    if (u32(bytes, localOffset) !== 0x04034b50) throw new Error(`bad local header for ${name}`);
    const lNameLen = u16(bytes, localOffset + 26);
    const lExtraLen = u16(bytes, localOffset + 28);
    const dataStart = localOffset + 30 + lNameLen + lExtraLen;
    const data = bytes.subarray(dataStart, dataStart + size);

    entries.push({ name, method, crc, size, data, localOffset });
    p += 46 + nameLen + u16(bytes, p + 30) + u16(bytes, p + 32);
  }
  return { entries, cdOffset, cdSize, eocd };
}

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[i] = c >>> 0;
  }
  return t;
})();
const crc32 = (b) => {
  let c = 0xffffffff;
  for (let i = 0; i < b.length; i += 1) c = CRC_TABLE[(c ^ b[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

// ── archive structure ───────────────────────────────────────────────────────
const odt = htmlToOdt("<h1>Minutes</h1><p>Hello <b>world</b></p>", { title: "Week 33" });
let zip;
try {
  zip = readZip(odt);
  check("archive parses as a ZIP", true);
} catch (e) {
  check("archive parses as a ZIP", false, e.message);
  zip = { entries: [] };
}

const names = zip.entries.map((e) => e.name);
check("mimetype is the FIRST entry", names[0] === "mimetype", `got ${names[0]}`);
check("mimetype is stored, not deflated", zip.entries[0]?.method === 0);
check("mimetype holds the ODF text media type",
  dec.decode(zip.entries[0]?.data ?? new Uint8Array()) === "application/vnd.oasis.opendocument.text");
check("manifest present", names.includes("META-INF/manifest.xml"));
check("content.xml present", names.includes("content.xml"));
check("meta.xml present", names.includes("meta.xml"));
check("every entry records a correct CRC32",
  zip.entries.every((e) => crc32(e.data) === e.crc),
  zip.entries.filter((e) => crc32(e.data) !== e.crc).map((e) => e.name).join(", "));
check("every entry declares its real size",
  zip.entries.every((e) => e.data.length === e.size));
check("central directory offset points at the first central header",
  zip.cdOffset > 0 && u32(odt, zip.cdOffset) === 0x02014b50);
check("local header offsets ascend in write order",
  zip.entries.every((e, i, a) => i === 0 || e.localOffset > a[i - 1].localOffset));

// ── ODF content ─────────────────────────────────────────────────────────────
const content = dec.decode(zip.entries.find((e) => e.name === "content.xml")?.data ?? new Uint8Array());
check("content.xml is well-formed XML", (() => {
  const parsed = new dom.window.DOMParser().parseFromString(content, "application/xml");
  return !parsed.querySelector("parsererror");
})());
check("declares the ODF content namespace", content.includes("office:document-content"));
check("heading became text:h with an outline level",
  /<text:h text:outline-level="1">Minutes<\/text:h>/.test(content));
check("bold became a styled span", /<text:span text:style-name="T_b">world<\/text:span>/.test(content));
check("title reached meta.xml",
  dec.decode(zip.entries.find((e) => e.name === "meta.xml").data).includes("Week 33"));

// ── translation cases ───────────────────────────────────────────────────────
check("empty input still yields a valid body", htmlToOdfBody("") === "<text:p/>");
check("unordered list becomes a bulleted text:list",
  /<text:list text:style-name="L_bullet">.*<text:list-item><text:p>a<\/text:p><\/text:list-item>/.test(
    htmlToOdfBody("<ul><li>a</li><li>b</li></ul>")));
check("ordered list uses the numbered style",
  htmlToOdfBody("<ol><li>a</li></ol>").includes('L_num'));
check("nested wrapper divs do not collapse into one paragraph",
  (htmlToOdfBody("<div><p>one</p><p>two</p></div>").match(/<text:p>/g) || []).length === 2);
check("line break maps to text:line-break",
  htmlToOdfBody("<p>a<br>b</p>").includes("<text:line-break/>"));
check("XML metacharacters are escaped",
  htmlToOdfBody("<p>a &lt; b &amp; c</p>").includes("a &lt; b &amp; c"));
check("angle brackets in text cannot break out of the document",
  !/<text:p>[^<]*<script/.test(htmlToOdfBody("<p>&lt;script&gt;x&lt;/script&gt;</p>")));
check("images are preserved as text rather than dropped",
  htmlToOdfBody('<p><img src="/a.png"></p>').includes("/a.png"));
check("links carry their href",
  htmlToOdfBody('<p><a href="https://x.test">go</a></p>').includes('xlink:href="https://x.test"'));
check("runs of spaces survive via text:s",
  htmlToOdfBody("<p>a   b</p>").includes("<text:s"));
check("headings h1-h6 all map",
  [1, 2, 3, 4, 5, 6].every((n) => htmlToOdfBody(`<h${n}>x</h${n}>`).includes(`text:outline-level="${n}"`)));

// ── filenames ───────────────────────────────────────────────────────────────
check("filename gains an .odt extension", safeOdtFilename("Week 33 minutes") === "Week 33 minutes.odt");
check("existing .odt extension is not doubled", safeOdtFilename("notes.odt") === "notes.odt");
check("path separators are stripped", !safeOdtFilename("a/b\\c").includes("/"));
check("empty name falls back", safeOdtFilename("") === "document.odt");

// A document big enough to cross a few buffer boundaries must still verify.
const big = htmlToOdt(`<p>${"long ".repeat(20000)}</p>`, { title: "Big" });
const bigZip = readZip(big);
check("large document still passes CRC verification",
  bigZip.entries.every((e) => crc32(e.data) === e.crc));

console.log(`\nODT export: ${count - failures.length}/${count} checks passed\n`);
if (failures.length) {
  console.error("FAILED:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("Archive structure, CRCs and ODF translation are valid.\n");
