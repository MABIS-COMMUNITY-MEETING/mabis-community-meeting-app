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
    /*
     * How far ahead a section mounts.
     *
     * This was 1600px, which on any normal screen put every one of Home's ten
     * sections inside the margin at once. They all mounted on load, so all ten
     * widget chunks downloaded and all sixteen entity queries fired
     * simultaneously — well past the browser's ~6 connections per host, so they
     * queued and the widgets that mattered (Meeting Mode, Announcements) waited
     * behind ones the user had not scrolled to yet.
     *
     * 500px still mounts a section before it is reached at ordinary scroll
     * speed, but only two or three are ever in flight together.
     */
    /*
     * How far ahead a section MOUNTS. Deliberately generous: home-warmup.js
     * has already cached every widget chunk and its first query before Home
     * renders, so mounting early costs no network — it only decides whether
     * the content is ready before the user reaches it. Dropping this to 500px
     * to relieve a request stampede was the wrong lever and left visible blank
     * gaps while scrolling; the warm-up is what relieved the stampede.
     *
     * Revealing is a SEPARATE signal — see createReveal below.
     */
    { rootMargin: isConstrainedNetwork() ? "800px 0px" : "1400px 0px" }
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

/*
 * Reveal-on-view, separate from mounting.
 *
 * Mounting and revealing need different root margins, but neither needs an
 * observer per section. One shared reveal observer starts the entrance when a
 * section genuinely enters the viewport and keeps only a cheap cv-onscreen
 * class current afterwards. Linux uses that class to park continuous
 * decoration in sections the compositor cannot show.
 */
const revealCallbacks = new WeakMap();
let revealObserver = null;

function getRevealObserver() {
  if (revealObserver || typeof IntersectionObserver === "undefined") return revealObserver;
  revealObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      entry.target.classList.toggle("cv-onscreen", entry.isIntersecting);
      if (!entry.isIntersecting) continue;
      const reveal = revealCallbacks.get(entry.target);
      if (!reveal) continue;
      revealCallbacks.delete(entry.target);
      reveal();
    }
  }, { rootMargin: "-8% 0px" });
  return revealObserver;
}

function observeReveal(el, reveal) {
  const io = getRevealObserver();
  if (!io || !el) {
    el?.classList.add("cv-onscreen");
    reveal();
    return () => {};
  }
  revealCallbacks.set(el, reveal);
  io.observe(el);
  return () => {
    revealCallbacks.delete(el);
    io.unobserve(el);
  };
}

export function createReveal() {
  const [revealed, setRevealed] = createSignal(false);
  let el;
  const ref = (node) => { el = node; };

  onMount(() => {
    const stop = observeReveal(el, () => setRevealed(true));
    onCleanup(stop);
  });

  return [ref, revealed];
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
  const idleDelay = 140;
  let scrolling = false;
  let classFrame = 0;
  let idleTimer = 0;
  let lastScrollAt = 0;

  const settle = () => {
    scrolling = false;
    root.classList.remove("is-scrolling");
  };

  const settleAfterInactivity = () => {
    const remaining = idleDelay - (performance.now() - lastScrollAt);
    if (remaining > 1) {
      idleTimer = setTimeout(settleAfterInactivity, remaining);
      return;
    }
    idleTimer = 0;
    settle();
  };

  const onScroll = () => {
    lastScrollAt = performance.now();
    if (!scrolling) {
      scrolling = true;
      if (!classFrame) {
        classFrame = requestAnimationFrame(() => {
          classFrame = 0;
          root.classList.add("is-scrolling");
        });
      }
    }
    if (!idleTimer) idleTimer = setTimeout(settleAfterInactivity, idleDelay);
  };

  window.addEventListener("scroll", onScroll, { passive: true });
  return () => {
    window.removeEventListener("scroll", onScroll);
    if (classFrame) cancelAnimationFrame(classFrame);
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
