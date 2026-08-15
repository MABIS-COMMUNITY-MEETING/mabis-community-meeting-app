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
const LineHeightAttr = new Parchment.Attributor.Style("lineheight", "line-height", {
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
const ThemeInkClass = new Parchment.Attributor.Class("themeInk", "ql-ink", { scope: Parchment.Scope.INLINE });
const ThemeHighlightClass = new Parchment.Attributor.Class("themeHighlight", "ql-hl", { scope: Parchment.Scope.INLINE });
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

export const EMPTY_FORMATS = {
  bold: false, italic: false, underline: false, strike: false,
  blockquote: false, codeBlock: false, script: false, header: false,
  align: false, list: false, color: false, background: false,
};

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
