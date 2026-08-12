import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import TadpoleCursor from "@/components/TadpoleCursor";

/**
 * The cursor is a small swimming animal.
 *
 * This component only mounts the sensory front-end (the pointer estimator), a
 * hairline precision mark drawn at the RAW pointer position — browser
 * hit-testing is always authoritative and never delayed — and the contextual
 * label. The organism itself lives in TadpoleCursor / lib/tadpole.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const labelRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return; // accessibility wins over the simulation
    setEnabled(true);
    document.body.classList.add("cursor-ready");

    const stopPointer = startPointerEngine();
    let lastLabel = "";

    const render = () => {
      const d = dotRef.current, l = labelRef.current;
      if (d) {
        d.style.opacity = pointer.inside ? (pointer.down ? "0.4" : "1") : "0";
        d.style.transform = `translate3d(${pointer.rawX.toFixed(1)}px, ${pointer.rawY.toFixed(1)}px, 0) translate(-50%,-50%)`;
      }
      if (l) {
        const text = pointer.label || lastLabel;
        if (l.textContent !== text) l.textContent = text;
        if (pointer.label) lastLabel = pointer.label;
        l.style.opacity = pointer.label && pointer.inside ? "1" : "0";
        l.style.transform = `translate3d(${(pointer.rawX + 16).toFixed(1)}px, ${(pointer.rawY - 14).toFixed(1)}px, 0)`;
      }
    };

    const unsubscribe = subscribe({ step: () => {}, render, settled: () => false });
    return () => {
      unsubscribe();
      stopPointer();
      document.body.classList.remove("cursor-ready");
    };
  }, []);

  if (!enabled) return null;
  return createPortal(
    <>
      <TadpoleCursor />
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0, width: 3, height: 3 }} aria-hidden />
      <div ref={labelRef} className="cursor-label" style={{ opacity: 0, transition: "opacity .2s ease" }} aria-hidden />
    </>,
    document.body
  );
}