import { JSDOM } from "jsdom";

const dom = new JSDOM("<!doctype html><body></body>");
globalThis.document = dom.window.document;

const {
  lockBodyScroll,
  releaseAllScrollLocks,
  scrollLockDepth,
} = await import("../src/lib/scroll-lock.js");

function check(condition, message) {
  if (!condition) throw new Error(message);
}

document.body.style.overflow = "auto";
document.documentElement.style.overflow = "scroll";
const releaseFirst = lockBodyScroll();
const releaseSecond = lockBodyScroll();

check(document.body.style.overflow === "hidden", "the first lock must hide body overflow");
check(document.documentElement.style.overflow === "hidden", "the first lock must hide root overflow");
check(document.documentElement.classList.contains("scroll-locked"), "the first lock must expose its active state");
check(scrollLockDepth() === 2, "nested locks must be reference-counted");

releaseFirst();
check(document.body.style.overflow === "hidden", "one nested release must keep scrolling locked");
check(scrollLockDepth() === 1, "one nested release must leave one active lock");

releaseSecond();
check(document.body.style.overflow === "auto", "the final release must restore original body overflow");
check(document.documentElement.style.overflow === "scroll", "the final release must restore original root overflow");
check(!document.documentElement.classList.contains("scroll-locked"), "the final release must clear its active state");
check(scrollLockDepth() === 0, "the final release must clear the lock depth");

document.body.style.overflow = "";
const staleRelease = lockBodyScroll();
releaseAllScrollLocks();
const currentRelease = lockBodyScroll();

staleRelease();
check(document.body.style.overflow === "hidden", "a stale release must not unlock a newer overlay");
check(scrollLockDepth() === 1, "a stale release must not decrement the current generation");

currentRelease();
check(document.body.style.overflow === "", "the current release must restore document scrolling");
check(scrollLockDepth() === 0, "the current release must clear its generation");

document.body.style.overflow = "hidden";
document.documentElement.style.overflow = "hidden";
const releaseResidue = lockBodyScroll();
releaseResidue();
check(document.body.style.overflow === "", "stale preview body overflow must not be preserved");
check(document.documentElement.style.overflow === "", "stale preview root overflow must not be preserved");
check(!document.documentElement.classList.contains("scroll-locked"), "stale preview state must be cleared");

releaseAllScrollLocks();
console.log("Scroll lock lifecycle checks passed.");
