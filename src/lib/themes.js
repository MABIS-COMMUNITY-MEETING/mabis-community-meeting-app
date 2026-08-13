import { balancedPalette, spreadBalancedPalette } from "@/lib/color/themeBalance";
import { DEFAULT_FONT, FONT_PREVIEW_TEXT, findRequestedFont } from "@/lib/font-definitions";
import { networkState } from "@/lib/network-policy";
import { THEME_META } from "@/lib/theme-runtime-meta";
import { hexToHsl, hslToHex, readableHex } from "@/lib/theme-color-utils";

export { FONT_PREVIEW_TEXT, hexToHsl, hslToHex };

const themeSheetPromises = new Map();
let themeRequest = 0;

const THEME_INLINE_VARS = [
  "--primary", "--primary-foreground",
  "--secondary", "--secondary-foreground",
  "--accent", "--accent-foreground",
  "--background", "--foreground",
  "--card", "--card-foreground",
  "--popover", "--popover-foreground",
  "--muted", "--muted-foreground",
  "--border", "--input", "--ring",
  "--destructive", "--destructive-foreground",
  "--ink", "--bone",
  "--role-student", "--role-teacher", "--role-chair",
  "--role-minutes", "--role-admin", "--role-editor",
  "--palette-count", "--palette-accent-count",
  "--palette-stripes", "--palette-gradient",
  "--pride-glow", "--pride-edge", "--pride-highlight",
  "--character-primary", "--character-secondary", "--character-highlight",
  "--character-shade", "--character-outline", "--character-blue_dark",
  "--character-special", "--glass-edge", "--rim-light", "--glass-tint-2",
  ...Array.from({ length: 8 }, (_, index) => `--flag-${index + 1}`),
];

function clearInlineThemeVars() {
  const root = document.documentElement;
  THEME_INLINE_VARS.forEach((name) => root.style.removeProperty(name));
}

function ensureThemeStylesheet(key) {
  if (key === "default" || typeof document === "undefined") return Promise.resolve(true);
  if (themeSheetPromises.has(key)) return themeSheetPromises.get(key);

  const href = `/themes/${key}.css`;
  let link = Array.from(document.querySelectorAll("link[data-mabis-theme-sheet]"))
    .find((candidate) => candidate.dataset.mabisThemeSheet === key);
  if (link?.sheet) return Promise.resolve(true);
  if (link) link.remove();

  const promise = new Promise((resolve) => {
    link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.mabisThemeSheet = key;
    link.onload = () => resolve(true);
    link.onerror = () => {
      link.remove();
      themeSheetPromises.delete(key);
      resolve(false);
    };
    document.head.appendChild(link);
  });
  themeSheetPromises.set(key, promise);
  return promise;
}

/**
 * Apply one generated theme stylesheet. The 133-theme catalogue is deliberately
 * absent from this runtime path; only the selected palette crosses the network.
 */
export async function applyTheme(themeKey) {
  const requestedKey = Object.prototype.hasOwnProperty.call(THEME_META, themeKey)
    ? themeKey
    : "default";
  const request = ++themeRequest;
  const loaded = await ensureThemeStylesheet(requestedKey);
  if (request !== themeRequest) return requestedKey;

  const activeKey = loaded ? requestedKey : "default";
  const meta = THEME_META[activeKey] || THEME_META.default;
  const root = document.documentElement;
  const body = document.body;

  if (body) {
    body.classList.add("theme-shifting");
    clearTimeout(applyTheme._timer);
    applyTheme._timer = window.setTimeout(() => body.classList.remove("theme-shifting"), 760);
  }

  clearInlineThemeVars();
  root.dataset.mabisTheme = activeKey;
  root.classList.toggle("theme-is-dark", meta.dark);
  if (body) {
    const previousBodyClass = body.dataset.mabisThemeClass;
    if (previousBodyClass) body.classList.remove(previousBodyClass);
    body.classList.add(meta.bodyClass);
    body.dataset.mabisThemeClass = meta.bodyClass;
    body.classList.toggle("theme-is-dark", meta.dark);
    body.classList.toggle("pride-active", meta.pride);
  }

  // Keep the requested preference even when an uncached offline stylesheet
  // cannot be fetched. The next connected visit will retry it automatically.
  localStorage.setItem("mabis-theme", requestedKey);
  window.dispatchEvent(new CustomEvent("themeChanged", {
    detail: { key: requestedKey, activeKey, loaded },
  }));
  return activeKey;
}

