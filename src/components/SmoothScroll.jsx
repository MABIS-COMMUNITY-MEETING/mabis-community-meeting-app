import { useEffect } from "react";
import { animationsDisabled } from "@/lib/motion-preference";
/**
 * Inertial smooth scrolling, tuned per input device:
 * - Mouse wheels (Windows/Linux/Mac mice) get the rAF-eased inertial scroll.
 * - Trackpads (Mac/Linux gestures) are passed through natively — they already
 *   have OS-level inertia, and intercepting them feels laggy.
 * - Firefox line/page delta modes are normalised to pixels so speed matches
 *   Chrome/Edge across platforms.
 * Disabled on touch, reduced-motion, and inside independently scrollable panes.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced || animationsDisabled()) return;

    let target = window.scrollY;
    let current = target;
    let raf = null;
    let running = false;

    const maxScroll = () => document.documentElement.scrollHeight - window.innerHeight;

    const scrollableParent = (el) => {
      let node = el;
      while (node && node !== document.body && node !== document.documentElement) {
        const s = getComputedStyle(node);
        if (/(auto|scroll|overlay)/.test(s.overflowY) && node.scrollHeight > node.clientHeight) return node;
        node = node.parentElement;
      }
      return null;
    };

    // Normalise wheel delta to pixels (Firefox on Windows/Linux reports lines).
    const normalizeDelta = (e) => {
      if (e.deltaMode === 1) return e.deltaY * 16; // lines → px
      if (e.deltaMode === 2) return e.deltaY * window.innerHeight; // pages → px
      return e.deltaY;
    };

    // Trackpad heuristic: pixel-mode events with small, non-integer or
    // low-magnitude deltas arriving in a continuous stream.
    let trackpadScore = 0;
    const looksLikeTrackpad = (e) => {
      if (e.deltaMode !== 0) { trackpadScore = 0; return false; }
      const d = Math.abs(e.deltaY);
      const fractional = d !== Math.floor(d);
      if (fractional || (d > 0 && d < 40 && e.deltaX !== 0) || (d > 0 && d < 12)) {
        trackpadScore = Math.min(trackpadScore + 1, 6);
      } else if (d >= 80) {
        trackpadScore = Math.max(trackpadScore - 2, 0);
      }
      return trackpadScore >= 2;
    };

    const stop = () => {
      if (raf) cancelAnimationFrame(raf);
      raf = null;
      running = false;
    };

    const loop = () => {
      current += (target - current) * 0.14;
      if (Math.abs(target - current) < 0.5) {
        current = target;
        running = false;
        window.scrollTo({ top: current, behavior: "instant" });
        return;
      }
      window.scrollTo({ top: current, behavior: "instant" });
      raf = requestAnimationFrame(loop);
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return; // pinch-zoom
      if (looksLikeTrackpad(e)) { stop(); return; } // native inertia is better
      if (scrollableParent(e.target)) return;
      e.preventDefault();
      const delta = Math.max(-400, Math.min(normalizeDelta(e), 400));
      target = Math.max(0, Math.min(target + delta, maxScroll()));
      if (!running) {
        running = true;
        current = window.scrollY;
        raf = requestAnimationFrame(loop);
      }
    };

    // keep target in sync when scroll happens by other means (keyboard, anchors, trackpad)
    const onScroll = () => { if (!running) { target = window.scrollY; current = target; } };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      stop();
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}