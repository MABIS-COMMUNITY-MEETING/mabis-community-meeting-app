/*
 * HTML → ODT (OpenDocument Text), with no dependencies.
 *
 * The editor stores documents as HTML. ODT is a ZIP containing XML, so this
 * needs two things nothing in the project already provides: a ZIP writer and an
 * HTML→ODF translation. Both are here, and both are deliberately small.
 *
 * Why hand-rolled rather than a library: the only entries an ODT strictly needs
 * are `mimetype`, `META-INF/manifest.xml` and `content.xml`, and ODF permits
 * every entry to be STORED (uncompressed). That removes the need for DEFLATE,
 * which is the only genuinely hard part of writing a ZIP — what is left is
 * headers and a CRC. Pulling in JSZip (~100 KB) to avoid ~120 lines would cost
 * more than it saves on a page that already watches its bundle budget.
 *
 * Framework-agnostic on purpose: both the React and Solid builds import this.
 */

/* ── ZIP ──────────────────────────────────────────────────────────────────── */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i += 1) {
    let c = i;
    for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i += 1) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/**
 * Build a ZIP archive with every entry STORED (compression method 0).
 * `files` is [{ name, bytes }] and order is preserved — which matters, because
 * ODF requires `mimetype` to be the first entry and uncompressed.
 */
function zipStore(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const central = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const crc = crc32(file.bytes);
    const size = file.bytes.length;

    const local = new Uint8Array(30 + nameBytes.length + size);
    const lv = new DataView(local.buffer);
    lv.setUint32(0, 0x04034b50, true);   // local file header signature
    lv.setUint16(4, 20, true);           // version needed
    lv.setUint16(6, 0, true);            // flags
    lv.setUint16(8, 0, true);            // method: stored
    lv.setUint16(10, 0, true);           // mod time
    lv.setUint16(12, 0, true);           // mod date
    lv.setUint32(14, crc, true);
    lv.setUint32(18, size, true);        // compressed size
    lv.setUint32(22, size, true);        // uncompressed size
    lv.setUint16(26, nameBytes.length, true);
    lv.setUint16(28, 0, true);           // extra length
    local.set(nameBytes, 30);
    local.set(file.bytes, 30 + nameBytes.length);
    locals.push(local);

    const dir = new Uint8Array(46 + nameBytes.length);
    const dv = new DataView(dir.buffer);
    dv.setUint32(0, 0x02014b50, true);   // central directory signature
    dv.setUint16(4, 20, true);           // version made by
    dv.setUint16(6, 20, true);           // version needed
    dv.setUint16(8, 0, true);
    dv.setUint16(10, 0, true);           // method: stored
    dv.setUint16(12, 0, true);
    dv.setUint16(14, 0, true);
    dv.setUint32(16, crc, true);
    dv.setUint32(20, size, true);
    dv.setUint32(24, size, true);
    dv.setUint16(28, nameBytes.length, true);
    dv.setUint16(30, 0, true);           // extra
    dv.setUint16(32, 0, true);           // comment
    dv.setUint16(34, 0, true);           // disk number
    dv.setUint16(36, 0, true);           // internal attrs
    dv.setUint32(38, 0, true);           // external attrs
    dv.setUint32(42, offset, true);      // offset of local header
    dir.set(nameBytes, 46);
    central.push(dir);

    offset += local.length;
  }

  const centralSize = central.reduce((n, c) => n + c.length, 0);
  const end = new Uint8Array(22);
  const ev = new DataView(end.buffer);
  ev.setUint32(0, 0x06054b50, true);     // end of central directory
  ev.setUint16(8, files.length, true);
  ev.setUint16(10, files.length, true);
  ev.setUint32(12, centralSize, true);
  ev.setUint32(16, offset, true);

  const total = offset + centralSize + end.length;
  const out = new Uint8Array(total);
  let p = 0;
  for (const l of locals) { out.set(l, p); p += l.length; }
  for (const c of central) { out.set(c, p); p += c.length; }
  out.set(end, p);
  return out;
}

/* ── HTML → ODF ───────────────────────────────────────────────────────────── */

