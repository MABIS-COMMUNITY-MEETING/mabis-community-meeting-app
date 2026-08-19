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

  if (depth === 0) original = document.body.style.overflow;
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
 *
 * Deliberately unconditional. This used to skip the DOM write when its own
 * bookkeeping (depth, original) already read as "nothing locked" — correct
 * only if that bookkeeping can never drift from the real DOM state. `depth`
 * and `original` are module-level, and Vite HMR replacing this module (or the
 * component that called lockBodyScroll) resets them to fresh values without
 * touching body.style.overflow, which is still physically "hidden" from
 * before the reload. The safety valve would see depth === 0 and do nothing —
 * the exact stuck-scroll-in-dev-and-preview failure this file's top comment
 * describes, just one layer deeper than the double-lock case the reference
 * count already fixed. Writing overflow unconditionally means this can never
 * be a no-op when the DOM disagrees with the bookkeeping.
 */
export function releaseAllScrollLocks() {
  if (typeof document === "undefined") return;
  document.body.style.overflow = original ?? "";
  depth = 0;
  original = null;
}

/** Testing seam for the guard script. */
export function scrollLockDepth() {
  return depth;
}
