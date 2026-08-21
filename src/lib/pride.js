/**
 * THE PRIDE COLLECTION — the app's flagship palettes.
 *
 * These are not "the default site with different CSS variables". Each palette is
 * art-directed: a hand-chosen dominant / secondary / accent relationship, its own
 * lighting geometry (where the coloured light sits on the page and how slowly it
 * drifts), its own surface undertone, and its own ambient light material.
 *
 * Composition follows a 60 / 25 / 10 / 5 discipline — neutral surface, secondary
 * tone, strong accent, highlight — so flag colours read as deliberate accents
 * against breathing room, never as a flag stretched behind the interface.
 *
 * All derivatives are generated in OKLCh (see lib/color/oklch.js), so every
 * palette gets text-safe accents and consistent surfaces without hand-inventing
 * dozens of unrelated hexes, and every one gets an equally considered light and
 * dark treatment.
 */
import { tone, toneHex, surface } from "@/lib/color/oklch";
import { balancedPalette, contrastSafePair } from "@/lib/color/themeBalance";

/**
 * field — the theme's lighting geometry. Each entry is a soft radial light:
 *   c  swatch index the light is coloured from
 *   x,y  position in % of viewport   r  radius in vmax   a  peak alpha
 *   d  drift distance in %           s  seconds per cycle (slow = subconscious)
 */
