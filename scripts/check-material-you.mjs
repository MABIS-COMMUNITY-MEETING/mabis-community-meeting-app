import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createServer } from "vite";
import { hctFromRgb, hexFromHct } from "../src/lib/color/hct.js";

const INVERSE_HCT_DIGEST = "cafe4191d00c919b7dbbb52d060e6d5c760ccbf71cd0863e6c7e03ebf4f90f2b";
const FORWARD_HCT_DIGEST = "cdf853d1645904bcf1f1d74a063a061931af7d5e385215d5dac5dc3a2818dc27";

function digest(rows) {
  return crypto.createHash("sha256").update(rows.join("\n")).digest("hex");
}

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

function assertObject(label, actual, expected) {
  assertEqual(label, JSON.stringify(actual), JSON.stringify(expected));
}

const inverseRows = [];
const hues = Array.from({ length: 24 }, (_, index) => index * 15);
const chromas = [0.1, 1, 5, 16, 26, 32, 36, 48, 60, 84, 120, 200];
const tones = [0, 1, 4, 6, 10, 17, 20, 30, 40, 49, 50, 60, 70, 80, 90, 92, 96, 98, 99, 100];

for (const hue of hues) {
  for (const chroma of chromas) {
    for (const tone of tones) {
      inverseRows.push(`${hue},${chroma},${tone}=${hexFromHct(hue, chroma, tone)}`);
    }
  }
}
assertEqual("HCT inverse reference digest", digest(inverseRows), INVERSE_HCT_DIGEST);

const forwardRows = [];
const channels = [0, 1, 15, 31, 63, 95, 127, 159, 191, 223, 254, 255];

for (const red of channels) {
  for (const green of channels) {
    for (const blue of channels) {
      const hct = hctFromRgb([red, green, blue]);
      forwardRows.push(
        `${red},${green},${blue}=${hct.hue.toFixed(8)},${hct.chroma.toFixed(8)},${hct.tone.toFixed(8)}`,
      );
    }
  }
}
assertEqual("RGB to HCT reference digest", digest(forwardRows), FORWARD_HCT_DIGEST);

const schemeFixtures = [
  {
    seed: "#4181ee",
    dark: false,
    colors: {
      "--primary": "#4a5f8b",
      "--primary-foreground": "#f9f8ff",
      "--secondary": "#575f72",
      "--secondary-foreground": "#f9f8ff",
      "--accent": "#695781",
      "--accent-foreground": "#fef6ff",
      "--destructive": "#a83836",
      "--destructive-foreground": "#fff7f6",
      "--background": "#faf9fe",
      "--foreground": "#2f323a",
      "--card": "#f3f3fa",
      "--card-foreground": "#2f323a",
      "--popover": "#e7e7f1",
      "--popover-foreground": "#2f323a",
      "--muted": "#e0e2ed",
      "--muted-foreground": "#5c5f68",
      "--border": "#afb1bc",
      "--input": "#afb1bc",
      "--ring": "#4a5f8b",
      "--role-student": "#495e8a",
      "--role-teacher": "#685680",
      "--role-chair": "#575e71",
      "--role-minutes": "#6277a5",
      "--role-admin": "#826f9a",
      "--role-editor": "#6f778b",
    },
  },
  {
    seed: "#4181ee",
    dark: true,
    colors: {
      "--primary": "#b7c6ee",
      "--primary-foreground": "#304060",
      "--secondary": "#bfc6dc",
      "--secondary-foreground": "#394052",
      "--accent": "#efdfff",
      "--accent-foreground": "#5d4c74",
      "--destructive": "#fa746f",
      "--destructive-foreground": "#490006",
      "--background": "#0d0e12",
      "--foreground": "#e3e5f0",
      "--card": "#111318",
      "--card-foreground": "#e3e5f0",
      "--popover": "#1d1f26",
      "--popover-foreground": "#e3e5f0",
      "--muted": "#23262d",
      "--muted-foreground": "#a9abb5",
      "--border": "#454850",
      "--input": "#454850",
      "--ring": "#b7c6ee",
      "--role-student": "#9babd1",
      "--role-teacher": "#b7a3d1",
      "--role-chair": "#a3abc0",
      "--role-minutes": "#8191b5",
      "--role-admin": "#9c88b5",
      "--role-editor": "#8990a5",
    },
  },
  {
    seed: "#ffc107",
    dark: false,
    colors: {
      "--primary": "#765b1a",
      "--primary-foreground": "#fff8f0",
      "--secondary": "#6c5d40",
      "--secondary-foreground": "#fff8f0",
      "--accent": "#835432",
      "--accent-foreground": "#fff7f4",
      "--destructive": "#a73b21",
      "--destructive-foreground": "#fff7f6",
      "--background": "#fff8f2",
      "--foreground": "#383225",
      "--card": "#fdf2e4",
      "--card-foreground": "#383225",
      "--popover": "#f2e7d6",
      "--popover-foreground": "#383225",
      "--muted": "#ede1ce",
      "--muted-foreground": "#665e4f",
      "--border": "#bcb19f",
      "--input": "#bcb19f",
      "--ring": "#765b1a",
      "--role-student": "#755a1a",
      "--role-teacher": "#825331",
      "--role-chair": "#6b5d3f",
      "--role-minutes": "#907331",
      "--role-admin": "#9f6c47",
      "--role-editor": "#857556",
    },
  },
  {
    seed: "#ffc107",
    dark: true,
    colors: {
      "--primary": "#e1c387",
      "--primary-foreground": "#513d0e",
      "--secondary": "#d8c4a0",
      "--secondary-foreground": "#4b3f24",
      "--accent": "#f4b78d",
      "--accent-foreground": "#5d3414",
      "--destructive": "#f97758",
      "--destructive-foreground": "#450900",
      "--background": "#110e08",
      "--foreground": "#f0e4d1",
      "--card": "#17130b",
      "--card-foreground": "#f0e4d1",
      "--popover": "#241f14",
      "--popover-foreground": "#f0e4d1",
      "--muted": "#2b2519",
      "--muted-foreground": "#b5aa98",
      "--border": "#4f4739",
      "--input": "#4f4739",
      "--ring": "#e1c387",
      "--role-student": "#c4a86e",
      "--role-teacher": "#d99f76",
      "--role-chair": "#bba987",
      "--role-minutes": "#a88d56",
      "--role-admin": "#bc855e",
      "--role-editor": "#a08f6e",
    },
  },
];

