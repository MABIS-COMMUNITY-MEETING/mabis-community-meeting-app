import Quill from "quill";

/*
 * Quill configuration — ported verbatim from src/components/DocsEditor.jsx.
 *
 * All of this is vanilla Quill API with no framework involvement, which is why
 * it moves across unchanged. The React build reached Quill through react-quill;
 * this one talks to Quill directly, because Quill is an imperative editor and
 * Solid has no objection to imperative DOM. react-quill exists to reconcile
 * Quill with React's render cycle — a problem Solid does not have.
 */

// Quill's built-in toolbar is deliberately disabled; the app supplies its own
// Docs-style chrome, which is what allows free font sizes and line spacing.
const SizeAttr = Quill.import("attributors/style/size");
SizeAttr.whitelist = null;
Quill.register(SizeAttr, true);

export const FONTS = [
  { label: "GNU FreeMono", value: "'GNUFreeMonoUI'" },
  { label: "Torrefarfan", value: "'torrefarfan'" },
  { label: "Go", value: "'GoUI'" },
  { label: "Go Mono", value: "'GoMonoUI'" },
  { label: "GNU FreeSans", value: "'GNUFreeSansUI'" },
  { label: "GNU FreeSerif", value: "'GNUFreeSerifUI'" },
  { label: "Atlas Mono", value: "'AtlasMonoUI', 'GNUFreeMonoUI'" },
  { label: "Iosevka", value: "'IosevkaUI'" },
  { label: "Lilex", value: "'LilexUI'" },
  { label: "UnifontEX", value: "'UnifontEX'" },
];

const FontAttr = Quill.import("attributors/style/font");
FontAttr.whitelist = FONTS.map((font) => font.value);
Quill.register(FontAttr, true);

const Parchment = Quill.import("parchment");
/*
 * NB: this is Quill 2.x, not the Quill 1.x react-quill bundles privately for
 * the React build (react-quill depends on quill@^1.3.7, so npm nests its own
 * copy rather than reuse the workspace's quill@2.0.3). Parchment's API is not
 * the same shape across that major version: v1 exposes `Attributor.Style` /
 * `Attributor.Class` as nested constructors, v2 flattens them to top-level
 * `StyleAttributor` / `ClassAttributor`. Using the v1 shape here compiles fine
 * but throws "Attributor.Style is not a constructor" at runtime, and because
 * that throw happens inside this module's top-level evaluation, the dynamic
 * import() that pulls in DocsEditor never resolves OR rejects visibly through
 * Suspense (no ErrorBoundary catches it) — the editor just silently never
 * mounts, with nothing in the console to point at this file.
 */
const LineHeightAttr = new Parchment.StyleAttributor("lineheight", "line-height", {
  scope: Parchment.Scope.BLOCK,
  whitelist: ["1", "1.15", "1.5", "2"],
});
Quill.register(LineHeightAttr, true);

/*
 * Ink and highlight are applied as CLASSES, not inline styles.
 *
 * Writing style="color: hsl(var(--editor-ink-primary))" relied on guards in
 * index.css that substring-match the serialised style attribute — any browser
 * normalisation of the var() expression made them miss, and the !important
 * rule then repainted the user's colour back to the default ink. A class
 * cannot be normalised away, and it keeps the colour bound to the theme token
 * so all 133 themes stay contrast-correct.
 */
const ThemeInkClass = new Parchment.ClassAttributor("themeInk", "ql-ink", { scope: Parchment.Scope.INLINE });
const ThemeHighlightClass = new Parchment.ClassAttributor("themeHighlight", "ql-hl", { scope: Parchment.Scope.INLINE });
Quill.register(ThemeInkClass, true);
Quill.register(ThemeHighlightClass, true);

export const SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];
export const LINE_HEIGHTS = ["1", "1.15", "1.5", "2"];
export const ZOOM_LEVELS = [75, 90, 100, 110, 125, 150];

export const THEME_TEXT_COLORS = [
  { label: "Default text", value: null, token: null },
  { label: "Primary theme ink", value: "primary", token: "--editor-ink-primary" },
  { label: "Secondary theme ink", value: "secondary", token: "--editor-ink-secondary" },
  { label: "Accent theme ink", value: "accent", token: "--editor-ink-accent" },
];

export const THEME_HIGHLIGHTS = [
  { label: "No highlight", value: null, token: null },
  { label: "Primary theme highlight", value: "primary", token: "--editor-highlight-primary" },
  { label: "Secondary theme highlight", value: "secondary", token: "--editor-highlight-secondary" },
  { label: "Accent theme highlight", value: "accent", token: "--editor-highlight-accent" },
];

export const EDITOR_MODULES = {
  toolbar: false,
  history: { delay: 650, maxStack: 150, userOnly: true },
  clipboard: { matchVisual: false },
};

export const Delta = Quill.import("delta");

export const EMPTY_FORMATS = {
  bold: false, italic: false, underline: false, strike: false,
  blockquote: false, codeBlock: false, script: false, header: false,
  align: false, list: false, color: false, background: false,
};

/** Remove only foreign colour/highlight paint while preserving structure,
 * emphasis, lists and links from Word, Google Docs and web pages. */
export function sanitizePastedHtml(html) {
  if (!html || typeof document === "undefined") return html || "";
  const template = document.createElement("template");
  template.innerHTML = html;

  for (const element of template.content.querySelectorAll("*")) {
    element.removeAttribute("bgcolor");
    element.removeAttribute("color");
    element.style?.removeProperty("color");
    element.style?.removeProperty("background");
    element.style?.removeProperty("background-color");
    element.style?.removeProperty("text-shadow");
  }

  // <mark> paints yellow even with no style attribute. Unwrap it so external
  // highlighting cannot silently become part of the document.
  for (const mark of template.content.querySelectorAll("mark")) {
    mark.replaceWith(...mark.childNodes);
  }
  return template.innerHTML;
}

function channel(hex, offset) {
  const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

/** Pick the stronger black/white foreground for an unrestricted highlight. */
export function readableInkForHex(value) {
  const raw = String(value || "").trim();
  const expanded = /^#[0-9a-f]{3}$/i.test(raw)
    ? `#${raw[1]}${raw[1]}${raw[2]}${raw[2]}${raw[3]}${raw[3]}`
    : raw;
  if (!/^#[0-9a-f]{6}$/i.test(expanded)) return "#000000";
  const luminance = 0.2126 * channel(expanded, 1)
    + 0.7152 * channel(expanded, 3)
    + 0.0722 * channel(expanded, 5);
  const blackContrast = (luminance + 0.05) / 0.05;
  const whiteContrast = 1.05 / (luminance + 0.05);
  return blackContrast >= whiteContrast ? "#000000" : "#ffffff";
}

/**
 * Resolve a theme token to a concrete colour at the moment it is applied.
 *
 * Writing hsl(var(--editor-ink-primary)) into Quill produced a span whose
 * colour never painted — the declaration is only valid where the custom
 * property resolves, and it did not. Reading the computed value gives the same
 * guarantee while keeping the palette on contrast-checked theme roles.
 */
export function resolveThemeColor(token) {
  if (!token || typeof window === "undefined") return false;
  const root = document.documentElement;
  const read = (name) => getComputedStyle(root).getPropertyValue(name).trim();
  const raw = read(token) || read("--primary");
  return raw ? `hsl(${raw})` : false;
}

export function stripHtml(html) {
  if (!html) return "";
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const container = document.createElement("div");
  container.innerHTML = html;
  return container.textContent || "";
}

export function safeFilename(value) {
  return (value || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "document";
}

export { Quill };
