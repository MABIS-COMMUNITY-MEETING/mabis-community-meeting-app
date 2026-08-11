import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Liquid custom cursor. A rigid center dot tracks the pointer instantly while
 * a spring-following ring lags, stretches along its velocity vector, and
 * relaxes back to a circle at rest. Context labels (VIEW / DRAG / OPEN …) are
 * read from [data-cursor] on the hovered element. Touch + reduced-motion safe.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    document.body.classList.add("cursor-ready");

    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ring = { x: pos.x, y: pos.y };
    let prev = { x: ring.x, y: ring.y, t: performance.now() };
    let scaleX = 1;
    let raf;

    let seen = false;
    const onMove = (e) => {
      pos.x = e.clientX; pos.y = e.clientY;
      if (!seen) {
        seen = true;
        ring.x = pos.x; ring.y = pos.y;
        if (dotRef.current) dotRef.current.style.opacity = "1";
        if (ringRef.current) ringRef.current.style.opacity = "1";
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
      }
      const t = e.target.closest?.("a, button, [role='button'], [data-cursor], input, textarea, select, label");
      const label = t?.getAttribute?.("data-cursor");
      const r = ringRef.current; if (!r) return;
      r.classList.toggle("is-hover", !!t && !label);
      r.classList.toggle("is-label", !!label);
      r.textContent = label || "";
    };
    const onDown = () => ringRef.current && (ringRef.current.style.opacity = "0.5");
    const onUp = () => ringRef.current && (ringRef.current.style.opacity = "1");

    const loop = () => {
      const dx = pos.x - ring.x, dy = pos.y - ring.y;
      ring.x += dx * 0.16; ring.y += dy * 0.16;
      const now = performance.now();
      const dt = Math.max(now - prev.t, 1);
      const vx = (ring.x - prev.x) / dt;
      const vy = (ring.y - prev.y) / dt;
      const r = ringRef.current;
      const hasLabel = r && r.classList.contains("is-label");
      const speed = Math.hypot(vx, vy);
      const target = hasLabel ? 1 : 1 + Math.min(speed * 0.45, 1.15);
      scaleX += (target - scaleX) * 0.18;
      const angle = !hasLabel && speed > 0.03 ? (Math.atan2(ring.y - prev.y, ring.x - prev.x) * 180) / Math.PI : 0;
      if (r) {
        r.style.transform = `translate(${ring.x}px, ${ring.y}px) translate(-50%,-50%) rotate(${angle}deg) scale(${scaleX}, ${1 / Math.max(scaleX, 1)})`;
      }
      prev = { x: ring.x, y: ring.y, t: now };
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.body.classList.remove("cursor-ready");
    };
  }, []);

  if (!enabled) return null;
  return createPortal(
    <>
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
    </>,
    document.body
  );
}