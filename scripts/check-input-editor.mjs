import assert from "node:assert/strict";
import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://example.test/",
  pretendToBeVisual: true,
});
globalThis.window = dom.window;
globalThis.document = dom.window.document;
globalThis.navigator = dom.window.navigator;
globalThis.Element = dom.window.Element;
globalThis.Node = dom.window.Node;
globalThis.Text = dom.window.Text;
globalThis.HTMLElement = dom.window.HTMLElement;
globalThis.MutationObserver = dom.window.MutationObserver;
globalThis.getComputedStyle = dom.window.getComputedStyle;

const nav = await import("../solid/lib/input-navigation.js");
const editor = await import("../solid/lib/quill-setup.js");

let checks = 0;
const check = (condition, message) => {
  assert.ok(condition, message);
  checks += 1;
};

const rect = (left, top, width = 40, height = 24) => ({
  left, top, width, height, right: left + width, bottom: top + height,
});
const fake = (left, top) => ({ getBoundingClientRect: () => rect(left, top) });
const current = fake(100, 100);
const left = fake(20, 100);
const right = fake(180, 100);
const down = fake(100, 180);
const diagonal = fake(150, 150);

check(nav.findDirectionalTarget(current, "left", [right, left, down]) === left,
  "Arrow-left chooses the nearest target on the left");
check(nav.findDirectionalTarget(current, "right", [diagonal, right, left]) === right,
  "Primary-axis alignment wins over a diagonal jump");
check(nav.findDirectionalTarget(current, "down", [left, right, down]) === down,
  "Arrow-down follows the geometric column");

const standardPad = {
  id: "Xbox Wireless Controller",
  axes: [0.8, 0, 0, 0],
  buttons: Array.from({ length: 16 }, (_, index) => ({
    pressed: index === 0,
    value: index === 0 ? 1 : 0,
  })),
};
const standardIntent = nav.readGamepadIntent(standardPad);
check(standardIntent.right && standardIntent.activate,
  "Standard Xbox/PS/Nintendo mapping supports stick navigation and the primary button");

const gameCubePad = {
  id: "0079-1846 GameCube Controller Adapter",
  axes: [0, -0.9, 0, 0, 0, 0],
  buttons: Array.from({ length: 16 }, (_, index) => ({
    pressed: index === 1,
    value: index === 1 ? 1 : 0,
  })),
};
const gameCubeIntent = nav.readGamepadIntent(gameCubePad);
check(gameCubeIntent.up && gameCubeIntent.activate,
  "Raw GameCube adapter ids use the compatible A-button mapping and raw axes");

const sanitized = editor.sanitizePastedHtml(
  '<p style="color:#f00;background-color:yellow"><mark>Keep</mark> <a href="https://example.com">link</a></p>'
);
check(!/color\s*:|background(?:-color)?\s*:|<mark/i.test(sanitized),
  "Foreign paste colors and mark highlights are removed");
check(/<a href="https:\/\/example\.com">link<\/a>/.test(sanitized),
  "Paste sanitization preserves links");
check(editor.readableInkForHex("#ffffff") === "#000000",
  "Light unrestricted highlights receive dark readable ink");
check(editor.readableInkForHex("#000000") === "#ffffff",
  "Dark unrestricted highlights receive light readable ink");
check(editor.readableInkForHex("#777777") === "#000000",
  "Mid-tone highlights choose the stronger WCAG foreground");

console.log(`Input/editor contract: ${checks}/${checks} checks passed.`);
