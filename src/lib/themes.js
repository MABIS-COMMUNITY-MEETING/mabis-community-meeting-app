// Theme definitions for MABIS platform
// MABIS Default is the original maroon + gold theme
// Pastel themes use 2 harmonious pastel colors + white background

function pastelTheme(key, name, p, s) {
  // Derive role colors from primary hue
  const shift = (hslStr, deg, lAdj = 0) => {
    const [h, sat, lRaw] = hslStr.split(" ");
    const newH = (parseInt(h) + deg + 360) % 360;
    const newL = Math.max(32, Math.min(48, parseInt(lRaw) + lAdj));
    return `${newH} ${sat} ${newL}%`;
  };
  // Very light background tint from primary hue
  const [pH] = p.split(" ");
  const bg = `${pH} 25% 97%`;

  return {
    name,
    vars: {
      "--primary": p,
      "--primary-foreground": "0 0% 100%",
      "--secondary": s,
      "--secondary-foreground": "30 15% 25%",
      "--accent": s,
      "--accent-foreground": "30 15% 25%",
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
      "--ring": p,
      "--role-student": p,
      "--role-teacher": shift(p, 180),
      "--role-chair": s,
      "--role-minutes": shift(p, 45),
      "--role-admin": "270 45% 45%",
      "--role-editor": shift(p, 120),
    },
    bodyClass: `theme-${key}`,
    swatches: [`hsl(${p})`, `hsl(${s})`, "#ffffff"],
    dark: false,
  };
}

// Text colour that actually reads on a given "H S% L%" fill.
function onColor(hsl) {
  const [h, s, l] = hsl.split(" ").map((v) => parseInt(v));
  return l > 58 ? `${h} ${Math.min(s, 40)}% 14%` : "0 0% 100%";
}

// Pride flag theme: primary/secondary drive the UI; swatches show the full flag.
function prideTheme(key, name, p, s, flagHexes) {
  const t = pastelTheme(key, name, p, s);
  t.swatches = flagHexes;
  t.flag = flagHexes;
  const [pH] = p.split(" ");
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
  t.vars["--primary-foreground"] = onColor(p);
  t.vars["--secondary-foreground"] = onColor(s);
  t.vars["--accent-foreground"] = onColor(s);

  // Roles pull from the flag, but only from its distinct hues — flags repeat
  // stripes and carry white/black, which would otherwise hand several roles the
  // same graphite badge.
  const roles = ["--role-student", "--role-teacher", "--role-chair", "--role-minutes", "--role-admin", "--role-editor"];
  const seen = new Set();
  const usable = [];
  const byVividness = flagHexes
    .map(readableHex)
    .sort((a, b) => parseInt(hexToHsl(b).split(" ")[1]) - parseInt(hexToHsl(a).split(" ")[1]));
  byVividness.forEach((hex) => {
    const hsl = hexToHsl(hex);
    const bucket = Math.round(parseInt(hsl.split(" ")[0]) / 24);
    if (seen.has(bucket)) return;
    seen.add(bucket);
    usable.push(hsl);
  });
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
  trans:       prideTheme("trans",       "Trans",       "197 90% 42%", "349 85% 55%", ["#5BCEFA","#F5A9B8","#FFFFFF","#F5A9B8","#5BCEFA"]),
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
};

// Multi-colour themes (pride flags, presets) carry more colours than the two the
// UI tokens can hold. Expose the whole set so accents can use the full palette.
function applyPalette(colors) {
  const root = document.documentElement;
  const list = colors.filter(Boolean);
  // accents get the legible copy, the stripe below keeps the true flag
  const accents = list.map((c) => (c.startsWith("#") ? readableHex(c) : c));
  for (let i = 0; i < 8; i++) {
    root.style.setProperty(`--flag-${i + 1}`, accents[i % accents.length]);
  }
  root.style.setProperty("--palette-count", String(list.length));
  const stops = list.map((c, i) => `${c} ${(i / list.length) * 100}% ${((i + 1) / list.length) * 100}%`);
  root.style.setProperty("--palette-stripes", `linear-gradient(90deg, ${stops.join(", ")})`);
  root.style.setProperty("--palette-gradient", `linear-gradient(90deg, ${list.join(", ")})`);
}

export function applyTheme(themeKey) {
  const theme = THEMES[themeKey] || THEMES.default;
  const root = document.documentElement;
  Object.entries(theme.vars).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
  // The editorial layer paints panels/labels with --ink and --bone. Themes never
  // set them, so every theme was drawing on the original maroon/bone pair — that
  // was the clash. Tie them to the theme's own foreground/background instead.
  root.style.setProperty("--ink", theme.vars["--foreground"]);
  root.style.setProperty("--bone", theme.vars["--background"]);
  applyPalette(theme.swatches);
  Object.values(THEMES).forEach(t => document.body.classList.remove(t.bodyClass));
  document.body.classList.add(theme.bodyClass);
  localStorage.setItem("mabis-theme", themeKey);
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
  root.style.setProperty("--primary", hexToHsl(primaryHex));
  root.style.setProperty("--secondary", hexToHsl(secondaryHex));
  root.style.setProperty("--accent", hexToHsl(secondaryHex));
  root.style.setProperty("--ring", hexToHsl(primaryHex));
  applyPalette([primaryHex, secondaryHex]);
  localStorage.setItem("mabis-custom-colors", JSON.stringify({ primary: primaryHex, secondary: secondaryHex }));
  window.dispatchEvent(new Event("themeChanged"));
}

export function clearCustomColors() {
  localStorage.removeItem("mabis-custom-colors");
  window.dispatchEvent(new Event("themeChanged"));
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
export const FONTS = [
  { key: "default",   name: "Space Grotesk", heading: "'Space Grotesk', sans-serif", body: "'Inter', sans-serif" },
  { key: "inter",     name: "Inter",         heading: "'Inter', sans-serif",         body: "'Inter', sans-serif" },
  { key: "poppins",   name: "Poppins",      heading: "'Poppins', sans-serif",       body: "'Poppins', sans-serif" },
  { key: "montserrat",name: "Montserrat",   heading: "'Montserrat', sans-serif",    body: "'Montserrat', sans-serif" },
  { key: "nunito",    name: "Nunito",       heading: "'Nunito', sans-serif",        body: "'Nunito', sans-serif" },
  { key: "lato",      name: "Lato",         heading: "'Lato', sans-serif",          body: "'Lato', sans-serif" },
  { key: "raleway",   name: "Raleway",      heading: "'Raleway', sans-serif",       body: "'Raleway', sans-serif" },
  { key: "dmsans",    name: "DM Sans",      heading: "'DM Sans', sans-serif",       body: "'DM Sans', sans-serif" },
  { key: "manrope",   name: "Manrope",      heading: "'Manrope', sans-serif",       body: "'Manrope', sans-serif" },
  { key: "alegreya",  name: "Alegreya",     heading: "'Alegreya', serif",            body: "'Alegreya', serif" },
];

export function applyFont(key) {
  const font = FONTS.find(f => f.key === key) || FONTS[0];
  const root = document.documentElement;
  root.style.setProperty("--font-heading", font.heading);
  root.style.setProperty("--font-body", font.body);
  root.style.setProperty("--font-display", font.heading);
  localStorage.setItem("mabis-font", key);
  window.dispatchEvent(new Event("themeChanged"));
}

export function getStoredFont() {
  return localStorage.getItem("mabis-font") || "default";
}