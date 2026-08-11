/* ──────────────────────────────────────────────────────────────
   BFDI canonical character palettes.

   These are CHARACTER colours, not UI colours. They are the source of
   truth for the BFDI colourways and must never be nudged for taste,
   contrast or fashion — derive UI surfaces from them instead.

   Era: current / late-BFDIA-current asset colours.
   Semantic keys per character (only the ones that character has):
     character_primary, character_secondary, character_highlight,
     character_outline, character_special
   Firey keeps his two flame layers named for what they are.
   ────────────────────────────────────────────────────────────── */

export const bfdi_colorways = {
  firey: {
    name: "Firey",
    outer_flame: "#FF9901",
    inner_flame: "#FFCC00",
    character_primary: "#FF9901",
    character_secondary: "#FFCC00",
    character_highlight: "#FFCC00",
    character_outline: "#D97D00",
  },
  leafy: {
    name: "Leafy",
    character_primary: "#5EE104",
    character_secondary: "#56D24F",
    character_highlight: "#8BFE3F",
    character_outline: "#37AA00",
  },
  blocky: {
    name: "Blocky",
    character_primary: "#E84646", // front face
    character_secondary: "#C12437", // side face
    character_highlight: "#EF777E", // top face
    character_outline: "#A81C38",
  },
  coiny: {
    name: "Coiny",
    character_primary: "#EC9F00",
    character_secondary: "#E19800",
    character_highlight: "#FFAD04",
    character_outline: "#B87C00",
  },
  eraser: {
    name: "Eraser",
    character_primary: "#E47E93",
    character_secondary: "#DF6A82",
    character_highlight: "#E6919C",
    character_outline: "#C2596F",
  },
  pin: {
    name: "Pin",
    character_primary: "#F00F0F",
    character_secondary: "#F23831",
    character_highlight: "#F23831",
    character_outline: "#DA0E1E",
  },
  four: {
    name: "Four",
    character_primary: "#337CCF", // Four is blue, not green
    character_secondary: "#2A5F9E",
    character_highlight: "#5FA3E8",
    character_outline: "#1E4470",
  },
  x: {
    name: "X",
    character_primary: "#F2C438", // X is golden yellow
    character_secondary: "#D4A017",
    character_highlight: "#FFE07A",
    character_outline: "#A87C0C",
  },
  pencil: {
    name: "Pencil",
    character_primary: "#FFA909", // coating dark
    character_secondary: "#FFBF48", // coating light
    character_highlight: "#FFD98A",
    character_outline: "#C97F00",
    character_special: "#2E2E2E", // graphite tip
  },
  match: {
    name: "Match",
    character_primary: "#F04E6E", // match head
    character_secondary: "#C93B58",
    character_highlight: "#F9B9CB", // stick
    character_outline: "#A32944",
  },
  bubble: {
    name: "Bubble",
    // translucent: identity lives in edge + specular, not a flat fill
    character_primary: "#9FE0F0",
    character_secondary: "#C9F0FA",
    character_highlight: "#FFFFFF",
    character_outline: "#5FB3CC",
  },
  icecube: {
    name: "Ice Cube",
    character_primary: "#B7E6F2",
    character_secondary: "#8FCDE0",
    character_highlight: "#FFFFFF",
    character_outline: "#5C9CB0",
  },
  flower: {
    name: "Flower",
    character_primary: "#F282C0", // petals
    character_secondary: "#D9539E",
    character_highlight: "#FFFFFF", // white petal core
    character_outline: "#B33F80",
    character_special: "#FFDE59", // yellow centre
  },
  book: {
    name: "Book",
    // green cover + blue spine/cover details + white pages — never one colour
    character_primary: "#24B814",   // cover green
    character_secondary: "#139CB9", // cover/spine blue
    character_highlight: "#75CE60", // bright green highlight
    character_shade: "#1E9A38",     // shaded green
    character_outline: "#11580A",   // deep green structure
    character_blue_dark: "#084F56", // deep blue structure
    character_special: "#FFFFFF",   // pages
  },
  gelatin: {
    name: "Gelatin",
    character_primary: "#8CD94A", // Gelatin is a green jelly
    character_secondary: "#6BBF33",
    character_highlight: "#B8ED7E",
    character_outline: "#4E9420",
  },
};

/* Ordered, de-duplicated swatch list for a character — used for the
   colourway preview and the palette stripe so multicolour characters
   preview as multicolour. */
export function character_swatches(key) {
  const c = bfdi_colorways[key];
  const list = [
    c.character_primary,
    c.character_secondary,
    c.character_highlight,
    c.character_shade,
    c.character_special,
    c.character_outline,
    c.character_blue_dark,
  ].filter(Boolean);
  return [...new Set(list.map((h) => h.toUpperCase()))];
}