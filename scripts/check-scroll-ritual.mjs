import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync("solid/components/home/ScrollScaleRitual.jsx", "utf8");
const styles = fs.readFileSync("src/styles/editorial-home.css", "utf8");

assert.match(component, /new IntersectionObserver/, "Voice Your Words needs a scroll-progress fallback outside view-timeline browsers");
assert.match(component, /SCROLL_SCALE_THRESHOLDS/, "the fallback must track progress densely enough to visibly grow while scrolling");
assert.match(component, /--voice-words-progress/, "the fallback must hand progress to CSS without writing transforms from JavaScript");
assert.doesNotMatch(component, /addEventListener\(["']scroll/, "Voice Your Words must not install its own scroll handler");
assert.match(component, /CSS\?\.supports\?\.\("animation-timeline: view\(\)"\)/, "native view-timeline browsers must stay on the compositor path");
assert.match(styles, /--voice-words-progress/, "the fallback progress variable must drive the visual treatment");
assert.match(styles, /scale\(calc\([^)]*--voice-words-progress/, "fallback progress must make Voice Your Words grow");
assert.match(styles, /animation-timeline:\s*view\(block\)/, "supported browsers must tie the scale animation to scroll progress");
assert.match(styles, /@keyframes voice-words-scroll/, "the scroll animation keyframes must exist");
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*voice-words-ritual__line/, "reduced-motion users need a stable readable line");

console.log("Voice Your Words animation contract checks passed.");