const xmlEscape = (s) => String(s ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

// Runs of spaces collapse in XML the same way they do in HTML, so multiple
// spaces are emitted as ODF's explicit space element to survive the round-trip.
function odfText(text) {
  return xmlEscape(text).replace(/ {2,}/g, (run) => ` <text:s text:c="${run.length - 1}"/>`);
}

const MARK_STYLES = [
  [["B", "STRONG"], "T_b"],
  [["I", "EM"], "T_i"],
  [["U"], "T_u"],
  [["S", "STRIKE", "DEL"], "T_s"],
];

function inlineToOdf(node) {
  if (node.nodeType === 3) return odfText(node.textContent);
  if (node.nodeType !== 1) return "";

  const tag = node.tagName.toUpperCase();
  if (tag === "BR") return "<text:line-break/>";
  // Images cannot be referenced by URL in a self-contained ODT — embedding
  // them means adding the binary to the archive and the manifest. Rather than
  // drop the content silently, the source is kept as visible text.
  if (tag === "IMG") {
    const src = node.getAttribute("src") || "";
    return src ? `[image: ${odfText(src)}]` : "";
  }

  const inner = Array.from(node.childNodes).map(inlineToOdf).join("");
  const style = MARK_STYLES.find(([tags]) => tags.includes(tag))?.[1];
  if (style) return `<text:span text:style-name="${style}">${inner}</text:span>`;
  if (tag === "A") {
    const href = node.getAttribute("href");
    if (href) return `<text:a xlink:type="simple" xlink:href="${xmlEscape(href)}">${inner}</text:a>`;
  }
  return inner;
}

function blockToOdf(node) {
  if (node.nodeType === 3) {
    const text = node.textContent.trim();
    return text ? `<text:p>${odfText(text)}</text:p>` : "";
  }
  if (node.nodeType !== 1) return "";

  const tag = node.tagName.toLowerCase();
  const inline = () => Array.from(node.childNodes).map(inlineToOdf).join("");

  if (/^h[1-6]$/.test(tag)) {
    return `<text:h text:outline-level="${tag[1]}">${inline()}</text:h>`;
  }
  if (tag === "ul" || tag === "ol") {
    const items = Array.from(node.children)
      .filter((li) => li.tagName.toLowerCase() === "li")
      .map((li) => `<text:list-item><text:p>${Array.from(li.childNodes).map(inlineToOdf).join("")}</text:p></text:list-item>`)
      .join("");
    return `<text:list text:style-name="${tag === "ol" ? "L_num" : "L_bullet"}">${items}</text:list>`;
  }
  if (tag === "blockquote") {
    return `<text:p text:style-name="Quote">${inline()}</text:p>`;
  }
  if (tag === "div" || tag === "p" || tag === "section" || tag === "article") {
    // A wrapper holding other blocks must not become one flat paragraph.
    const hasBlockChild = Array.from(node.children)
      .some((el) => /^(h[1-6]|ul|ol|p|div|blockquote|section|article|table)$/i.test(el.tagName));
    if (hasBlockChild) return Array.from(node.childNodes).map(blockToOdf).join("");
    const body = inline();
    return body.trim() ? `<text:p>${body}</text:p>` : "<text:p/>";
  }
  return Array.from(node.childNodes).map(blockToOdf).join("");
}

/** Convert an HTML fragment to the body of an ODF text document. */
export function htmlToOdfBody(html) {
  if (typeof DOMParser === "undefined") return "<text:p/>";
  const doc = new DOMParser().parseFromString(`<body>${html || ""}</body>`, "text/html");
  const out = Array.from(doc.body.childNodes).map(blockToOdf).join("");
  return out || "<text:p/>";
}

const CONTENT_XML = (body) => `<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
  xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
  xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
  xmlns:xlink="http://www.w3.org/1999/xlink"
  office:version="1.2">
 <office:automatic-styles>
  <style:style style:name="T_b" style:family="text"><style:text-properties fo:font-weight="bold"/></style:style>
  <style:style style:name="T_i" style:family="text"><style:text-properties fo:font-style="italic"/></style:style>
  <style:style style:name="T_u" style:family="text"><style:text-properties style:text-underline-style="solid" style:text-underline-width="auto"/></style:style>
  <style:style style:name="T_s" style:family="text"><style:text-properties style:text-line-through-style="solid"/></style:style>
  <text:list-style style:name="L_bullet">
   <text:list-level-style-bullet text:level="1" text:bullet-char="•"/>
  </text:list-style>
  <text:list-style style:name="L_num">
   <text:list-level-style-number text:level="1" style:num-format="1" style:num-suffix="."/>
  </text:list-style>
 </office:automatic-styles>
 <office:body><office:text>${body}</office:text></office:body>
</office:document-content>`;

const MANIFEST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0" manifest:version="1.2">
 <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
 <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="meta.xml" manifest:media-type="text/xml"/>
</manifest:manifest>`;

const META_XML = (title) => `<?xml version="1.0" encoding="UTF-8"?>
<office:document-meta
  xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
  xmlns:dc="http://purl.org/dc/elements/1.1/"
  office:version="1.2">
 <office:meta><dc:title>${xmlEscape(title)}</dc:title></office:meta>
</office:document-meta>`;

/** Build a complete .odt file from an HTML fragment. */
export function htmlToOdt(html, { title = "Document" } = {}) {
  const encoder = new TextEncoder();
  return zipStore([
    // MUST be first and stored — this is how a reader sniffs the format.
    { name: "mimetype", bytes: encoder.encode("application/vnd.oasis.opendocument.text") },
    { name: "META-INF/manifest.xml", bytes: encoder.encode(MANIFEST_XML) },
    { name: "meta.xml", bytes: encoder.encode(META_XML(title)) },
    { name: "content.xml", bytes: encoder.encode(CONTENT_XML(htmlToOdfBody(html))) },
  ]);
}

export function safeOdtFilename(value) {
  const base = (value || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "document";
  return base.toLowerCase().endsWith(".odt") ? base : `${base}.odt`;
}

/** Convert and save. Returns the filename written. */
export function downloadOdt(html, { title = "Document", filename } = {}) {
  const bytes = htmlToOdt(html, { title });
  const name = safeOdtFilename(filename || title);
  const blob = new Blob([bytes], { type: "application/vnd.oasis.opendocument.text" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the download has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return name;
}
