import { bfdi_colorways, character_swatches } from "@/lib/bfdi_palettes";
import { gmk_ui } from "@/lib/gmk_palettes";
import { PRIDE_THEMES, prideTokens } from "@/lib/pride";
import { balancedPalette, contrastSafeInk, contrastSafePair, pickDistinctPaletteColor, spreadBalancedPalette } from "@/lib/color/themeBalance";

// Theme definitions for MABIS platform
// MABIS Default is the original maroon + gold theme
// Pastel themes use 2 harmonious pastel colors + white background

function toneVariant(hslStr, lightnessDelta) {
  const [h, sat, lRaw] = hslStr.split(" ");
  const newL = Math.max(32, Math.min(58, parseInt(lRaw) + lightnessDelta));
  return `${h} ${sat} ${newL}%`;
}

function keyColorPair(hsl) {
  const [h, s] = hsl.split(" ").map((v) => parseInt(v));
  return contrastSafePair(hsl, {
    dark: `${h} ${Math.min(s, 40)}% 12%`,
    light: "0 0% 100%",
  });
}

function pastelTheme(key, name, p, s) {
  // Very light background tint from primary hue
  const [pH] = p.split(" ");
  const bg = `${pH} 25% 97%`;
  const primaryPair = keyColorPair(p);
  const secondaryPair = keyColorPair(s);

  return {
    name,
    vars: {
      "--primary": primaryPair.fill,
      "--primary-foreground": primaryPair.foreground,
      "--secondary": secondaryPair.fill,
      "--secondary-foreground": secondaryPair.foreground,
      "--accent": secondaryPair.fill,
      "--accent-foreground": secondaryPair.foreground,
      "--background": bg,
      "--foreground": "220 12% 22%",
      "--card": "0 0% 100%",
      "--card-foreground": "220 12% 22%",
      "--popover": "0 0% 100%",
      "--popover-foreground": "220 12% 22%",
      "--muted": `${pH} 14% 95%`,
      "--muted-foreground": "220 8% 48%",
      "--border": `${pH} 12% 90%`,
      "--input": `${pH} 12% 90%`,
      "--ring": primaryPair.fill,
      // Two-colour themes alternate their real hues evenly. Tone variants keep
      // badges distinct without inventing unrelated green, purple or orange.
      "--role-student": p,
      "--role-teacher": s,
      "--role-chair": toneVariant(p, -8),
      "--role-minutes": toneVariant(s, -8),
      "--role-admin": toneVariant(p, 8),
      "--role-editor": toneVariant(s, 8),
    },
    bodyClass: `theme-${key}`,
    swatches: [`hsl(${p})`, `hsl(${s})`, "#ffffff"],
    dark: false,
  };
}

/* Multi-colour brand theme: primary/secondary drive the UI tokens while the full
   colour set (flag stripes, distro brand palette) feeds swatches and accents. */
function paletteTheme(key, name, p, s, flagHexes) {
  const semanticPalette = balancedPalette(flagHexes);
  const primarySource = semanticPalette[0]?.startsWith("#")
    ? hexToHsl(readableHex(semanticPalette[0]))
    : p;
  const secondarySource = semanticPalette[1]?.startsWith("#")
    ? hexToHsl(readableHex(semanticPalette[1]))
    : s;
  const t = pastelTheme(key, name, primarySource, secondarySource);
  t.swatches = flagHexes;
  t.flag = flagHexes;
  const [pH] = primarySource.split(" ");
  // Flags are already loud. The page underneath stays an almost-neutral sheet
  // carrying a whisper of the flag's hue, so the colour reads as intentional
  // rather than as UI chrome fighting the palette.
  t.vars["--background"] = `${pH} 18% 97%`;
  t.vars["--foreground"] = `${pH} 14% 12%`;
  t.vars["--card"] = "0 0% 100%";
  t.vars["--card-foreground"] = `${pH} 14% 12%`;
  t.vars["--popover"] = "0 0% 100%";
  t.vars["--popover-foreground"] = `${pH} 14% 12%`;
  t.vars["--muted"] = `${pH} 12% 94%`;
  t.vars["--muted-foreground"] = `${pH} 8% 42%`;
  t.vars["--border"] = `${pH} 12% 88%`;
  t.vars["--input"] = `${pH} 12% 88%`;
  const tertiaryHex = pickDistinctPaletteColor(flagHexes, [primarySource, secondarySource]);
  const tertiary = tertiaryHex ? hexToHsl(readableHex(tertiaryHex)) : secondarySource;
  const tertiaryPair = keyColorPair(tertiary);
  t.vars["--accent"] = tertiaryPair.fill;
  t.vars["--accent-foreground"] = tertiaryPair.foreground;

  // Roles cycle through each distinct usable palette hue in canonical order.
  // Repeated stripes and white/black no longer crowd out identity colours.
  const roles = ["--role-student", "--role-teacher", "--role-chair", "--role-minutes", "--role-admin", "--role-editor"];
  const usable = balancedPalette(flagHexes).map((hex) => hexToHsl(readableHex(hex)));
  roles.forEach((r, i) => { t.vars[r] = usable[i % usable.length]; });
  return t;
}

/* Flags contain white, black and pale pastels. Used raw as UI accents they
   vanish on a light page (or blend into ink), so accent copies are pulled
   into a legible lightness band while keeping the hue that identifies them. */
function readableHex(hex) {
  const [h, s, l] = hexToHsl(hex).split(" ").map((v) => parseInt(v));
  if (s < 8) return l > 55 ? "#4a4a4a" : hslToHex(`${h} 0% ${Math.max(l, 18)}%`); // white/grey → graphite
  return hslToHex(`${h} ${Math.max(s, 62)}% ${Math.min(Math.max(l, 38), 52)}%`);
}

const prideTheme = paletteTheme;
const distroTheme = paletteTheme;
const consoleTheme = paletteTheme;
const touhouTheme = paletteTheme;
const sonicTheme = paletteTheme;
/* BFDI colourways are generated from the canonical character palettes so the
   accent colours are the character's real colours, never eyeballed. */
function bfdiTheme(key) {
  const c = bfdi_colorways[key];
  const t = paletteTheme(
    key,
    c.name,
    hexToHsl(c.character_primary),
    hexToHsl(c.character_secondary),
    character_swatches(key)
  );
  // canonical colours exposed for glass edges, 3D accents and previews
  t.character = c;
  return t;
}

