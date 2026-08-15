import { createSignal, onMount, onCleanup } from "solid-js";
import { isConstrainedNetwork, lowPowerMode, PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";

/*
 * Low-level rendering budget for the Solid build.
 *
 * The goal is a page that holds 60fps while the CPU is already busy and the
 * GPU is weak. Three rules follow from that, and everything here implements
 * them:
 *
 *   1. Never do per-element work the platform can do once.
 *   2. Never do work for content the user cannot see.
 *   3. Never touch the reactive graph on a frame boundary.
 */

/* ── 1. One IntersectionObserver for the whole page ────────────────────────
 * The React build creates a fresh IntersectionObserver per LazySection — ten
 * observers on Home, each with its own root-margin computation and its own
 * entry callback allocated per intersection. Observers are not free: each is
 * a separate registration the compositor must track and feed on every scroll
 * update.
 *
 * One shared observer with a Map of element → callback does the same job for
 * a single registration, so scroll cost stops scaling with section count.
 */
const viewportCallbacks = new WeakMap();
let sharedObserver = null;

function getObserver() {
  if (sharedObserver || typeof IntersectionObserver === "undefined") return sharedObserver;
  sharedObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const cb = viewportCallbacks.get(entry.target);
        if (cb) {
          viewportCallbacks.delete(entry.target);
          sharedObserver.unobserve(entry.target);
          cb();
        }
      }
    },
    // A generous margin means a section is always mounted well before it is
    // reached, so the user never sees a placeholder swap. Tightened on
    // constrained networks so we do not speculatively fetch on a slow link.
    { rootMargin: isConstrainedNetwork() ? "900px 0px" : "1600px 0px" }
  );
  return sharedObserver;
}

/** Fire `fn` once, when `el` first approaches the viewport. */
export function onceVisible(el, fn) {
  const io = getObserver();
  if (!io || !el) { fn(); return () => {}; }
  viewportCallbacks.set(el, fn);
  io.observe(el);
  return () => {
    viewportCallbacks.delete(el);
    io.unobserve(el);
  };
}

/** Solid primitive: becomes true once the bound element nears the viewport. */
export function createVisibility() {
  const [visible, setVisible] = createSignal(false);
  let el;
  const ref = (node) => { el = node; };

  onMount(() => {
    if (!el) { setVisible(true); return; }
    const stop = onceVisible(el, () => setVisible(true));
    onCleanup(stop);
  });

  return [ref, visible];
}

/* ── 2. Quality tier ───────────────────────────────────────────────────────
 * Mirrors the React app's performance-tier module as a Solid signal so
 * components can drop effects (blur, grain, parallax) on weak hardware
 * without each one re-implementing the detection.
 */
export function createQualityTier() {
  const [low, setLow] = createSignal(lowPowerMode());
  const sync = () => setLow(lowPowerMode());
  window.addEventListener(PERFORMANCE_TIER_EVENT, sync);
  onCleanup(() => window.removeEventListener(PERFORMANCE_TIER_EVENT, sync));
  return low;
}

/* ── 3. Scroll state without a scroll handler on the reactive graph ────────
 * Writing a signal on every scroll event would wake Solid's graph dozens of
 * times a second and invalidate memos mid-scroll. Instead a single passive
 * listener toggles a class on <html>, and CSS decides what to switch off —
 * the same `is-scrolling` contract the React build already uses, so the
 * existing rules in index.css apply unchanged.
 *
 * rAF-coalesced: many scroll events collapse into at most one class write
 * per frame, and the idle reset is debounced.
 */
export function installScrollStateClass() {
  const root = document.documentElement;
  let scrolling = false;
  let queued = false;
  let idleTimer = 0;

  const settle = () => {
    scrolling = false;
    root.classList.remove("is-scrolling");
  };

  const onScroll = () => {
    if (!scrolling) {
      scrolling = true;
      if (!queued) {
        queued = true;
        requestAnimationFrame(() => {
          queued = false;
          root.classList.add("is-scrolling");
        });
      }
    }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(settle, 140);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    clearTimeout(idleTimer);
    settle();
  };
}

/**
 * Defer non-critical work to genuine idle time.
 * Falls back to a timeout where requestIdleCallback is unavailable (Safari).
 */
export function whenIdle(fn, timeout = 2000) {
  if (typeof requestIdleCallback === "function") {
    const id = requestIdleCallback(fn, { timeout });
    return () => cancelIdleCallback(id);
  }
  const id = setTimeout(fn, 200);
  return () => clearTimeout(id);
}