const SPECS = [
  {
    key: "trans", name: "Trans", no: "01", mode: "light",
    flag: ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
    dominant: "#F5A9B8", secondary: "#5BCEFA", accent: "#F5A9B8", exact: true,
    note: "pink-led editorial surfaces, sky-blue counterpoint, white separation",
    field: [
      { c: 1, x: 12, y: 8, r: 46, a: 0.20, d: 5, s: 46 },
      { c: 0, x: 88, y: 78, r: 40, a: 0.16, d: 6, s: 61 },
      { c: 1, x: 62, y: 106, r: 34, a: 0.12, d: 4, s: 79 },
    ],
  },
  {
    key: "lesbian", name: "Lesbian", no: "02", mode: "dark",
    flag: ["#D52D00", "#EF7627", "#FF9A56", "#FFFFFF", "#D162A4", "#B55690", "#A30262"],
    dominant: "#A30262", secondary: "#EF7627", accent: "#D162A4",
    note: "deep rose and vivid orange share the interface, with soft pink as the connecting light",
    field: [
      { c: 6, x: 10, y: 14, r: 44, a: 0.24, d: 6, s: 57 },
      { c: 1, x: 90, y: 84, r: 46, a: 0.24, d: 7, s: 69 },
      { c: 4, x: 72, y: 24, r: 30, a: 0.13, d: 8, s: 89 },
      { c: 2, x: 24, y: 92, r: 30, a: 0.13, d: 8, s: 97 },
    ],
  },
  {
    key: "mlm", name: "Gay / MLM", no: "03", mode: "light",
    flag: ["#078D70", "#26CEAA", "#98E8C1", "#FFFFFF", "#7BADE2", "#5049CC", "#3D1A78"],
    dominant: "#078D70", secondary: "#7BADE2", accent: "#5049CC",
    note: "teal light rising into indigo — a cool vertical spectrum",
    field: [
      { c: 1, x: 18, y: 96, r: 48, a: 0.18, d: 5, s: 58 },
      { c: 5, x: 84, y: 6, r: 42, a: 0.16, d: 6, s: 74 },
      { c: 4, x: 50, y: 46, r: 28, a: 0.08, d: 8, s: 88 },
    ],
  },
  {
    key: "bi", name: "Bisexual", no: "04", mode: "dark",
    flag: ["#D60270", "#9B4F96", "#0038A8"],
    dominant: "#D60270", secondary: "#9B4F96", accent: "#0038A8",
    note: "blue-black surfaces, isolated magenta light, violet only as the seam",
    field: [
      { c: 0, x: 10, y: 18, r: 42, a: 0.28, d: 6, s: 49 },
      { c: 2, x: 90, y: 84, r: 50, a: 0.30, d: 7, s: 67 },
      { c: 1, x: 50, y: 52, r: 26, a: 0.12, d: 10, s: 84 },
    ],
  },
  {
    key: "pan", name: "Pansexual", no: "05", mode: "light",
    flag: ["#FF218C", "#FFD800", "#21B1FF"],
    dominant: "#FF218C", secondary: "#21B1FF", accent: "#FFD800",
    note: "energetic but composed — yellow used only as a luminous highlight",
    field: [
      { c: 0, x: 8, y: 84, r: 44, a: 0.20, d: 6, s: 51 },
      { c: 2, x: 90, y: 20, r: 46, a: 0.20, d: 6, s: 66 },
      { c: 1, x: 52, y: 4, r: 22, a: 0.10, d: 5, s: 39 },
    ],
  },
  {
    key: "ace", name: "Asexual", no: "06", mode: "dark",
    flag: ["#000000", "#A3A3A3", "#FFFFFF", "#800080"],
    dominant: "#800080", secondary: "#A3A3A3", accent: "#800080",
    note: "architectural monochrome, violet as a single deliberate incision",
    field: [
      { c: 3, x: 88, y: 10, r: 38, a: 0.26, d: 5, s: 72 },
      { c: 1, x: 12, y: 88, r: 44, a: 0.10, d: 6, s: 96 },
    ],
  },
  {
    key: "aromantic", name: "Aromantic", no: "07", mode: "dark",
    flag: ["#3DA542", "#A7D379", "#FFFFFF", "#A9A9A9", "#000000"],
    dominant: "#3DA542", secondary: "#A7D379", accent: "#3DA542",
    note: "technical and calm — green illumination along restrained greys",
    field: [
      { c: 0, x: 6, y: 30, r: 46, a: 0.22, d: 5, s: 63 },
      { c: 1, x: 94, y: 88, r: 34, a: 0.14, d: 6, s: 81 },
    ],
  },
  {
    key: "nonbinary", name: "Nonbinary", no: "08", mode: "dark",
    flag: ["#FCF434", "#FFFFFF", "#9C59D1", "#2C2C2C"],
    dominant: "#9C59D1", secondary: "#FCF434", accent: "#FCF434",
    note: "near-black surfaces, luminous yellow, violet interaction light",
    field: [
      { c: 2, x: 14, y: 12, r: 44, a: 0.26, d: 6, s: 57 },
      { c: 0, x: 86, y: 90, r: 30, a: 0.14, d: 5, s: 44 },
    ],
  },
  {
    key: "genderfluid", name: "Genderfluid", no: "09", mode: "dark",
    flag: ["#FF75A2", "#FFFFFF", "#BE18D6", "#000000", "#333EBD"],
    dominant: "#BE18D6", secondary: "#FF75A2", accent: "#333EBD",
    note: "warm and cool regions kept apart — never one muddy gradient",
    field: [
      { c: 0, x: 8, y: 10, r: 40, a: 0.24, d: 8, s: 43 },
      { c: 4, x: 92, y: 90, r: 44, a: 0.26, d: 8, s: 59 },
      { c: 2, x: 50, y: 50, r: 24, a: 0.10, d: 12, s: 77 },
    ],
  },
  {
    key: "genderqueer", name: "Genderqueer", no: "10", mode: "light",
    flag: ["#B57EDC", "#FFFFFF", "#4A8123"],
    dominant: "#B57EDC", secondary: "#4A8123", accent: "#4A8123",
    note: "muted lavender paper, fresh green accent — editorial, not candy",
    field: [
      { c: 0, x: 84, y: 12, r: 48, a: 0.18, d: 5, s: 68 },
      { c: 2, x: 10, y: 92, r: 32, a: 0.12, d: 6, s: 87 },
    ],
  },
  {
    key: "intersex", name: "Intersex", no: "11", mode: "light",
    flag: ["#FFD800", "#7902AA"],
    dominant: "#7902AA", secondary: "#FFD800", accent: "#7902AA",
    note: "orbital violet geometry over controlled yellow light",
    field: [
      { c: 0, x: 50, y: 50, r: 30, a: 0.16, d: 3, s: 52 },
      { c: 1, x: 50, y: 50, r: 62, a: 0.10, d: 2, s: 96 },
    ],
    ring: true,
  },
  {
    key: "progress", name: "Progress", no: "12", mode: "dark",
    flag: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787", "#5BCEFA", "#F5A9B8"],
    dominant: "#750787", secondary: "#FF8C00", accent: "#5BCEFA",
    note: "directional chevron light — the spectrum layered, never all at once",
    field: [
      { c: 5, x: 4, y: 50, r: 40, a: 0.26, d: 5, s: 61 },
      { c: 1, x: 22, y: 96, r: 34, a: 0.18, d: 6, s: 74 },
      { c: 6, x: 96, y: 20, r: 38, a: 0.18, d: 5, s: 88 },
      { c: 7, x: 78, y: 92, r: 26, a: 0.12, d: 7, s: 103 },
    ],
    chevron: true,
  },
  {
    key: "pride", name: "Rainbow", no: "13", mode: "light",
    flag: ["#E40303", "#FF8C00", "#FFED00", "#008026", "#004DFF", "#750787"],
    dominant: "#E40303", secondary: "#008026", accent: "#004DFF",
    note: "warm, green and cool regions share the interface while the full spectrum remains in the stripe",
    field: [
      { c: 0, x: 6, y: 4, r: 40, a: 0.16, d: 4, s: 56 },
      { c: 3, x: 40, y: 2, r: 30, a: 0.12, d: 4, s: 64 },
      { c: 4, x: 92, y: 96, r: 42, a: 0.16, d: 5, s: 78 },
      { c: 5, x: 58, y: 100, r: 30, a: 0.12, d: 5, s: 91 },
    ],
  },
  {
    key: "agender", name: "Agender", no: "14", mode: "dark",
    flag: ["#000000", "#BABABA", "#FFFFFF", "#B8F483", "#FFFFFF", "#BABABA", "#000000"],
    dominant: "#B8F483", secondary: "#BABABA", accent: "#B8F483",
    note: "graphite architecture with a single band of pale green light",
    field: [
      { c: 3, x: 50, y: 6, r: 40, a: 0.18, d: 4, s: 69 },
      { c: 1, x: 50, y: 98, r: 36, a: 0.08, d: 4, s: 92 },
    ],
  },
  {
    key: "demisexual", name: "Demisexual", no: "15", mode: "light",
    flag: ["#FFFFFF", "#6E0070", "#D3D3D3", "#000000"],
    dominant: "#6E0070", secondary: "#D3D3D3", accent: "#6E0070",
    note: "a wedge of violet entering from one edge of a pale field",
    field: [
      { c: 1, x: 2, y: 50, r: 42, a: 0.16, d: 4, s: 66 },
      { c: 2, x: 96, y: 84, r: 34, a: 0.08, d: 5, s: 89 },
    ],
  },
  {
    key: "polysexual", name: "Polysexual", no: "16", mode: "dark",
    flag: ["#F61CB9", "#07D569", "#1C92F6"],
    dominant: "#F61CB9", secondary: "#1C92F6", accent: "#07D569",
    note: "three separated lights — magenta, cyan, green — never mixed centrally",
    field: [
      { c: 0, x: 10, y: 14, r: 38, a: 0.24, d: 6, s: 53 },
      { c: 2, x: 90, y: 82, r: 40, a: 0.22, d: 6, s: 71 },
      { c: 1, x: 52, y: 96, r: 24, a: 0.12, d: 6, s: 86 },
    ],
  },
  {
    key: "omnisexual", name: "Omnisexual", no: "17", mode: "dark",
    flag: ["#FE9ACE", "#FF53BF", "#20063B", "#6B02B0", "#8EA3FF"],
    dominant: "#FF53BF", secondary: "#8EA3FF", accent: "#6B02B0",
    note: "deep aubergine surfaces lit by pink and periwinkle",
    field: [
      { c: 1, x: 14, y: 86, r: 44, a: 0.26, d: 6, s: 58 },
      { c: 4, x: 88, y: 16, r: 40, a: 0.22, d: 6, s: 76 },
    ],
  },
  {
    key: "femboy", name: "Femboy", no: "18", mode: "light",
    flag: ["#5BC8F5", "#9EE1F7", "#FFFFFF", "#F7A8C4", "#F26FA8"],
    dominant: "#5BC8F5", secondary: "#F26FA8", accent: "#F26FA8",
    note: "cool sky paper with rose light gathering at the lower edge",
    field: [
      { c: 0, x: 88, y: 8, r: 44, a: 0.18, d: 5, s: 62 },
      { c: 4, x: 12, y: 94, r: 40, a: 0.16, d: 5, s: 79 },
    ],
  },
  {
    key: "twink", name: "Twink", no: "19", mode: "light",
    flag: ["#F9A8D4", "#FFFFFF", "#FCE36B", "#FFFFFF", "#F26FA8"],
    dominant: "#F26FA8", secondary: "#FCE36B", accent: "#FCE36B",
    note: "pale rose field, warm highlight kept to a single luminous corner",
    field: [
      { c: 4, x: 10, y: 12, r: 42, a: 0.16, d: 5, s: 60 },
      { c: 2, x: 92, y: 90, r: 28, a: 0.14, d: 5, s: 83 },
    ],
  },
];