/* GMK keysets. The canonical hexes in lib/gmk_palettes.js are authoritative:
   they go into the theme untouched, and only supporting surfaces (cards,
   muted fills, borders) are derived from them by moving lightness while the
   hue stays put. */
function nudgeL(hex, delta) {
  const [h, s, l] = hexToHsl(hex).split(" ").map((v) => parseInt(v));
  return `${h} ${s}% ${Math.max(0, Math.min(100, l + delta))}%`;
}

function gmkTheme(key) {
  const u = gmk_ui[key];
  const bg = hexToHsl(u.background);
  const fg = hexToHsl(u.foreground);
  // `accent_ui` is a DERIVED chrome tone for themes whose canonical accent has
  // no contrast against the page (WoB's white on black). The canonical accent
  // itself is never altered — it still ships as --accent and --character-*.
  const acc = hexToHsl(u.accent_ui || u.accent);
  const acc2 = hexToHsl(u.accent_secondary);
  const accentHex = u.accent_tertiary || pickDistinctPaletteColor(u.swatches, [acc, acc2], u.accent_secondary);
  const acc3 = hexToHsl(accentHex);
  const primaryPair = keyColorPair(acc);
  const secondaryPair = keyColorPair(acc2);
  const accentPair = keyColorPair(acc3);
  const d = u.dark;

  const t = {
    name: u.name,
    vars: {
      "--primary": primaryPair.fill,
      "--primary-foreground": primaryPair.foreground,
      "--secondary": secondaryPair.fill,
      "--secondary-foreground": secondaryPair.foreground,
      "--accent": accentPair.fill,
      "--accent-foreground": accentPair.foreground,
      "--background": bg,
      "--foreground": fg,
      "--card": d ? nudgeL(u.surface, 5) : nudgeL(u.background, 5),
      "--card-foreground": fg,
      "--popover": d ? nudgeL(u.surface, 5) : nudgeL(u.background, 5),
      "--popover-foreground": fg,
      "--muted": d ? nudgeL(u.surface, 9) : nudgeL(u.background, -5),
      "--muted-foreground": d ? nudgeL(u.foreground, -22) : nudgeL(u.foreground, 24),
      "--border": d ? nudgeL(u.surface, 14) : nudgeL(u.background, -12),
      "--input": d ? nudgeL(u.surface, 14) : nudgeL(u.background, -12),
      "--ring": primaryPair.fill,
    },
    bodyClass: `theme-${key}`,
    swatches: u.swatches,
    flag: u.swatches,
    dark: d,
    // canonical colours for glass edges, rim lights and 3D accents
    character: {
      character_primary: u.accent,
      character_secondary: u.accent_secondary,
      character_highlight: accentHex,
    },
  };

  const roles = ["--role-student", "--role-teacher", "--role-chair", "--role-minutes", "--role-admin", "--role-editor"];
  // keysets are two/three-colour sets: keep each swatch's own hue AND saturation,
  // only move lightness into a legible band. Boosting saturation turned Olivia's
  // pink/cream into red and yellow.
  const usable = balancedPalette(u.swatches).map(keepHueLegible);
  roles.forEach((r, i) => { t.vars[r] = usable[i % usable.length]; });
  // canonical keyset hexes go into --flag-* untouched (only near-greys darkened)
  t.exact = true;
  return t;
}

/* Legible copy of a swatch that never invents a new hue: saturation is left
   alone, lightness is pulled into a band that reads on both light and dark. */
function keepHueLegible(hex) {
  const [h, s, l] = hexToHsl(hex).split(" ").map((v) => parseInt(v));
  if (s < 8) return `${h} 0% ${Math.min(Math.max(l, 22), 45)}%`;
  return `${h} ${s}% ${Math.min(Math.max(l, 34), 54)}%`;
}

