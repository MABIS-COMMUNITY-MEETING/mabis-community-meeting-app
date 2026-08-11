import { useEffect, useRef, useState } from "react";

/**
 * Custom cursor: a small dot rigidly following the pointer + a lagging ring
 * that grows when hovering interactive elements and shows a label
 * (VIEW / OPEN / DRAG) when a [data-cursor="..."] attribute is present.
 * Disabled on touch / coarse pointers and when prefers-reduced-motion is set.
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
    let raf;

    const onMove = (e) => {
      pos.x = e.clientX; pos.y = e.clientY;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%,-50%)`;
      }
      const t = e.target.closest?.("a, button, [role='button'], [data-cursor], input, textarea, select, label");
      const label = t?.getAttribute?.("data-cursor");
      ringRef.current.classList.toggle("is-hover", !!t && !label);
      ringRef.current.classList.toggle("is-label", !!label);
      ringRef.current.textContent = label || "";
    };
    const onDown = () => ringRef.current && (ringRef.current.style.opacity = "0.4");
    const onUp = () => ringRef.current && (ringRef.current.style.opacity = "1");
    const onLeave = () => { if (dotRef.current) dotRef.current.style.opacity = "0"; if (ringRef.current) ringRef.current.style.opacity = "0"; };
    const onEnter = () => { if (dotRef.current) dotRef.current.style.opacity = "1"; if (ringRef.current) ringRef.current.style.opacity = "1"; };

    const loop = () => {
      ring.x += (pos.x - ring.x) * 0.18;
      ring.y += (pos.y - ring.y) * 0.18;
      if (ringRef.current) ringRef.current.style.transform = `translate(${ring.x}px, ${ring.y}px) translate(-50%,-50%)`;
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
      document.body.classList.remove("cursor-ready");
    };
  }, []);

  if (!enabled) return null;
  return (
    <>
      <div ref={dotRef} className="cursor-dot" aria-hidden />
      <div ref={ringRef} className="cursor-ring" aria-hidden />
    </>
  );
}