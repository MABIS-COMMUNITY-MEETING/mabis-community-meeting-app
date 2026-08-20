import fs from "node:fs";
import { JSDOM } from "jsdom";

const html = fs.readFileSync("solid/index.html", "utf8");
const failures = [];
let checks = 0;

function check(name, condition) {
  checks += 1;
  if (!condition) failures.push(name);
}

function bootWith(storage) {
  return new JSDOM(html, {
    url: "https://app.test/home",
    runScripts: "dangerously",
    beforeParse(window) {
      for (const [key, value] of Object.entries(storage)) {
        window.localStorage.setItem(key, value);
      }
    },
  });
}

const customSnapshot = {
  style: [
    "--primary: 302 58% 42%",
    "--primary-foreground: 0 0% 100%",
    "--background: 196 42% 93%",
    "--foreground: 218 34% 14%",
    "--card: 0 0% 100%",
  ].join("; "),
  bodyClasses: ["theme-is-dark"],
  themeClass: "theme-custom-preview",
  themeKey: "default",
  fontKey: "gnu-free-mono",
};

const replayed = bootWith({
  "mabis-theme": "default",
  "mabis-font": "gnu-free-mono",
  "mabis-custom-colors": JSON.stringify({
    primary: "#a12e9e",
    secondary: "#39a3b7",
  }),
  "mabis-theme-snapshot-v1": JSON.stringify(customSnapshot),
});
const replayedDocument = replayed.window.document;

check(
  "saved custom background is on html during parsing",
  replayedDocument.documentElement.style.getPropertyValue("--background").trim() === "196 42% 93%",
);
check(
  "saved custom primary is on html during parsing",
  replayedDocument.documentElement.style.getPropertyValue("--primary").trim() === "302 58% 42%",
);
check(
  "saved dark polarity reaches body before the app module",
  replayedDocument.body.classList.contains("theme-is-dark"),
);
check(
  "saved app theme class reaches body before the app module",
  replayedDocument.body.classList.contains("theme-custom-preview"),
);
check(
  "browser chrome receives the saved primary",
  replayedDocument.querySelector('meta[name="theme-color"]')?.getAttribute("content") === "hsl(302 58% 42%)",
);
check(
  "pre-paint handoff data is removed after body setup",
  !("__mabisPrePaintTheme" in replayed.window),
);

const stale = bootWith({
  "mabis-theme": "sage",
  "mabis-font": "gnu-free-mono",
  "mabis-theme-snapshot-v1": JSON.stringify(customSnapshot),
});
const staleDocument = stale.window.document;

check(
  "a snapshot for another theme is not replayed",
  !staleDocument.documentElement.style.getPropertyValue("--background").trim(),
);
check(
  "a rejected snapshot does not leak body classes",
  !staleDocument.body.classList.contains("theme-is-dark"),
);
check(
  "the loading surface reads semantic theme tokens",
  html.includes("background: hsl(var(--background") &&
    html.includes("color: hsl(var(--foreground") &&
    html.includes("background: hsl(var(--primary"),
);

replayed.window.close();
stale.window.close();

console.log(`Theme pre-paint: ${checks - failures.length}/${checks} checks passed.`);

if (failures.length) {
  console.error("\nFAILED:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