export const THEMES = {
  default: {
    name: "MABIS",
    vars: {
      "--primary": "345 67% 35%", "--primary-foreground": "0 0% 100%",
      "--secondary": "44 76% 62%", "--secondary-foreground": "345 67% 20%",
      "--accent": "44 76% 62%", "--accent-foreground": "345 67% 20%",
      "--background": "0 0% 97%", "--foreground": "345 67% 20%",
      "--card": "0 0% 100%", "--card-foreground": "345 67% 20%",
      "--popover": "0 0% 100%", "--popover-foreground": "345 67% 20%",
      "--muted": "0 0% 94%", "--muted-foreground": "345 20% 50%",
      "--border": "345 20% 88%", "--input": "345 20% 88%", "--ring": "345 67% 35%",
      "--role-student": "345 67% 35%",
      "--role-teacher": "165 55% 35%",
      "--role-chair": "44 76% 52%",
      "--role-minutes": "205 60% 42%",
      "--role-admin": "270 55% 45%",
      "--role-editor": "170 50% 38%",
    },
    bodyClass: "theme-default", swatches: ["#951E3A", "#EACE54", "#f4f4f6"], dark: false,
  },

  // ── Pastel 2-color themes ──
  sage:       pastelTheme("sage",       "Sage",       "95 25% 40%",  "20 55% 65%"),
  lavender:   pastelTheme("lavender",   "Lavender",   "265 35% 50%", "45 55% 65%"),
  mint:       pastelTheme("mint",       "Mint",       "160 32% 38%", "5 55% 63%"),
  sky:        pastelTheme("sky",        "Sky",        "205 42% 48%", "340 42% 65%"),
  teal:       pastelTheme("teal",       "Teal",       "175 38% 38%", "15 50% 65%"),
  periwinkle: pastelTheme("periwinkle", "Periwinkle", "240 32% 52%", "25 50% 68%"),
  olive:      pastelTheme("olive",      "Olive",      "85 22% 38%",  "35 45% 65%"),
  ocean:      pastelTheme("ocean",      "Ocean",      "200 42% 42%", "40 42% 68%"),
  rose:       pastelTheme("rose",       "Rose",       "340 35% 45%", "30 40% 70%"),
  coral:      pastelTheme("coral",      "Coral",      "8 45% 48%",   "160 25% 65%"),
  peach:      pastelTheme("peach",      "Peach",      "18 70% 48%",  "200 35% 65%"),
  lilac:      pastelTheme("lilac",      "Lilac",      "280 30% 50%", "40 45% 68%"),
  seafoam:    pastelTheme("seafoam",    "Seafoam",    "155 30% 42%", "15 45% 68%"),
  blush:      pastelTheme("blush",      "Blush",      "345 30% 50%", "150 25% 65%"),
  amber:      pastelTheme("amber",      "Amber",      "32 75% 40%",  "210 35% 65%"),
  plum:       pastelTheme("plum",       "Plum",       "310 28% 42%", "35 40% 68%"),
  denim:      pastelTheme("denim",      "Denim",      "215 35% 45%", "20 40% 68%"),
  berry:      pastelTheme("berry",      "Berry",      "330 35% 40%", "90 20% 65%"),
  sand:       pastelTheme("sand",       "Sand",       "40 35% 45%",  "180 30% 60%"),
  cloud:      pastelTheme("cloud",      "Cloud",      "210 30% 50%", "40 35% 70%"),
  moss:       pastelTheme("moss",       "Moss",       "80 20% 38%",  "30 35% 68%"),
  dusk:       pastelTheme("dusk",       "Dusk",       "260 25% 45%", "30 35% 68%"),
  spring:     pastelTheme("spring",     "Spring",     "120 30% 40%", "50 40% 68%"),
  honey:      pastelTheme("honey",      "Honey",      "38 82% 38%",  "190 30% 62%"),
  clay:       pastelTheme("clay",       "Clay",       "15 35% 45%",  "175 25% 60%"),

  // ── New themes ──
  aurora:    pastelTheme("aurora",    "Aurora",    "280 40% 48%", "180 45% 60%"),
  glacier:   pastelTheme("glacier",   "Glacier",   "190 45% 45%", "210 35% 70%"),
  sunset:    pastelTheme("sunset",    "Sunset",    "15 65% 50%",  "280 40% 65%"),
  forest:    pastelTheme("forest",    "Forest",    "140 35% 35%", "40 45% 65%"),
  midnight:  pastelTheme("midnight",  "Midnight",  "225 50% 40%", "200 40% 62%"),
  ruby:      pastelTheme("ruby",      "Ruby",      "348 70% 40%", "45 65% 60%"),
  emerald:   pastelTheme("emerald",   "Emerald",   "155 55% 38%", "40 50% 62%"),
  indigo:    pastelTheme("indigo",    "Indigo",    "240 40% 45%", "30 45% 65%"),
  twilight:  pastelTheme("twilight",  "Twilight",  "250 35% 48%", "20 40% 68%"),
  copper:    pastelTheme("copper",    "Copper",    "25 55% 42%",  "195 35% 60%"),
  sakura:    pastelTheme("sakura",    "Sakura",    "340 45% 55%", "150 30% 60%"),
  nebula:    pastelTheme("nebula",    "Nebula",    "290 35% 50%", "200 40% 62%"),

  // ── Pride flag palettes ──
  pride:       prideTheme("pride",       "Pride",       "348 97% 42%", "33 100% 42%", ["#E40303","#FF8C00","#FFED00","#008026","#004DFF","#750787"]),
  progress:    prideTheme("progress",    "Progress",    "265 82% 40%", "199 92% 45%", ["#E40303","#FF8C00","#FFED00","#008026","#004DFF","#750787","#5BCEFA","#F5A9B8"]),
  // the old secondary sat at 349° 85% — that read as red, not the flag's pink.
  // Trans now leads with a true flag pink and answers with the flag's sky blue.
  trans:       prideTheme("trans",       "Trans",       "338 72% 52%", "197 85% 48%", ["#5BCEFA","#F5A9B8","#FFFFFF","#F5A9B8","#5BCEFA"]),
  bi:          prideTheme("bi",          "Bisexual",    "324 97% 40%", "220 100% 38%",["#D60270","#9B4F96","#0038A8"]),
  lesbian:     prideTheme("lesbian",     "Lesbian",     "13 100% 40%", "322 92% 36%", ["#D52D00","#FF9A56","#FFFFFF","#D362A4","#A30262"]),
  pan:         prideTheme("pan",         "Pansexual",   "330 100% 44%","199 100% 42%",["#FF218C","#FFD800","#21B1FF"]),
  nonbinary:   prideTheme("nonbinary",   "Nonbinary",   "277 61% 48%", "56 90% 40%",  ["#FCF434","#FFFFFF","#9C59D1","#2C2C2C"]),
  ace:         prideTheme("ace",         "Asexual",     "300 90% 30%", "0 0% 38%",    ["#000000","#A3A3A3","#FFFFFF","#800080"]),
  genderfluid: prideTheme("genderfluid", "Genderfluid", "290 79% 44%", "236 74% 46%", ["#FF75A2","#FFFFFF","#BE18D6","#000000","#333EBD"]),
  agender:     prideTheme("agender",     "Agender",     "0 0% 32%",    "104 45% 45%", ["#000000","#BABABA","#FFFFFF","#B8F483","#FFFFFF","#BABABA","#000000"]),
  aromantic:   prideTheme("aromantic",   "Aromantic",   "104 45% 38%", "0 0% 34%",    ["#3DA542","#A7D379","#FFFFFF","#A9A9A9","#000000"]),
  intersex:    prideTheme("intersex",    "Intersex",    "48 100% 42%", "285 78% 44%", ["#FFD800","#7902AA"]),
  genderqueer: prideTheme("genderqueer", "Genderqueer", "285 45% 48%", "104 60% 36%", ["#B57EDC","#FFFFFF","#4A8123"]),
  polysexual:  prideTheme("polysexual",  "Polysexual",  "327 100% 44%","210 100% 44%",["#F61CB9","#07D569","#1C92F6"]),
  omnisexual:  prideTheme("omnisexual",  "Omnisexual",  "316 90% 44%", "266 70% 44%", ["#FE9ACE","#FF53BF","#20063B","#6B02B0","#8EA3FF"]),
  demisexual:  prideTheme("demisexual",  "Demisexual",  "285 78% 40%", "0 0% 36%",    ["#FFFFFF","#6E0070","#D3D3D3","#000000"]),
  femboy:      prideTheme("femboy",      "Femboy",      "330 72% 50%", "199 78% 45%", ["#5BC8F5","#9EE1F7","#FFFFFF","#F7A8C4","#F26FA8"]),
  twink:       prideTheme("twink",       "Twink",       "340 78% 52%", "48 92% 48%",  ["#F9A8D4","#FFFFFF","#FCE36B","#FFFFFF","#F26FA8"]),

  // ── Linux distro palettes ──
  debian:    distroTheme("debian",    "Debian",     "341 79% 41%", "0 0% 20%",     ["#D70A53","#A80030","#333333","#FFFFFF"]),
  arch:      distroTheme("arch",      "Arch",       "197 79% 44%", "205 12% 27%",  ["#1793D1","#0F94D2","#333F4C","#FFFFFF"]),
  ubuntu:    distroTheme("ubuntu",    "Ubuntu",     "17 84% 47%",  "288 30% 30%",  ["#E95420","#772953","#AEA79F","#FFFFFF"]),
  fedora:    distroTheme("fedora",    "Fedora",     "213 65% 42%", "204 74% 55%",  ["#294172","#3C6EB4","#79DBFF","#FFFFFF"]),
  linuxmint: distroTheme("linuxmint", "Linux Mint", "111 45% 40%", "0 0% 25%",     ["#69B838","#3D8A28","#2E2E2E","#FFFFFF"]),
  manjaro:   distroTheme("manjaro",   "Manjaro",    "160 100% 26%","162 40% 30%",  ["#35BF5C","#00846B","#2C3E45","#FFFFFF"]),
  suse:      distroTheme("suse",      "openSUSE",   "111 44% 38%", "150 30% 30%",  ["#73BA25","#35A155","#173F4F","#FFFFFF"]),
  gentoo:    distroTheme("gentoo",    "Gentoo",     "268 32% 44%", "265 25% 60%",  ["#54487A","#8B7FB5","#DDDAEC","#FFFFFF"]),
  kali:      distroTheme("kali",      "Kali",       "202 100% 42%","210 25% 18%",  ["#367BF0","#00A8E8","#1A2530","#FFFFFF"]),
  popos:     distroTheme("popos",     "Pop!_OS",    "184 79% 40%", "35 92% 52%",   ["#48B9C7","#FFA100","#333846","#FFFFFF"]),
  redhat:    distroTheme("redhat",    "Red Hat",    "358 74% 45%", "0 0% 20%",     ["#EE0000","#A30000","#151515","#FFFFFF"]),
  alpine:    distroTheme("alpine",    "Alpine",     "212 100% 33%","203 89% 45%",  ["#0D597F","#0F97D3","#2C3E50","#FFFFFF"]),
  nixos:     distroTheme("nixos",     "NixOS",      "212 66% 45%", "199 79% 50%",  ["#5277C3","#7EBAE4","#293845","#FFFFFF"]),
  elementary:distroTheme("elementary","elementary", "203 74% 42%", "38 90% 52%",   ["#2A97CD","#F9C440","#333333","#FFFFFF"]),

  // ── Nintendo consoles, retro → modern ──
  famicom:   consoleTheme("famicom",   "Famicom",      "353 72% 45%", "35 70% 55%",  ["#C6273C","#E8C88C","#8B1E2D","#FFFFFF"]),
  nes:       consoleTheme("nes",       "NES",          "0 0% 28%",    "353 72% 45%", ["#3C3C3C","#B8B4A8","#C6273C","#E6E2D8"]),
  gameboy:   consoleTheme("gameboy",   "Game Boy",     "104 33% 34%", "80 32% 45%",  ["#0F380F","#306230","#8BAC0F","#9BBC0F"]),
  snes:      consoleTheme("snes",      "Super NES",    "265 45% 48%", "0 0% 40%",    ["#7B68B6","#544C9B","#B5B5C4","#605F63"]),
  n64:       consoleTheme("n64",       "Nintendo 64",  "215 62% 42%", "88 60% 40%",  ["#2B63B0","#E4A93C","#5FA130","#CB3B3B"]),
  gamecube:  consoleTheme("gamecube",  "GameCube",     "265 52% 46%", "180 45% 45%", ["#6A4FBB","#3EB6B6","#2E2A45","#E4E2ED"]),
  gba:       consoleTheme("gba",       "Game Boy Adv", "265 60% 50%", "195 70% 48%", ["#5C3FCB","#28A9D6","#B7A9F0","#E9E6F5"]),
  ds:        consoleTheme("ds",        "Nintendo DS",  "0 0% 35%",    "205 65% 48%", ["#4A4A4A","#2E8FCF","#C9C9C9","#FFFFFF"]),
  wii:       consoleTheme("wii",       "Wii",          "197 70% 45%", "0 0% 45%",    ["#22A5D6","#E9EDF0","#8A8F96","#FFFFFF"]),
  threeds:   consoleTheme("threeds",   "Nintendo 3DS", "349 72% 48%", "197 70% 46%", ["#D62B4C","#22A0CE","#2C2C2C","#F2F2F2"]),
  wiiu:      consoleTheme("wiiu",      "Wii U",        "197 62% 42%", "150 45% 42%", ["#1E88B0","#38B08A","#5A6570","#EFF3F5"]),
  switch:    consoleTheme("switch",    "Switch",       "8 88% 50%",   "197 88% 45%", ["#EE2C21","#00C3E3","#414548","#FFFFFF"]),

  // ── Touhou character colourways ──
  reimu:     touhouTheme("reimu",     "Reimu",      "353 78% 46%", "0 0% 30%",    ["#D9304E","#FFFFFF","#2B2B2B","#E8B7C0"]),
  marisa:    touhouTheme("marisa",    "Marisa",     "45 92% 45%",  "0 0% 24%",    ["#F2C230","#1E1E1E","#FFFFFF","#C99A2E"]),
  sakuya:    touhouTheme("sakuya",    "Sakuya",     "210 30% 42%", "205 55% 55%", ["#5A6B80","#C9D6E3","#FFFFFF","#2E3947"]),
  remilia:   touhouTheme("remilia",   "Remilia",    "255 45% 48%",  "340 70% 55%", ["#6C5BC4","#F06A9B","#2A2140","#E4DFF5"]),
  flandre:   touhouTheme("flandre",   "Flandre",    "0 78% 48%",   "48 90% 50%",  ["#D42A2A","#F2C230","#FFF3D6","#7A1B1B"]),
  youmu:     touhouTheme("youmu",     "Youmu",      "150 32% 42%", "0 0% 40%",    ["#4E9070","#E9F0EA","#3A4A44","#B9CFC2"]),
  yuyuko:    touhouTheme("yuyuko",    "Yuyuko",     "330 45% 55%", "195 40% 55%", ["#E88BB4","#A9D8E0","#6E5A8C","#FDEFF4"]),
  koishi:    touhouTheme("koishi",    "Koishi",     "150 45% 42%", "45 65% 55%",  ["#3FA86F","#F0D264","#2E5E45","#E6F2E8"]),
  satori:    touhouTheme("satori",    "Satori",     "285 40% 50%", "330 55% 58%", ["#9B5DB8","#E877AC","#3A2A46","#EFE3F2"]),
  sanae:     touhouTheme("sanae",     "Sanae",      "150 42% 44%", "215 55% 52%", ["#46A177","#3C74C6","#FFFFFF","#DDEBE3"]),
  cirno:     touhouTheme("cirno",     "Cirno",      "199 78% 48%", "220 45% 55%", ["#3EB0E3","#0F4C81","#FFFFFF","#BFE6F7"]),
  yukari:    touhouTheme("yukari",    "Yukari",     "275 42% 48%", "48 70% 55%",  ["#8A5EC0","#F0D264","#3B2C55","#EFE6F7"]),
  patchouli: touhouTheme("patchouli", "Patchouli",  "285 35% 48%", "45 60% 55%",  ["#9A6BB8","#EBD98A","#4A3560","#F3ECF6"]),
  aya:       touhouTheme("aya",       "Aya",        "0 0% 28%",    "10 75% 50%",  ["#3A3A3A","#D9522E","#FFFFFF","#B03A20"]),

  // ── Sonic character colourways ──
  sonic:     sonicTheme("sonic",     "Sonic",      "215 85% 45%", "20 85% 50%",  ["#1F6FD0","#0B2E6B","#E88B36","#FFFFFF"]),
  tails:     sonicTheme("tails",     "Tails",      "30 90% 48%",  "205 75% 50%", ["#EE8A22","#FFFFFF","#2E9BD6","#8A4B12"]),
  knuckles:  sonicTheme("knuckles",  "Knuckles",   "355 72% 45%", "45 80% 50%",  ["#C7202F","#F0C93B","#FFFFFF","#7A1420"]),
  amy:       sonicTheme("amy",       "Amy",        "335 75% 52%", "0 78% 48%",   ["#E5479B","#D4283C","#FFFFFF","#8C2158"]),
  shadow:    sonicTheme("shadow",    "Shadow",     "0 0% 22%",    "355 80% 48%", ["#2B2B2B","#D42A3C","#F2F2F2","#8E1B26"]),
  eggman:    sonicTheme("eggman",    "Eggman",     "355 70% 45%", "35 80% 50%",  ["#C42A33","#E0A32C","#3A3A3A","#F0E6D2"]),
  silver:    sonicTheme("silver",    "Silver",     "185 45% 45%", "150 40% 48%", ["#4FA6AE","#CFD6DA","#3C8A6E","#FFFFFF"]),
  rouge:     sonicTheme("rouge",     "Rouge",      "330 55% 45%", "285 40% 48%", ["#B8397A","#7A4499","#FFFFFF","#2E1F33"]),

  // ── BFDI object colourways (canonical palettes, see lib/bfdi_palettes.js) ──
  firey:     bfdiTheme("firey"),
  leafy:     bfdiTheme("leafy"),
  bubble:    bfdiTheme("bubble"),
  pencil:    bfdiTheme("pencil"),
  match:     bfdiTheme("match"),
  blocky:    bfdiTheme("blocky"),
  four:      bfdiTheme("four"),
  x:         bfdiTheme("x"),
  icecube:   bfdiTheme("icecube"),
  flower:    bfdiTheme("flower"),
  coiny:     bfdiTheme("coiny"),
  gelatin:   bfdiTheme("gelatin"),
  eraser:    bfdiTheme("eraser"),
  pin:       bfdiTheme("pin"),
  book:      bfdiTheme("book"),

  // ── GMK keyset colourways (canonical web hexes, see lib/gmk_palettes.js) ──
  gmk_olivia:      gmkTheme("olivia"),
  gmk_olivia_dark: gmkTheme("olivia_dark"),
  gmk_red_alert:   gmkTheme("red_alert"),
  gmk_8008:        gmkTheme("gmk_8008"),
  gmk_hyperfuse:   gmkTheme("hyperfuse"),
  gmk_darling:     gmkTheme("darling"),
  gmk_metropolis:  gmkTheme("metropolis"),
  gmk_shinseiki:   gmkTheme("shinseiki"),
  gmk_nord:        gmkTheme("nord"),
  gmk_camping:     gmkTheme("camping"),
  gmk_wob:         gmkTheme("wob"),
  gmk_monochrome:  gmkTheme("monochrome"),
  gmk_prussian:    gmkTheme("prussian_alert"),
};