const scoreFixtures = [
  {
    population: [["#ff0000", 100], ["#00ff00", 500], ["#0000ff", 25], ["#ffff00", 75]],
    selected: ["#00ff00", "#ff0000", "#ffff00", "#0000ff"],
  },
  {
    population: [["#777777", 900], ["#888888", 100]],
    selected: ["#4285f4"],
  },
  {
    population: [["#4285f4", 40], ["#ea4335", 30], ["#fbbc04", 20], ["#34a853", 10], ["#a142f4", 5]],
    selected: ["#4285f4", "#ea4335", "#fbbc04", "#a142f4", "#34a853"],
  },
  {
    population: [
      ["#f44336", 100], ["#e91e63", 90], ["#9c27b0", 80], ["#673ab7", 70],
      ["#3f51b5", 60], ["#2196f3", 50], ["#03a9f4", 40], ["#00bcd4", 30],
      ["#009688", 20], ["#4caf50", 10],
    ],
    selected: ["#e91e63", "#9c27b0", "#2196f3", "#4caf50", "#00bcd4", "#009688"],
  },
];

const hexToArgb = (hex) => (0xff000000 | Number.parseInt(hex.slice(1), 16));
const argbToHex = (argb) => `#${(argb & 0xffffff).toString(16).padStart(6, "0")}`;

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  resolve: { alias: { "@": path.resolve("src") } },
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  ssr: { noExternal: ["@material/material-color-utilities"] },
  appType: "custom",
  logLevel: "silent",
});

