export const TAU = Math.PI * 2;

/*
 * Bound cumulative wheel angles after every completed spin. Canvas accepts
 * large angles, but an ever-growing Number eventually loses enough precision
 * to make segment selection unreliable.
 */
export function normalizeRotation(value) {
  return ((value % TAU) + TAU) % TAU;
}