/* The Pride palettes are the app's flagship collection: they are art-directed in
   OKLCh with their own lighting geometry, light AND dark treatments and cursor
   materials (see lib/pride.js), and replace the earlier three-variable versions. */
Object.assign(THEMES, PRIDE_THEMES);

function readableSurfaceTokens(vars) {
  return {
    "--foreground": contrastSafeInk(vars["--foreground"], vars["--background"], { fallback: vars["--foreground"] }),
    "--card-foreground": contrastSafeInk(vars["--card-foreground"], vars["--card"], { fallback: vars["--foreground"] }),
    "--popover-foreground": contrastSafeInk(vars["--popover-foreground"], vars["--popover"], { fallback: vars["--foreground"] }),
    "--muted-foreground": contrastSafeInk(vars["--muted-foreground"], vars["--muted"], { fallback: vars["--foreground"] }),
  };
}

function editorThemeTokens(vars) {
  const surface = vars["--card"];
  const fallback = vars["--card-foreground"];
  return {
    "--editor-ink-default": contrastSafeInk(fallback, surface, { fallback }),
    "--editor-ink-primary": contrastSafeInk(vars["--primary"], surface, { fallback }),
    "--editor-ink-secondary": contrastSafeInk(vars["--secondary"], surface, { fallback }),
    "--editor-ink-accent": contrastSafeInk(vars["--accent"], surface, { fallback }),
    "--editor-highlight-primary": vars["--primary"],
    "--editor-highlight-primary-foreground": vars["--primary-foreground"],
    "--editor-highlight-secondary": vars["--secondary"],
    "--editor-highlight-secondary-foreground": vars["--secondary-foreground"],
    "--editor-highlight-accent": vars["--accent"],
    "--editor-highlight-accent-foreground": vars["--accent-foreground"],
  };
}