try {
  const { materialSchemeColors } = await server.ssrLoadModule("/src/lib/color/material-scheme.js");
  const {
    quantizeMaterialPixels,
    scoreMaterialPopulation,
  } = await server.ssrLoadModule("/src/lib/color/wallpaper-palette.js");

  const browser = new JSDOM("<!doctype html><html><body></body></html>", {
    url: "https://app.test/home",
  });
  globalThis.window = browser.window;
  globalThis.document = browser.window.document;
  globalThis.localStorage = browser.window.localStorage;
  globalThis.Event = browser.window.Event;
  globalThis.getComputedStyle = browser.window.getComputedStyle.bind(browser.window);
  globalThis.requestAnimationFrame = (callback) => {
    callback();
    return 1;
  };
  globalThis.cancelAnimationFrame = () => {};

  const {
    SAVED_THEMES_CHANGED_EVENT,
    applyMaterialSeed,
    applyTheme,
    deleteSavedTheme,
    getSavedThemes,
    hexToHsl,
    saveMaterialTheme,
  } = await server.ssrLoadModule("/src/lib/themes.js");

  let savedThemeEvents = 0;
  window.addEventListener(SAVED_THEMES_CHANGED_EVENT, () => {
    savedThemeEvents += 1;
  });

  const savedMaterialTheme = saveMaterialTheme("Golden hour", "#ffc107", true);
  assertObject("saved Material theme record", savedMaterialTheme, [{
    name: "Golden hour",
    type: "material",
    seed: "#ffc107",
    dark: true,
    primary: "#e1c387",
    secondary: "#f4b78d",
  }]);
  assertEqual("saved Material theme sync event", savedThemeEvents, 1);

  saveMaterialTheme("Golden hour", "#4181ee", false);
  assertObject("saved Material theme overwrite", getSavedThemes(), [{
    name: "Golden hour",
    type: "material",
    seed: "#4181ee",
    dark: false,
    primary: "#4a5f8b",
    secondary: "#695781",
  }]);
  assertEqual("overwritten Material theme sync event", savedThemeEvents, 2);

  deleteSavedTheme("Golden hour");
  assertObject("saved Material theme deletion", getSavedThemes(), []);
  assertEqual("deleted Material theme sync event", savedThemeEvents, 3);

  const rootStyle = document.documentElement.style;

  applyTheme("catppuccin_mocha", { persist: false });
  assertEqual("character theme publishes character colour", rootStyle.getPropertyValue("--character-primary") !== "", true);
  assertEqual("character theme body class", document.body.classList.contains("theme-mocha"), true);
  applyMaterialSeed("#4181ee", { persist: false, dark: true });
  assertEqual("Material clears character colour", rootStyle.getPropertyValue("--character-primary"), "");
  assertEqual("Material clears character glass edge", rootStyle.getPropertyValue("--glass-edge"), "");
  assertEqual("Material removes previous character body class", document.body.classList.contains("theme-mocha"), false);
  assertEqual("Material owns the active body class", document.body.classList.contains("theme-material"), true);

  applyTheme("pride", { persist: false });
  assertEqual("Pride theme activates ambience", document.body.classList.contains("pride-active"), true);
  assertEqual("Pride theme publishes glow", rootStyle.getPropertyValue("--pride-glow") !== "", true);
  applyMaterialSeed("#4181ee", { persist: false, dark: true });
  assertEqual("Material clears Pride ambience", document.body.classList.contains("pride-active"), false);
  assertEqual("Material clears Pride glow", rootStyle.getPropertyValue("--pride-glow"), "");
  assertEqual("Material clears Pride edge", rootStyle.getPropertyValue("--pride-edge"), "");
  assertEqual("Material clears Pride highlight", rootStyle.getPropertyValue("--pride-highlight"), "");
  assertEqual("Material retains its requested dark mode", document.body.classList.contains("theme-is-dark"), true);
  assertEqual(
    "Material primary remains seed-owned after catalogue switches",
    rootStyle.getPropertyValue("--primary"),
    hexToHsl(materialSchemeColors("#4181ee", true)["--primary"]),
  );

  const calendarSource = fs.readFileSync(path.resolve("solid/components/CalendarWidget.jsx"), "utf8");
  for (const forbidden of ["#EACE54", "#951E3A", "text-amber-800"]) {
    assertEqual(`calendar contains no fixed theme colour ${forbidden}`, calendarSource.includes(forbidden), false);
  }
  for (const pair of [
    "bg-primary text-primary-foreground",
    "bg-secondary text-secondary-foreground",
    "bg-destructive text-destructive-foreground",
    "bg-accent text-accent-foreground",
    "bg-muted text-muted-foreground",
  ]) {
    assertEqual(`calendar contains theme-owned pair ${pair}`, calendarSource.includes(pair), true);
  }

  for (const fixture of schemeFixtures) {
    assertObject(
      `2025 Tonal Spot ${fixture.seed} ${fixture.dark ? "dark" : "light"}`,
      materialSchemeColors(fixture.seed, fixture.dark),
      fixture.colors,
    );
  }

  for (const fixture of scoreFixtures) {
    const population = new Map(
      fixture.population.map(([hex, count]) => [hexToArgb(hex), count]),
    );
    assertObject(
      `Material Score ${fixture.population[0][0]}`,
      scoreMaterialPopulation(population, 6).map(argbToHex),
      fixture.selected,
    );
  }

  const pixels = [];
  for (let y = 0; y < 16; y += 1) {
    for (let x = 0; x < 16; x += 1) {
      const red = x * 17;
      const green = y * 17;
      const blue = (x * 29 + y * 47) % 256;
      const repeats = 1 + ((x * 3 + y * 5) % 4);
      for (let repeat = 0; repeat < repeats; repeat += 1) {
        pixels.push(0xff000000 | (red << 16) | (green << 8) | blue);
      }
    }
  }

  const quantized = [...quantizeMaterialPixels(pixels, 8)]
    .map(([argb, count]) => [argbToHex(argb), count])
    .sort(([left], [right]) => left.localeCompare(right));
  assertObject("Celebi quantizer reference fixture", quantized, [
    ["#414550", 62],
    ["#46c3ba", 75],
    ["#503bb9", 91],
    ["#5ccc50", 105],
    ["#b7b3b0", 74],
    ["#c5b837", 68],
    ["#c84a41", 80],
    ["#cf47b5", 85],
  ]);
} finally {
  await server.close();
}

console.log(
  `Material You: ${inverseRows.length} inverse HCT, ${forwardRows.length} forward HCT, ` +
  `${schemeFixtures.length} schemes, ${scoreFixtures.length} scores, saved-theme persistence and Celebi passed reference checks.`,
);
