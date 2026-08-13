import { BY_WOMXN_FONTS } from "@/lib/by_womxn_fonts";
import { REQUESTED_FONTS, byWomxnSheet } from "@/lib/font-definitions";

const requestedNames = new Set(
  REQUESTED_FONTS.map((font) => font.name.toLowerCase().replace(/[^a-z0-9]/g, "")),
);

export const LIBRARY_FONTS = BY_WOMXN_FONTS
  .filter((font) => !requestedNames.has(font.name.toLowerCase().replace(/[^a-z0-9]/g, "")))
  .map((font) => ({
    ...font,
    stylesheet: byWomxnSheet(font.family),
    detail: "Embedded libre webfont · Libre Fonts by Womxn",
    heading: `'${font.family}', 'GoUI'`,
    body: `'${font.family}', 'GoUI'`,
    mono: `'${font.family}', 'GoMonoUI'`,
    localOnly: false,
    featured: false,
  }));

export const FONTS = [...REQUESTED_FONTS, ...LIBRARY_FONTS];

export const FONT_LIBRARIES = [
  { key: "featured", name: "Featured", detail: `${REQUESTED_FONTS.length} requested fonts` },
  {
    key: "by-womxn",
    name: "Libre Fonts by Womxn",
    detail: `${LIBRARY_FONTS.length} embedded libre webfonts`,
    url: "https://gitlab.com/lfurter/by-womxn",
  },
  {
    key: "flintype",
    name: "FLINT*ype",
    detail: "FLINTA* discovery archive. Its current site is moving, so indexed commercial fonts are not mirrored without their licences.",
    url: "https://flintype.com/",
  },
];

export function findCatalogueFont(key) {
  return FONTS.find((font) => font.key === key) || null;
}