export function resolveThemeVars(themeVars) {
  const vars = { ...themeVars };
  Object.assign(vars, readableSurfaceTokens(vars));
  Object.assign(vars, editorThemeTokens(vars));
  return vars;
}

// Multi-colour themes (pride flags, presets) carry more colours than the two the
// UI tokens can hold. Expose the whole set so accents can use the full palette.
function applyPalette(colors, exact = false) {
  const root = document.documentElement;
  const list = colors.filter(Boolean);
  // Semantic accent slots use each distinct usable hue fairly. The canonical
  // list below still paints official stripes and previews without reordering.
  const semantic = balancedPalette(list);
  const accents = spreadBalancedPalette(list, 8).map((c) => {
    if (!c.startsWith("#")) return c;
    if (!exact) return readableHex(c);
    return parseInt(hexToHsl(c).split(" ")[1]) < 8 ? readableHex(c) : c;
  });
  accents.forEach((accent, i) => root.style.setProperty(`--flag-${i + 1}`, accent));
  root.style.setProperty("--palette-count", String(list.length));
  root.style.setProperty("--palette-accent-count", String(semantic.length));
  const stops = list.map((c, i) => `${c} ${(i / list.length) * 100}% ${((i + 1) / list.length) * 100}%`);
  root.style.setProperty("--palette-stripes", `linear-gradient(90deg, ${stops.join(", ")})`);
  root.style.setProperty("--palette-gradient", `linear-gradient(90deg, ${list.join(", ")})`);
}

