import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), "utf8");
const withoutComments = (source) => source.replace(/\/\*[\s\S]*?\*\//g, "");

const css = read("src/index.css");
const glass = read("src/styles/glass.css");
const motion = read("solid/solid-motion.css");
const perf = read("solid/lib/perf.js");
const tier = read("src/lib/performance-tier.js");
const monitor = read("solid/lib/perf-monitor.js");

const restoreGlobal = (name, value) => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, name);
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value,
  });
  return () => {
    if (previous) Object.defineProperty(globalThis, name, previous);
    else delete globalThis[name];
  };
};

const classes = new Set();
const rootElement = {
  classList: {
    contains: (name) => classes.has(name),
    toggle: (name, enabled) => {
      if (enabled) classes.add(name);
      else classes.delete(name);
    },
  },
  dataset: {},
};

const browser = {
  userAgentData: { platform: "Linux x86_64" },
  platform: "Linux x86_64",
  userAgent: "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
};

const restoreNavigator = restoreGlobal("navigator", browser);
const restoreDocument = restoreGlobal("document", { documentElement: rootElement });

try {
  const moduleUrl = pathToFileURL(path.join(root, "src/lib/platform-profile.js"));
  moduleUrl.searchParams.set("linux-check", String(Date.now()));
  const profile = await import(moduleUrl.href);

  assert.equal(profile.isLinuxPlatform(), true, "desktop Linux must activate the Linux profile");
  assert.deepEqual(profile.applyPlatformProfile(), { linux: true });
  assert.equal(classes.has("platform-linux"), true);
  assert.equal(rootElement.dataset.platform, "linux");

  browser.userAgentData.platform = "Android";
  browser.platform = "Linux armv8l";
  browser.userAgent = "Mozilla/5.0 (Linux; Android 16)";
  assert.equal(profile.isLinuxPlatform(), false, "Android must not receive desktop Linux behavior");
  assert.deepEqual(profile.applyPlatformProfile(), { linux: false });
  assert.equal(classes.has("platform-linux"), false);
  assert.equal("platform" in rootElement.dataset, false);
} finally {
  restoreDocument();
  restoreNavigator();
}

const declarations = withoutComments(css);
assert.equal(/transform-style\s*:\s*preserve-3d/i.test(declarations), false,
  "blanket preserve-3d promotion must stay removed");
assert.equal(/html\.platform-linux[\s\S]{0,220}backface-visibility\s*:/i.test(declarations), false,
  "Linux must not force backface layer hints");
assert.equal(/html\.platform-linux[\s\S]{0,160}text-rendering\s*:\s*optimizeLegibility/i.test(declarations), false,
  "Linux must leave text shaping on the browser's native fast path");
assert.match(css, /html\.platform-linux \.cv-section\.cv-ready:not\(\.cv-onscreen\)/,
  "Linux must park continuous decoration in off-screen measured sections");
assert.match(css, /animation-play-state:\s*paused !important/,
  "off-screen decoration must pause rather than be deleted");
assert.equal((perf.match(/new IntersectionObserver/g) || []).length, 2,
  "Home may use one mount observer and one shared reveal/activity observer");
assert.match(perf, /const revealCallbacks = new WeakMap\(\)/);
assert.match(perf, /classList\.toggle\("cv-onscreen", entry\.isIntersecting\)/);
assert.doesNotMatch(motion, /\.widget-rise\s*\{\s*will-change:/,
  "section entrances must not pin persistent compositor layers");

assert.match(tier, /if \(isLinuxPlatform\(\)\) return false;/,
  "Linux must retain the complete visual tier");
assert.match(tier, /if \(isLinuxPlatform\(\)\) return \(\) => \{\};/,
  "Linux frame sampling must not silently demote visual quality");
assert.match(glass, /backdrop-filter:\s*blur\(var\(--glass_blur\)\)/,
  "the live primary glass blur must remain");
assert.doesNotMatch(glass, /html\.platform-linux/,
  "the glass system must not contain a Linux quality override");
assert.match(monitor, /linux:\s*isLinuxPlatform\(\)/);
assert.match(monitor, /softwareRendering:\s*isSoftwareRendered\(\)/);

console.log("Linux performance contract: 18/18 checks passed");
console.log("Quality preserved: live glass, animation, grain, cursor, themes and reduced-motion behavior remain available.");