/* Some palettes must show their flag colours exactly as published, not as
   OKLCh derivatives. `exact: true` pins primary/secondary/accent to the spec
   hexes and picks a text colour that actually reads on them. */
function hexToHslStr(hex) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let hue = 0, s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) hue = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
  }
  return `${Math.round(hue)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

function applyExact(vars, s) {
  if (!s.exact) return vars;
  // Text on an exact flag fill must contrast with THAT fill, never with the
  // page. In dark mode --foreground is near-white, so using it on a light flag
  // colour (the ADMIN badge on lesbian orange) washed the label out.
  const darkInk = surface(s.dominant, 0.20, 0.03);
  const pairs = {
    primary: contrastSafePair(s.dominant, { dark: darkInk, light: "0 0% 100%" }),
    secondary: contrastSafePair(s.secondary, { dark: darkInk, light: "0 0% 100%" }),
    accent: contrastSafePair(s.accent, { dark: darkInk, light: "0 0% 100%" }),
  };
  vars["--primary"] = pairs.primary.fill;
  vars["--primary-foreground"] = pairs.primary.foreground;
  vars["--secondary"] = pairs.secondary.fill;
  vars["--secondary-foreground"] = pairs.secondary.foreground;
  vars["--accent"] = pairs.accent.fill;
  vars["--accent-foreground"] = pairs.accent.foreground;
  vars["--ring"] = pairs.primary.fill;
  return vars;
}

/* Light art direction: white breathing room, colour as placed accents. */
function lightVars(s) {
  const d = s.dominant, a = s.accent, sec = s.secondary;
  return {
    "--background": surface(d, 0.985, 0.005),
    "--foreground": surface(d, 0.24, 0.028),
    "--card": surface(d, 0.998, 0.003),
    "--card-foreground": surface(d, 0.24, 0.028),
    "--popover": surface(d, 0.998, 0.003),
    "--popover-foreground": surface(d, 0.24, 0.028),
    "--muted": surface(d, 0.955, 0.012),
    "--muted-foreground": surface(d, 0.56, 0.022),
    "--border": surface(d, 0.895, 0.016),
    "--input": surface(d, 0.895, 0.016),
    "--primary": tone(d, 0.52, 1, 0.17),
    "--primary-foreground": surface(d, 0.99, 0.004),
    "--secondary": tone(sec, 0.74, 0.9, 0.15),
    "--secondary-foreground": surface(sec, 0.24, 0.03),
    "--accent": tone(a, 0.56, 1, 0.17),
    "--accent-foreground": surface(a, 0.99, 0.004),
    "--ring": tone(d, 0.52, 1, 0.17),
  };
}

/* Dark art direction: near-black surfaces with a theme undertone, colour
   arriving as illumination rather than as fill. */
function darkVars(s) {
  const d = s.dominant, a = s.accent, sec = s.secondary;
  return {
    "--background": surface(d, 0.155, 0.016),
    "--foreground": surface(d, 0.945, 0.012),
    "--card": surface(d, 0.198, 0.020),
    "--card-foreground": surface(d, 0.945, 0.012),
    "--popover": surface(d, 0.198, 0.020),
    "--popover-foreground": surface(d, 0.945, 0.012),
    "--muted": surface(d, 0.255, 0.024),
    "--muted-foreground": surface(d, 0.70, 0.020),
    "--border": surface(d, 0.315, 0.028),
    "--input": surface(d, 0.315, 0.028),
    "--primary": tone(d, 0.74, 1, 0.19),
    "--primary-foreground": surface(d, 0.16, 0.014),
    "--secondary": tone(sec, 0.80, 0.9, 0.17),
    "--secondary-foreground": surface(sec, 0.17, 0.02),
    "--accent": tone(a, 0.76, 1, 0.19),
    "--accent-foreground": surface(a, 0.16, 0.014),
    "--ring": tone(d, 0.74, 1, 0.19),
  };
}

const ROLES = ["--role-student", "--role-teacher", "--role-chair", "--role-minutes", "--role-admin", "--role-editor"];

function buildTheme(s) {
  const roleL = s.mode === "dark" ? 0.76 : 0.5;
  const mk = (mode) => {
    const vars = applyExact(mode === "dark" ? darkVars(s) : lightVars(s), s);
    const darkInk = surface(s.dominant, 0.16, 0.014);
    const lightInk = surface(s.dominant, 0.99, 0.004);
    ["primary", "secondary", "accent"].forEach((token) => {
      const pair = contrastSafePair(vars[`--${token}`], {
        dark: darkInk,
        light: lightInk,
      });
      vars[`--${token}`] = pair.fill;
      vars[`--${token}-foreground`] = pair.foreground;
    });
    // Role colours are used two ways: as small text on a surface, and as a
    // filled badge with white text on top. Distinct flag hues rotate evenly;
    // repeated stripes and white separators no longer consume extra roles.
    const L = 0.54;
    const rolePalette = balancedPalette(s.flag);
    ROLES.forEach((r, i) => { vars[r] = tone(rolePalette[i % rolePalette.length], L, 1.05, 0.17); });
    return vars;
  };
  return {
    name: s.name,
    vars: s.mode === "dark" ? mk("dark") : mk("light"),
    varsLight: mk("light"),
    varsDark: mk("dark"),
    bodyClass: `theme-${s.key}`,
    swatches: s.flag,
    flag: s.flag,
    dark: s.mode === "dark",
    pride: s,
    /* glass + micro-detail lighting, expressed as light rather than flag stripes */
    character: s.exact
      ? { character_primary: s.dominant, character_secondary: s.secondary, character_highlight: s.accent }
      : {
        character_primary: toneHex(s.dominant, roleL, 1, 0.19),
        character_secondary: toneHex(s.secondary, roleL + 0.08, 0.95, 0.17),
        character_highlight: toneHex(s.accent, roleL + 0.12, 1, 0.19),
      },
  };
}

export const PRIDE_THEMES = Object.fromEntries(SPECS.map((s) => [s.key, buildTheme(s)]));
export const PRIDE_ORDER = SPECS.map((s) => s.key);
export const PRIDE_SPECS = SPECS;
export const isPrideTheme = (key) => Object.prototype.hasOwnProperty.call(PRIDE_THEMES, key);

/** Each palette may be read in either mode; neither is an afterthought. */
export function getPrideMode() {
  return localStorage.getItem("mabis-pride-mode") || "auto";
}
export function setPrideMode(mode) {
  localStorage.setItem("mabis-pride-mode", mode);
}

/** Tokens the ambience layer and themed micro-details read. */
export function prideTokens(theme, dark) {
  const s = theme.pride;
  const L = dark ? 0.74 : 0.54;
  // exact palettes keep their published flag hexes in the ambient light layer
  if (s.exact) {
    return {
      "--pride-glow": s.accent,
      "--pride-edge": s.dominant,
      "--pride-highlight": s.secondary,
    };
  }
  return {
    "--pride-glow": toneHex(s.accent, L + 0.1, 1, 0.19),
    "--pride-edge": toneHex(s.dominant, L, 1, 0.19),
    "--pride-highlight": toneHex(s.secondary, L + 0.14, 0.95, 0.17),
  };
}