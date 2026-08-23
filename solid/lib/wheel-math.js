export const TAU = Math.PI * 2;

/*
 * Bound cumulative wheel angles after every completed spin. Canvas accepts
 * large angles, but an ever-growing Number eventually loses enough precision
 * to make segment selection unreliable.
 */
export function normalizeRotation(value) {
  return ((value % TAU) + TAU) % TAU;
}

/**
 * Deterministic Fisher–Yates shuffle. A shared seed lets Home and Meeting Mode
 * render the same wheel order, while always returning a new array so the input
 * roster is never mutated.
 */
export function seededShuffle(list, seed) {
  const shuffled = [...list];
  let state = seed >>> 0;
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const j = state % (i + 1);
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
