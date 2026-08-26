import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
const docsEditorSource = readFileSync(
  new URL("../solid/components/DocsEditor.jsx", import.meta.url),
  "utf8",
);

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

const diagonalIntent = nav.readGamepadIntent({
  ...standardPad,
  axes: [0.82, 0.68, 0, 0],
});
check(diagonalIntent.right && !diagonalIntent.down,
  "A diagonal stick resolves to one dominant menu direction");

const secondaryAxisIntent = nav.readGamepadIntent({
  ...standardPad,
  axes: [0, 0, 0.95, -0.95, 1, -1],
  buttons: Array.from({ length: 16 }, () => ({ pressed: false, value: 0 })),
});
check(!secondaryAxisIntent.left && !secondaryAxisIntent.right
    && !secondaryAxisIntent.up && !secondaryAxisIntent.down,
  "Right-stick and trigger axes do not cause phantom navigation");

const dpadPriorityIntent = nav.readGamepadIntent({
  ...standardPad,
  axes: [0.9, 0, 0, 0],
  buttons: Array.from({ length: 16 }, (_, index) => ({
    pressed: index === 12,
    value: index === 12 ? 1 : 0,
  })),
});
check(dpadPriorityIntent.up && !dpadPriorityIntent.right,
  "The digital pad takes priority over an active analog stick");

const nintendoActivate = nav.readGamepadIntent({
  ...standardPad,
  id: "Nintendo Switch Pro Controller",
  buttons: Array.from({ length: 16 }, (_, index) => ({
    pressed: index === 1,
    value: index === 1 ? 1 : 0,
  })),
});
const nintendoBack = nav.readGamepadIntent({
  ...standardPad,
  id: "Nintendo Switch Pro Controller",
  buttons: Array.from({ length: 16 }, (_, index) => ({
    pressed: index === 0,
    value: index === 0 ? 1 : 0,
  })),
});
check(nintendoActivate.activate && !nintendoActivate.back,
  "Nintendo A activates the focused control");
check(nintendoBack.back && !nintendoBack.activate,
  "Nintendo B performs the back action");

const gameCubeBack = nav.readGamepadIntent({
  ...gameCubePad,
  buttons: Array.from({ length: 16 }, (_, index) => ({
    pressed: index === 2,
    value: index === 2 ? 1 : 0,
  })),
});
check(gameCubeBack.back && !gameCubeBack.activate,
  "GameCube B goes back without also activating the focused control");

const held = new Map();
check(nav.shouldFireOnce(held, "activate", true),
  "Action buttons fire on their pressed edge");
check(!nav.shouldFireOnce(held, "activate", true),
  "Holding an action button cannot double-submit");
nav.shouldFireOnce(held, "activate", false);
check(nav.shouldFireOnce(held, "activate", true),
  "An action button can fire again after release");

Object.defineProperty(window, "innerWidth", { value: 390, configurable: true });
Object.defineProperty(window, "innerHeight", { value: 844, configurable: true });
document.body.replaceChildren();
const offscreenButton = document.createElement("button");
const visibleButton = document.createElement("button");
offscreenButton.getBoundingClientRect = () => rect(20, -100);
visibleButton.getBoundingClientRect = () => rect(20, 120);
let scrollOptions = null;
visibleButton.scrollIntoView = (options) => { scrollOptions = options; };
document.body.append(offscreenButton, visibleButton);
check(nav.moveDirectionalFocus("down") && document.activeElement === visibleButton,
  "Initial controller focus starts on-screen at phone width");
check(scrollOptions?.behavior === "auto",
  "Repeated navigation does not stack smooth-scroll animations");

document.body.replaceChildren();
const backgroundButton = document.createElement("button");
const modal = document.createElement("div");
const modalButton = document.createElement("button");
backgroundButton.getBoundingClientRect = () => rect(20, 40);
modal.setAttribute("aria-modal", "true");
modal.setAttribute("role", "dialog");
modal.getBoundingClientRect = () => rect(10, 20, 360, 700);
modalButton.getBoundingClientRect = () => rect(40, 100);
modal.append(modalButton);
document.body.append(backgroundButton, modal);
backgroundButton.focus();
check(nav.activeNavigationModal() === modal,
  "The visible modal is recognized as the active controller scope");
check(nav.moveDirectionalFocus("right") && document.activeElement === modalButton,
  "Controller focus cannot escape behind an open modal");

document.body.replaceChildren();

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

check(/event\.dataTransfer\?\.files/.test(docsEditorSource)
    && /onDrop=\{handleImageDrop\}/.test(docsEditorSource),
  "The shared document editor accepts image files dropped from the desktop");
check(/caretRangeFromPoint/.test(docsEditorSource)
    && /caretPositionFromPoint/.test(docsEditorSource),
  "Image drops preserve the pointer position in Chromium/WebKit and Firefox");
check(/insertImageFiles\(files, insertionIndex\)/.test(docsEditorSource)
    && /insertEmbed\(caret, "image", source, "user"\)/.test(docsEditorSource),
  "Dropped images use the same saved Quill embed path as toolbar images");
check(/type="file" accept="image\/\*" multiple/.test(docsEditorSource),
  "The document image picker and drop path both support multiple images");
check(/addEventListener\("paste", handlePaste, true\)/.test(docsEditorSource),
  "Rich paste sanitization runs before Quill so links are inserted only once");
check(/removeEventListener\("paste", handlePaste, true\)/.test(docsEditorSource),
  "The capture-phase paste listener is removed with matching options");

console.log(`Input/editor contract: ${checks}/${checks} checks passed.`);