function applyPalette(colors, exact = false) {
  const root = document.documentElement;
  const list = colors.filter(Boolean);
  const semantic = balancedPalette(list);
  const accents = spreadBalancedPalette(list, 8).map((color) => {
    if (!color.startsWith("#")) return color;
    if (!exact) return readableHex(color);
    return parseInt(hexToHsl(color).split(" ")[1]) < 8 ? readableHex(color) : color;
  });
  accents.forEach((accent, index) => root.style.setProperty(`--flag-${index + 1}`, accent));
  root.style.setProperty("--palette-count", String(list.length));
  root.style.setProperty("--palette-accent-count", String(semantic.length));
  const stops = list.map((color, index) => `${color} ${(index / list.length) * 100}% ${((index + 1) / list.length) * 100}%`);
  root.style.setProperty("--palette-stripes", `linear-gradient(90deg, ${stops.join(", ")})`);
  root.style.setProperty("--palette-gradient", `linear-gradient(90deg, ${list.join(", ")})`);
}

export function applyCustomColors(primaryHex, secondaryHex) {
  const root = document.documentElement;
  root.style.setProperty("--primary", hexToHsl(primaryHex));
  root.style.setProperty("--secondary", hexToHsl(secondaryHex));
  root.style.setProperty("--accent", hexToHsl(secondaryHex));
  root.style.setProperty("--ring", hexToHsl(primaryHex));
  root.style.setProperty("--destructive", hexToHsl(primaryHex));
  applyPalette([primaryHex, secondaryHex]);
  localStorage.setItem("mabis-custom-colors", JSON.stringify({ primary: primaryHex, secondary: secondaryHex }));
  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { custom: true } }));
}

export function clearCustomColors() {
  localStorage.removeItem("mabis-custom-colors");
  clearInlineThemeVars();
  window.dispatchEvent(new CustomEvent("themeChanged", { detail: { custom: false } }));
}

export function getStoredTheme() {
  const stored = localStorage.getItem("mabis-theme") || "default";
  return Object.prototype.hasOwnProperty.call(THEME_META, stored) ? stored : "default";
}

