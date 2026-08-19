/**
 * The one place background scroll is locked.
 *
 * Three surfaces used to do this by hand — the boss nav overlay, the help
 * dialog and the fullscreen docs editor — each with the same shape:
 *
 *     const previous = document.body.style.overflow;
 *     document.body.style.overflow = "hidden";
 *     onCleanup(() => { document.body.style.overflow = previous; });
 *
 * That is correct exactly once. The moment two of them overlap, the second
 * reads `previous` as "hidden" and restores "hidden" on cleanup — the page can
 * then never scroll again, with no error, no visible overlay and nothing in
 * the DOM to explain it.
 *
 * It does not take two dialogs to hit. An effect that RE-RUNS is enough, and
 * Vite's HMR re-runs effects on every module update — so the failure appears
 * in dev and in the Base44 preview and never on the built site, which is the
 * most confusing possible signature.
 *
 * Reference counting fixes it: the original value is captured once, at the
 * transition from zero locks to one, and restored once, at the transition back
 * to zero. Releases are idempotent, so a double cleanup cannot underflow.
 */

let depth = 0;
let original = null;

/**
 * Lock background scroll. Returns an idempotent release function.
 *
 *     onMount(() => onCleanup(lockBodyScroll()));
 */
export function lockBodyScroll() {
  if (typeof document === "undefined") return () => {};

  if (depth === 0) {
    // Every scroll-locking surface uses this module. If no lock is registered
    // but the inline value is still hidden, it is residue from a preview HMR
    // replacement; never preserve it as the state to restore later.
    original = document.body.style.overflow === "hidden"
      ? ""
      : document.body.style.overflow;
  }
  depth += 1;
  document.body.style.overflow = "hidden";

  let released = false;
  return () => {
    if (released) return;
    released = true;
    depth = Math.max(0, depth - 1);
    if (depth === 0) {
      document.body.style.overflow = original ?? "";
      original = null;
    }
  };
}

/**
 * Drop every lock and restore scrolling.
 *
 * The safety valve, called on navigation. Nothing that locks scroll survives a
 * route change, so if a count is still standing at that point it is a leak —
 * and the reader losing the ability to scroll the whole site is far worse than
 * a modal briefly scrolling behind itself.
 */
export function releaseAllScrollLocks() {
  if (typeof document === "undefined") return;
  depth = 0;
  document.body.style.overflow = original ?? "";
  original = null;
}

// Preview updates can replace this module while a menu or editor owns a lock.
// Release before the old module state disappears, otherwise no later cleanup
// can know that the inline `overflow: hidden` belongs to a dead instance.
if (import.meta.hot) import.meta.hot.dispose(releaseAllScrollLocks);

/** Testing seam for the guard script. */
export function scrollLockDepth() {
  return depth;
}