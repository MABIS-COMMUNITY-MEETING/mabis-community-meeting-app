/**
 * Solid migration parity check.
 *
 * A green `vite build` only proves the Solid port COMPILES. This mounts the
 * real built bundle in a DOM and asserts the rendered output against the React
 * source of truth, which is what actually catches a broken port: a component
 * that throws on mount, children rendered once instead of twice, a Tailwind
 * transform silently cancelled by an inline style, or a dropped class.
 *
 * Run: node scripts/check-solid-parity.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";

const dist = path.join(process.cwd(), "dist-solid");
const failures = [];
const checks = [];

function check(name, condition, detail = "") {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const entry = fs.readdirSync(path.join(dist, "assets")).find((f) => /^index-.*\.js$/.test(f));
if (!entry) {
  console.error("No Solid entry bundle found. Build first.");
  process.exit(1);
}

const dom = new JSDOM(html, { url: "http://localhost/", pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;

// jsdom lacks these; the port reads them through the shared preference and
// physics modules, so stub them exactly as a fine-pointer desktop would report.
window.matchMedia = (q) => ({
  matches: /hover: hover|pointer: fine/.test(q) && !/reduce/.test(q),
  media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});
if (!window.requestIdleCallback) window.requestIdleCallback = (fn) => setTimeout(fn, 0);

// NB: `performance` is deliberately excluded. jsdom's Performance delegates to
// the global one, so assigning it back onto globalThis makes now() recurse
// into itself and blow the stack. Node's native performance works fine here.
for (const k of ["window", "document", "navigator", "localStorage", "sessionStorage", "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "getComputedStyle", "Node", "Element", "HTMLElement", "CustomEvent", "Event", "MutationObserver"]) {
  globalThis[k] = window[k];
}
Object.defineProperty(window, "performance", { value: globalThis.performance, configurable: true });
globalThis.self = window;

const code = fs.readFileSync(path.join(dist, "assets", entry), "utf8");
const blobUrl = "data:text/javascript;base64," + Buffer.from(code).toString("base64");

let mountError = null;
try {
  await import(blobUrl);
  // Solid's render is synchronous, but the bootstrap awaits a font promise.
  await new Promise((r) => setTimeout(r, 900));
} catch (e) {
  mountError = e;
}

check("bundle executes without throwing", !mountError, mountError && String(mountError).slice(0, 300));

const root = window.document.getElementById("root");
const text = root ? root.textContent.replace(/\s+/g, " ") : "";
const html2 = root ? root.innerHTML : "";

check("app mounted into #root", root && root.children.length > 0);

// ── content parity with src/pages/Splash.jsx ────────────────────────────────
check('hero headline "COMMUNITY" present', text.includes("COMMUNITY"));
check('hero headline "MEETING" present', text.includes("MEETING"));
check("eyebrow label present", text.includes("SECONDARY COMMUNITY MEETING APP"));
check("mission copy present", text.includes("Voice your words with presence and shared decision"));
check("CTA present", text.includes("ENTER LOG IN"));
check("N° 02 button index present", text.includes("N° 02"));
check("EST. BANGKOK TH present", text.includes("EST. BANGKOK TH"));
check("N° 2026 EDITION present", text.includes("N° 2026 EDITION"));
check("SCROLL cue present", text.includes("SCROLL"));

// ── structural parity ──────────────────────────────────────────────────────
check("SplitChars split the headline per glyph",
  (html2.match(/overflow: ?hidden/g) || []).length >= 16,
  "expected one clipping span per glyph of COMMUNITY+MEETING");

check("marquee duplicated its children for the seamless loop",
  (html2.match(/MABIS BANGKOK/g) || []).length === 12,
  `found ${(html2.match(/MABIS BANGKOK/g) || []).length}, expected 12 (6 items x 2 copies)`);

check("KineticBackground layers rendered", html2.includes("blob-drift") && html2.includes("spin-slow"));
check("corner bracket rendered", html2.includes("corner-bracket"));
check("liquid button classes preserved", html2.includes("liquid-btn") && html2.includes("liquid-ink"));
check("theme tokens used (bg-ink / text-bone)", html2.includes("bg-ink") && html2.includes("text-bone"));

// The giant cropped word animates opacity only, so its Tailwind centering
// transform must survive — an inline transform here would be the regression.
const hugeCrop = root && root.querySelector(".huge-crop");
check("huge-crop word rendered", !!hugeCrop);
check("huge-crop keeps its Tailwind transform (no inline transform override)",
  hugeCrop && !/transform/i.test(hugeCrop.getAttribute("style") || ""),
  hugeCrop ? `style="${hugeCrop.getAttribute("style")}"` : "");

// Elements that DO animate a transform should have one inline.
const vertLabels = root ? [...root.querySelectorAll(".vert-text")] : [];
check("vertical side labels rendered", vertLabels.length >= 2);

// ── theme engine parity ────────────────────────────────────────────────────
const rootStyle = window.document.documentElement.getAttribute("style") || "";
check("theme engine wrote CSS custom properties", /--primary/.test(rootStyle), rootStyle.slice(0, 120));
check("font stack applied by shared themes.js", /--font-body/.test(rootStyle));
check("ui-font-ready set (first-paint font bootstrap ran)",
  window.document.documentElement.classList.contains("ui-font-ready"));

console.log(`\nSolid parity: ${checks.length - failures.length}/${checks.length} checks passed\n`);
if (failures.length) {
  console.error("FAILED:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("Splash slice renders at parity with the React source.\n");
