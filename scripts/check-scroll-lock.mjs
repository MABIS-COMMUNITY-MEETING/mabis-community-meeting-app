/**
 * Regression guard for src/lib/scroll-lock.js.
 *
 * Two distinct bugs have lived in this file, both invisible on the built
 * site and only reproducible in dev / the Base44 preview, which is the
 * worst possible place to discover them by hand. Both get a permanent check
 * here rather than trusted to manual testing.
 *
 * A minimal `document.body.style` stub is all this needs — the module has
 * no other DOM dependency, so a real jsdom instance would be overhead for
 * no extra coverage.
 */
import assert from "node:assert/strict";

globalThis.document = { body: { style: { overflow: "" } } };

const modUrl = `../src/lib/scroll-lock.js?t=${Date.now()}`;
const { lockBodyScroll, releaseAllScrollLocks, scrollLockDepth } = await import(modUrl);

let passed = 0;
const check = (name, fn) => {
  fn();
  passed += 1;
  void name;
};

// ── 1. Overlapping locks must reference-count, not stomp each other ────────
check("two overlapping locks leave scroll locked, one release leaves it locked, both releases restore it", () => {
  document.body.style.overflow = "";
  const releaseA = lockBodyScroll();
  assert.equal(document.body.style.overflow, "hidden");
  const releaseB = lockBodyScroll();
  assert.equal(document.body.style.overflow, "hidden");
  releaseA();
  assert.equal(document.body.style.overflow, "hidden", "releasing one of two locks must not unlock scroll");
  releaseB();
  assert.equal(document.body.style.overflow, "", "releasing the last lock must restore scroll");
  assert.equal(scrollLockDepth(), 0);
});

check("a release is idempotent — calling it twice cannot underflow the count", () => {
  document.body.style.overflow = "";
  const releaseA = lockBodyScroll();
  const releaseB = lockBodyScroll();
  releaseA();
  releaseA(); // double-release, e.g. a cleanup that runs twice
  assert.equal(document.body.style.overflow, "hidden", "still one lock outstanding");
  releaseB();
  assert.equal(document.body.style.overflow, "");
});

check("the original inline overflow value is restored, not just cleared", () => {
  document.body.style.overflow = "scroll";
  const release = lockBodyScroll();
  assert.equal(document.body.style.overflow, "hidden");
  release();
  assert.equal(document.body.style.overflow, "scroll", "must restore what was there before, not blank it");
});

// ── 2. The safety valve must fire even when its own bookkeeping is stale ───
check("releaseAllScrollLocks unlocks scroll even when depth already reads 0", () => {
  // Simulates the exact failure this file's top comment describes: a module
  // reload (Vite HMR) resets `depth`/`original` to fresh values without
  // touching the DOM, so body.style.overflow is still physically "hidden"
  // from before the reload while the module's own count says nothing is
  // locked. The safety valve must not trust that count.
  document.body.style.overflow = "";
  lockBodyScroll(); // depth -> 1, DOM -> hidden
  releaseAllScrollLocks(); // simulates a route change bringing depth back to 0 the normal way
  assert.equal(document.body.style.overflow, "", "sanity: the normal path still works");

  // Now force the desync directly: DOM stuck hidden, bookkeeping already 0.
  document.body.style.overflow = "hidden";
  assert.equal(scrollLockDepth(), 0, "sanity: bookkeeping believes nothing is locked");
  releaseAllScrollLocks();
  assert.equal(
    document.body.style.overflow,
    "",
    "the safety valve must clear a stuck lock even when depth already reads 0 — " +
    "this is the exact bug that made scroll permanently unrecoverable in dev/preview",
  );
});

check("releaseAllScrollLocks is safe to call with nothing locked", () => {
  document.body.style.overflow = "";
  releaseAllScrollLocks();
  assert.equal(document.body.style.overflow, "");
  assert.equal(scrollLockDepth(), 0);
});

console.log(`\nScroll lock: ${passed}/${passed} checks passed\n`);
console.log("Overlapping locks reference-count correctly, and the route-change safety valve recovers a stuck lock even when its own bookkeeping is out of sync with the DOM.\n");