/* Canonical character colours are published as their own tokens so glass edges,
   3D lighting and previews can use the real character colour while the general
   UI keeps working off the derived theme tokens. */
function applyCharacterTokens(character) {
  const root = document.documentElement;
  const keys = ["primary", "secondary", "highlight", "shade", "outline", "blue_dark", "special"];
  keys.forEach((k) => {
    const v = character?.[`character_${k}`];
    if (v) root.style.setProperty(`--character-${k}`, v);
    else root.style.removeProperty(`--character-${k}`);
  });
  if (character) {
    root.style.setProperty("--glass-edge", `${character.character_highlight}59`);
    root.style.setProperty("--rim-light", character.character_primary);
    // secondary refraction tint — keeps the glass optical, not opaque
    root.style.setProperty("--glass-tint-2", `${character.character_secondary}33`);
  } else {
    root.style.removeProperty("--glass-edge");
    root.style.removeProperty("--rim-light");
    root.style.removeProperty("--glass-tint-2");
  }
}

let themeCommitFrame = 0;
let themeCommitReleaseFrame = 0;

function beginThemeCommit() {
  const root = document.documentElement;
  root.classList.add("theme-committing");

  cancelAnimationFrame(themeCommitFrame);
  cancelAnimationFrame(themeCommitReleaseFrame);
  themeCommitFrame = requestAnimationFrame(() => {
    themeCommitFrame = 0;
    themeCommitReleaseFrame = requestAnimationFrame(() => {
      root.classList.remove("theme-committing");
      themeCommitReleaseFrame = 0;
    });
  });
}

function applyThemeBodyClass(bodyClass) {
  const body = document.body;
  const previousBodyClass = body.dataset.mabisThemeClass;

  if (previousBodyClass && previousBodyClass !== bodyClass) {
    body.classList.remove(previousBodyClass);
  }
  if (bodyClass && previousBodyClass !== bodyClass) {
    body.classList.add(bodyClass);
    body.dataset.mabisThemeClass = bodyClass;
  }
}

