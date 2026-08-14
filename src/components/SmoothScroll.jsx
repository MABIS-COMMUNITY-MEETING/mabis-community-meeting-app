/**
 * Compatibility shim for older imports.
 *
 * Native browser scrolling is deliberately never intercepted: the OS and
 * compositor already provide the lowest-latency wheel, trackpad, touch,
 * keyboard, and momentum behavior. The shared scroll-progress signal applies
 * the lightweight active-scroll decoration fast path without owning scroll input.
 */
export default function SmoothScroll() {
  return null;
}