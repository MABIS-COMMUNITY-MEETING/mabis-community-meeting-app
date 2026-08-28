import assert from "node:assert/strict";
import fs from "node:fs";

const component = fs.readFileSync("solid/components/home/ScrollScaleRitual.jsx", "utf8");
const styles = fs.readFileSync("src/styles/editorial-home.css", "utf8");

assert.match(component, /getBoundingClientRect\(\)/, "Voice Your Words must measure real viewport progress");
assert.match(component, /\(viewport - rect\.top\) \/ \(rect\.height \+ viewport\)/, "progress must follow the full start-end viewport travel");
assert.match(component, /lerp\(previousX, state\.x,/, "presentation must interpolate fixed-step samples at the display refresh rate");
assert.match(component, /lerp\(0\.82, 1\.28, interpolated\)/, "scrolling down must grow the words through the original scale range");
assert.match(component, /opacityFor\(interpolated\)/, "the original scroll-linked fade must remain");
assert.match(component, /integrateSpring\(state, target, omega, zeta, dt\)/, "scroll progress must retain the original spring response");
assert.match(component, /sample:\s*\(\) =>/, "geometry reads must stay in the scheduler sample phase");
assert.match(component, /wake\(\)/, "every scroll change must wake a scheduler that has settled");
assert.match(component, /addEventListener\("scroll", markForMeasure, \{ passive: true \}\)/, "the progress listener must be passive");
assert.match(component, /MOTION_EVENT/, "the animation must respond when the user changes the motion setting");
assert.doesNotMatch(component, /CSS\?\.supports|animation-timeline/, "browser support guesses must never bypass the working path again");
assert.doesNotMatch(styles, /animation-timeline:[\s\S]*voice-words/, "CSS timelines must not compete with measured scroll progress");
assert.match(styles, /@media \(prefers-reduced-motion: reduce\)[\s\S]*voice-words-ritual__line/, "reduced-motion users need a stable readable line");

console.log("Voice Your Words animation contract checks passed.");
