import { useEffect } from "react";
import { isLinux } from "@/lib/perf";

/**
 * Inertial smooth scrolling. Intercepts wheel input and eases the window
 * scroll position toward a target with a rAF lerp — keeps native fixed/sticky
 * elements intact (no transform wrapper). Disabled on touch, reduced-motion,
 * and inside independently scrollable panes.
 */
export default function SmoothScroll() {
  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced || isLinux) return; // native scroll is far cheaper on Linux

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

    const loop = () => {
      current += (target - current) * 0.11;
      if (Math.abs(target - current) < 0.4) {
        current = target;
        running = false;
        window.scrollTo(0, current);
        return;
      }
      window.scrollTo(0, current);
      raf = requestAnimationFrame(loop);
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return;
      if (scrollableParent(e.target)) return;
      e.preventDefault();
      target = Math.max(0, Math.min(target + e.deltaY, maxScroll()));
      if (!running) {
        running = true;
        current = window.scrollY;
        raf = requestAnimationFrame(loop);
      }
    };

    // keep target in sync when scroll happens by other means (keyboard, anchors)
    const onScroll = () => { if (!running) { target = window.scrollY; current = target; } };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      if (raf) cancelAnimationFrame(raf);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return null;
}