export function applyTheme(themeKey) {
  const resolvedThemeKey = THEMES[themeKey] ? themeKey : "default";
  const theme = THEMES[resolvedThemeKey];
  const root = document.documentElement;

  const vars = resolveThemeVars(theme.vars);
  const isDark = !!theme.dark;

  // A theme is a discrete preference change. Hold ordinary CSS transitions for
  // one painted frame so hundreds of surfaces do not animate paint-heavy colour,
  // shadow and blur changes independently.
  beginThemeCommit();

  Object.entries(vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  document.body.classList.toggle("pride-active", !!theme.pride);
  if (theme.pride) {
    Object.entries(prideTokens(theme, isDark)).forEach(([k, v]) => root.style.setProperty(k, v));
  } else {
    ["--pride-glow", "--pride-edge", "--pride-highlight"].forEach((k) => root.style.removeProperty(k));
  }
  // Editorial ink always stays the darker theme surface and bone the lighter
  // text/paper tone. Dark keysets reverse foreground/background, so preserve
  // those visual roles instead of accidentally turning the menu cream-on-dark.
  root.style.setProperty("--ink", isDark ? vars["--background"] : vars["--foreground"]);
  root.style.setProperty("--bone", isDark ? vars["--foreground"] : vars["--background"]);
  // --destructive was the last fixed red in the app: shadcn destructive buttons,
  // badges and alerts all read it, so every theme kept a red no matter its palette.
  root.style.setProperty("--destructive", vars["--primary"]);
  root.style.setProperty("--destructive-foreground", vars["--primary-foreground"]);
  document.body.classList.toggle("theme-is-dark", isDark);
  applyPalette(theme.swatches, !!theme.pride || !!theme.exact);
  applyCharacterTokens(theme.character);
  applyThemeBodyClass(theme.bodyClass);
  localStorage.setItem("mabis-theme", resolvedThemeKey);
  window.dispatchEvent(new Event("themeChanged"));
}

// Convert hex (#RRGGBB) to "H S% L%" string
export function hexToHsl(hex) {
  hex = hex.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)); break;
      case g: h = ((b - r) / d + 2); break;
      case b: h = ((r - g) / d + 4); break;
    }
    h *= 60;
  }
  return `${Math.round(h)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

// Convert "H S% L%" to hex
export function hslToHex(hslStr) {
  const parts = hslStr.split(" ");
  const h = parseInt(parts[0]) / 360;
  const s = parseInt(parts[1]) / 100;
  const l = parseInt(parts[2].replace("%", "")) / 100;
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  const toHex = (x) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function applyCustomColors(primaryHex, secondaryHex) {
  const root = document.documentElement;
  const current = getComputedStyle(root);
  const primaryPair = keyColorPair(hexToHsl(primaryHex));
  const secondaryPair = keyColorPair(hexToHsl(secondaryHex));
  const customVars = {
    "--primary": primaryPair.fill,
    "--primary-foreground": primaryPair.foreground,
    "--secondary": secondaryPair.fill,
    "--secondary-foreground": secondaryPair.foreground,
    "--accent": secondaryPair.fill,
    "--accent-foreground": secondaryPair.foreground,
    "--background": current.getPropertyValue("--background").trim(),
    "--foreground": current.getPropertyValue("--foreground").trim(),
    "--card": current.getPropertyValue("--card").trim(),
    "--card-foreground": current.getPropertyValue("--card-foreground").trim(),
    "--popover": current.getPropertyValue("--popover").trim(),
    "--popover-foreground": current.getPropertyValue("--popover-foreground").trim(),
    "--muted": current.getPropertyValue("--muted").trim(),
    "--muted-foreground": current.getPropertyValue("--muted-foreground").trim(),
  };
  Object.assign(customVars, readableSurfaceTokens(customVars));
  Object.assign(customVars, editorThemeTokens(customVars));

  beginThemeCommit();
  Object.entries(customVars).forEach(([key, value]) => root.style.setProperty(key, value));
  root.style.setProperty("--ring", primaryPair.fill);
  root.style.setProperty("--destructive", primaryPair.fill);
  root.style.setProperty("--destructive-foreground", primaryPair.foreground);
  applyPalette([primaryHex, secondaryHex]);
  localStorage.setItem("mabis-custom-colors", JSON.stringify({ primary: primaryHex, secondary: secondaryHex }));
  window.dispatchEvent(new Event("themeChanged"));
}

export function clearCustomColors({ notify = true } = {}) {
  localStorage.removeItem("mabis-custom-colors");
  if (notify) window.dispatchEvent(new Event("themeChanged"));
}

export function getStoredTheme() {
  return localStorage.getItem("mabis-theme") || "default";
}

export function getStoredCustomColors() {
  const stored = localStorage.getItem("mabis-custom-colors");
  if (!stored) return null;
  try { return JSON.parse(stored); } catch { return null; }
}

// ── Saved custom themes (user-named) ──
export function getSavedThemes() {
  const stored = localStorage.getItem("mabis-saved-themes");
  if (!stored) return [];
  try { return JSON.parse(stored); } catch { return []; }
}

export function saveCustomTheme(name, primaryHex, secondaryHex) {
  const themes = getSavedThemes();
  const idx = themes.findIndex(t => t.name === name);
  const entry = { name, primary: primaryHex, secondary: secondaryHex };
  if (idx >= 0) themes[idx] = entry;
  else themes.push(entry);
  localStorage.setItem("mabis-saved-themes", JSON.stringify(themes));
  return themes;
}

export function deleteSavedTheme(name) {
  const themes = getSavedThemes().filter(t => t.name !== name);
  localStorage.setItem("mabis-saved-themes", JSON.stringify(themes));
  return themes;
}

// ── Fonts ──
// Commercial families are never redistributed: they resolve to a user's own
// licensed local copy. GNU FreeMono is the embedded default; GNU FreeSerif,
// Torrefarfan, Go, Iosevka, Lilex and the libre catalogue remain selectable.
// GNU FreeMono remains the default and every selectable face falls back through
// the embedded GNU FreeFont families. Maple Mono handles explicitly marked
// Chinese, Japanese, and Korean text; GNU FreeSerif remains isolated to Thai.
export const FONT_PREVIEW_TEXT = "Montessori Acadamy Bangkok International School";

const REQUESTED_FONTS = [
  {
    key: "gnu-free-mono",
    name: "GNU FreeMono",
    detail: "Default and universal fallback · embedded GNU FreeFont mono",
    source: "Featured",
    family: "GNUFreeMonoUI",
    heading: "'GNUFreeMonoUI'",
    body: "'GNUFreeMonoUI'",
    mono: "'GNUFreeMonoUI'",
    localOnly: false,
    featured: true,
  },
  {
    key: "torrefarfan",
    name: "Torrefarfan",
    detail: "Embedded editorial serif from Libre Fonts by Womxn",
    source: "Featured",
    family: "torrefarfan",
    heading: "'torrefarfan'",
    body: "'torrefarfan'",
    mono: "'torrefarfan'",
    localOnly: false,
    featured: true,
  },
  {
    key: "go",
    name: "Go",
    detail: "Embedded Go typeface with Go Mono for technical labels",
    source: "Featured",
    family: "GoUI",
    heading: "'GoUI'",
    body: "'GoUI'",
    mono: "'GoMonoUI'",
    localOnly: false,
    featured: true,
  },
  {
    key: "gnu-free-sans",
    name: "GNU FreeSans",
    detail: "Embedded GNU FreeFont sans-serif family",
    source: "Featured",
    family: "GNUFreeSansUI",
    heading: "'GNUFreeSansUI'",
    body: "'GNUFreeSansUI'",
    mono: "'GNUFreeMonoUI'",
    localOnly: false,
    featured: true,
  },
  {
    key: "gnu-free-serif",
    name: "GNU FreeSerif",
    detail: "Embedded GNU FreeFont serif family",
    source: "Featured",
    family: "GNUFreeSerifUI",
    heading: "'GNUFreeSerifUI'",
    body: "'GNUFreeSerifUI'",
    mono: "'GNUFreeSerifUI'",
    localOnly: false,
    featured: true,
  },
  {
    key: "transgender-grotesk",
    name: "Transgender Grotesk",
    detail: "Licensed/local face · Go fallback",
    source: "Featured",
    family: "TransgenderGroteskUI",
    heading: "'TransgenderGroteskUI', 'GoUI'",
    body: "'TransgenderGroteskUI', 'GoUI'",
    mono: "'TransgenderGroteskUI', 'GoMonoUI'",
    localOnly: true,
    featured: true,
  },
  {
    key: "atlas-mono",
    name: "Atlas Mono",
    detail: "Licensed/local face · Go Mono fallback",
    source: "Featured",
    family: "AtlasMonoUI",
    heading: "'AtlasMonoUI', 'GoMonoUI'",
    body: "'AtlasMonoUI', 'GoMonoUI'",
    mono: "'AtlasMonoUI', 'GoMonoUI'",
    localOnly: true,
    featured: true,
  },
  {
    key: "iosevka",
    name: "Iosevka",
    detail: "Embedded OFL · requested coding/editorial mono",
    source: "Featured",
    family: "IosevkaUI",
    heading: "'IosevkaUI'",
    body: "'IosevkaUI'",
    mono: "'IosevkaUI'",
    localOnly: false,
    featured: true,
  },
  {
    key: "lilex",
    name: "Lilex",
    detail: "Embedded OFL · requested programming mono",
    source: "Featured",
    family: "LilexUI",
    heading: "'LilexUI'",
    body: "'LilexUI'",
    mono: "'LilexUI'",
    localOnly: false,
    featured: true,
  },
  {
    key: "unifontex",
    name: "UnifontEX",
    detail: "Embedded multilingual · English 日本語 中文 ไทย",
    source: "Featured",
    family: "UnifontEX",
    heading: "'UnifontEX'",
    body: "'UnifontEX'",
    mono: "'UnifontEX'",
    localOnly: false,
    featured: true,
  },
];

// Keep the large optional font catalogue out of the critical entry chunk. The
// Settings surface imports it with its own lazy chunk, while a saved catalogue
// choice is resolved only when that specific font is needed.
export const CORE_FONTS = REQUESTED_FONTS;

export const FONT_LIBRARIES = [
  { key: "featured", name: "Featured", detail: `${REQUESTED_FONTS.length} requested fonts` },
  { key: "by-womxn", name: "Libre Fonts by Womxn", detail: "Embedded libre webfonts · loaded on demand", url: "https://gitlab.com/lfurter/by-womxn" },
  { key: "flintype", name: "FLINT*ype", detail: "FLINTA* discovery archive. Its current site is moving, so indexed commercial fonts are not mirrored without their licences.", url: "https://flintype.com/" },
];

function withGnuFallbacks(primary, generic = "monospace") {
  const selectedFamilies = primary.split(",").map((family) => family.trim()).filter(Boolean);
  const requiredFallbacks = [
    "'GNUFreeMonoUI'",
    "'GNUFreeSansUI'",
    "'GNUFreeSerifUI'",
    "'GNUFreeSerifThai'",
    generic,
  ];
  return [...new Set([...selectedFamilies, ...requiredFallbacks])].join(", ");
}

function applyResolvedFont(font) {
  const root = document.documentElement;
  const thaiFallback = "'GNUFreeSerifThai', 'GNUFreeSerifUI', serif";
  const cjkFallback = "'Maple Mono NF CN', 'Maple Mono CN', 'Maple Mono', 'GNUFreeMonoUI', 'GNUFreeSansUI', 'GNUFreeSerifUI', monospace";
  const headingStack = withGnuFallbacks(font.heading);
  const bodyStack = withGnuFallbacks(font.body);
  const monoStack = withGnuFallbacks(font.mono);
  root.style.setProperty("--font-heading", headingStack);
  root.style.setProperty("--font-body", bodyStack);
  root.style.setProperty("--font-display", headingStack);
  root.style.setProperty("--font-mono", monoStack);
  root.style.setProperty("--font-cjk", cjkFallback);
  root.style.setProperty("--font-multilingual", cjkFallback);
  root.style.setProperty("--font-thai", thaiFallback);
  root.dataset.uiFont = font.key;
  if (document.body) document.body.style.fontFamily = bodyStack;

  let loadPromise = Promise.resolve([]);
  if (document.fonts) {
    const bodyLoad = document.fonts.load(`400 16px ${bodyStack}`, FONT_PREVIEW_TEXT);
    const headingLoad = document.fonts.load(`700 16px ${headingStack}`, FONT_PREVIEW_TEXT);
    const monoLoad = document.fonts.load(`400 16px ${monoStack}`, "MABIS 0123456789");
    // The Thai fallback has a unicode-range and is loaded by the browser only
    // when Thai is present. Eagerly requesting it added 1.3 MB to English loads.
    loadPromise = Promise.all([bodyLoad, headingLoad, monoLoad]).then((loaded) => {
      if (root.dataset.uiFont === font.key) {
        root.dataset.uiFontLoaded = font.key;
        window.dispatchEvent(new CustomEvent("fontRendered", { detail: { key: font.key } }));
      }
      return loaded;
    }).catch(() => []);
  }

  localStorage.setItem("mabis-font", font.key);
  window.dispatchEvent(new CustomEvent("fontChanged", { detail: { key: font.key } }));
  window.dispatchEvent(new Event("themeChanged"));
  return loadPromise;
}

export function applyFont(key) {
  const coreFont = CORE_FONTS.find((font) => font.key === key);
  if (coreFont) return applyResolvedFont(coreFont);

  if (/^byw-[a-z0-9-]+$/.test(key || "")) {
    return import("@/lib/font-catalog").then(async ({ ensureFontCatalogStyles, findCatalogFont }) => {
      const font = findCatalogFont(key);
      if (!font) return applyResolvedFont(CORE_FONTS[0]);
      await ensureFontCatalogStyles();
      return applyResolvedFont(font);
    });
  }

  return applyResolvedFont(CORE_FONTS[0]);
}

export function getStoredFont() {
  const migration = localStorage.getItem("mabis-font-default-version");
  if (migration !== "gnu-free-mono-v2") {
    const now = String(Date.now());
    localStorage.setItem("mabis-font-default-version", "gnu-free-mono-v2");
    localStorage.setItem("mabis-font-picker-version", "8");
    localStorage.setItem("mabis-font-updated-at", now);
    localStorage.setItem("mabis-font", "gnu-free-mono");
    return "gnu-free-mono";
  }

  const stored = localStorage.getItem("mabis-font");
  const isCoreFont = CORE_FONTS.some((font) => font.key === stored);
  const isCatalogueFont = /^byw-[a-z0-9-]+$/.test(stored || "");
  return isCoreFont || isCatalogueFont ? stored : "gnu-free-mono";
}