import { BY_WOMXN_FONTS } from "@/lib/by_womxn_fonts";

const CORE_NAMES = new Set([
  "gnufreemono",
  "torrefarfan",
  "go",
  "gnufreesans",
  "gnufreeserif",
  "transgendergrotesk",
  "atlasmono",
  "iosevka",
  "lilex",
  "unifontex",
]);

export const FONT_CATALOG = BY_WOMXN_FONTS
  .filter((font) => !CORE_NAMES.has(font.name.toLowerCase().replace(/[^a-z0-9]/g, "")))
  .map((font) => ({
    ...font,
    detail: "Embedded libre webfont · Libre Fonts by Womxn",
    heading: `'${font.family}', 'GoUI'`,
    body: `'${font.family}', 'GoUI'`,
    mono: `'${font.family}', 'GoMonoUI'`,
    localOnly: false,
    featured: false,
  }));

export function findCatalogFont(key) {
  return FONT_CATALOG.find((font) => font.key === key);
}

let stylesheetPromise;

export function ensureFontCatalogStyles() {
  if (typeof document === "undefined") return Promise.resolve();
  if (stylesheetPromise) return stylesheetPromise;

  const existing = /** @type {HTMLLinkElement | null} */ (
    document.querySelector('link[data-mabis-font-catalog]')
  );
  if (existing?.sheet) return Promise.resolve();

  stylesheetPromise = new Promise((resolve, reject) => {
    const link = existing || document.createElement("link");
    const done = () => resolve();
    const failed = () => {
      stylesheetPromise = undefined;
      reject(new Error("Unable to load the optional font catalogue stylesheet."));
    };

    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", failed, { once: true });
    if (!existing) {
      link.rel = "stylesheet";
      link.href = "/fonts/by-womxn/fonts.css";
      link.dataset.mabisFontCatalog = "true";
      document.head.appendChild(link);
    }
  });

  return stylesheetPromise;
}