export function getStoredCustomColors() {
  const stored = localStorage.getItem("mabis-custom-colors");
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

export function getSavedThemes() {
  const stored = localStorage.getItem("mabis-saved-themes");
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

export function saveCustomTheme(name, primaryHex, secondaryHex) {
  const themes = getSavedThemes();
  const index = themes.findIndex((theme) => theme.name === name);
  const entry = { name, primary: primaryHex, secondary: secondaryHex };
  if (index >= 0) themes[index] = entry;
  else themes.push(entry);
  localStorage.setItem("mabis-saved-themes", JSON.stringify(themes));
  return themes;
}

export function deleteSavedTheme(name) {
  const themes = getSavedThemes().filter((theme) => theme.name !== name);
  localStorage.setItem("mabis-saved-themes", JSON.stringify(themes));
  return themes;
}

// Commercial families are never redistributed: they resolve to a user's own
// licensed local copy. Catalogue families remain one-stylesheet-per-selection.
const fontSheetPromises = new Map();

async function resolveFont(key) {
  const requested = findRequestedFont(key);
  if (requested) return requested;
  if (typeof key === "string" && key.startsWith("byw-")) {
    const { findCatalogueFont } = await import("@/lib/font-catalog");
    return findCatalogueFont(key) || DEFAULT_FONT;
  }
  return DEFAULT_FONT;
}

function ensureFontStylesheet(font) {
  if (!font?.stylesheet || typeof document === "undefined") return Promise.resolve();
  const href = font.stylesheet;
  if (fontSheetPromises.has(href)) return fontSheetPromises.get(href);

  const existing = Array.from(document.querySelectorAll("link[data-mabis-font-sheet]"))
    .find((link) => link.dataset.mabisFontSheet === href);
  if (existing?.sheet) return Promise.resolve();

  const promise = new Promise((resolve) => {
    const link = existing || document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.mabisFontSheet = href;
    link.onload = () => resolve();
    link.onerror = () => resolve();
    if (!existing) document.head.appendChild(link);
  });
  fontSheetPromises.set(href, promise);
  return promise;
}

export function isFontAssetLoaded(fontOrKey) {
  const font = typeof fontOrKey === "object" ? fontOrKey : findRequestedFont(fontOrKey);
  if (!font?.stylesheet || typeof document === "undefined") return !font?.stylesheet;
  return Array.from(document.querySelectorAll("link[data-mabis-font-sheet]"))
    .some((link) => link.dataset.mabisFontSheet === font.stylesheet && Boolean(link.sheet));
}

export async function preloadFont(key) {
  const font = await resolveFont(key);
  await ensureFontStylesheet(font);
  if (document.fonts) {
    await document.fonts.load(`400 16px ${font.body}`, FONT_PREVIEW_TEXT).catch(() => []);
  }
  return font;
}

export async function applyFont(key) {
  const font = await resolveFont(key);
  const root = document.documentElement;
  const thaiFallback = "'GNUFreeSerifThai'";
  const headingStack = `${font.heading}, ${thaiFallback}`;
  const bodyStack = `${font.body}, ${thaiFallback}`;
  const monoStack = `${font.mono}, ${thaiFallback}`;
  root.style.setProperty("--font-heading", headingStack);
  root.style.setProperty("--font-body", bodyStack);
  root.style.setProperty("--font-display", headingStack);
  root.style.setProperty("--font-mono", monoStack);
  root.style.setProperty("--font-multilingual", "'UnifontEX'");
  root.style.setProperty("--font-thai", thaiFallback);
  root.dataset.uiFont = font.key;
  if (document.body) document.body.style.fontFamily = bodyStack;

  localStorage.setItem("mabis-font", font.key);
  window.dispatchEvent(new CustomEvent("fontChanged", { detail: { key: font.key } }));
  window.dispatchEvent(new Event("themeChanged"));

  await ensureFontStylesheet(font);
  if (!document.fonts) return [];

  const loads = [document.fonts.load(`400 16px ${bodyStack}`, FONT_PREVIEW_TEXT)];
  if (!networkState().constrained) {
    loads.push(
      document.fonts.load(`700 16px ${headingStack}`, FONT_PREVIEW_TEXT),
      document.fonts.load(`400 16px ${monoStack}`, "MABIS 0123456789"),
    );
  }

  const loaded = await Promise.all(loads).catch(() => []);
  if (root.dataset.uiFont === font.key) {
    root.dataset.uiFontLoaded = font.key;
    window.dispatchEvent(new CustomEvent("fontRendered", { detail: { key: font.key } }));
  }
  return loaded;
}

export function getStoredFont() {
  const migration = localStorage.getItem("mabis-font-default-version");
  if (migration !== "gnu-free-mono-v1") {
    const now = String(Date.now());
    localStorage.setItem("mabis-font-default-version", "gnu-free-mono-v1");
    localStorage.setItem("mabis-font-picker-version", "7");
    localStorage.setItem("mabis-font-updated-at", now);
    localStorage.setItem("mabis-font", "gnu-free-mono");
    return "gnu-free-mono";
  }

  const stored = localStorage.getItem("mabis-font");
  const known = Boolean(findRequestedFont(stored));
  const catalogue = typeof stored === "string" && stored.startsWith("byw-");
  return known || catalogue ? stored : "gnu-free-mono";
}
