import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync("solid/components/home/ScrollScaleRitual.jsx", "utf8");
const styles = fs.readFileSync("src/styles/editorial-home.css", "utf8");

assert.match(component, /createReveal\(\)/, "Voice Your Words must have a visibility-triggered animation fallback");
assert.match(component, /voice-words-ritual__line/, "Voice Your Words must opt into its compositor animation");
assert.match(styles, /animation-timeline:\s*view\(block\)/, "supported browsers must tie the scale animation to scroll progress");
assert.match(styles, /@keyframes voice-words-scroll/, "the scroll animation keyframes must exist");
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*voice-words-ritual__line/, "reduced-motion users need a stable readable line");

console.log("Voice Your Words animation contract checks passed.");
