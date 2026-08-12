import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import { MATERIAL, SLEEP } from "@/lib/physics/tokens";
import { integrateSpring } from "@/lib/physics/math";

/**
 * Simple two-part cursor: a precise dot on the pointer and a soft ring
 * trailing it on a spring. No glass, no filters.
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

    const stopPointer = startPointerEngine();

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const dotX = { x: cx, v: 0 }, dotY = { x: cy, v: 0 };
    const ringX = { x: cx, v: 0 }, ringY = { x: cy, v: 0 };
    let visible = false;

    const step = (dt) => {
      if (!pointer.seen) return;
      if (!visible) {
        visible = true;
        dotX.x = ringX.x = pointer.x;
        dotY.x = ringY.x = pointer.y;
      }
      const P = MATERIAL.precision;
      integrateSpring(dotX, pointer.tx, P.omega, P.zeta, dt);
      integrateSpring(dotY, pointer.ty, P.omega, P.zeta, dt);
      integrateSpring(ringX, dotX.x, 9.4, 0.82, dt);
      integrateSpring(ringY, dotY.x, 9.4, 0.82, dt);
    };

    const render = () => {
      if (!visible) return;
      const d = dotRef.current, r = ringRef.current;
      const op = pointer.inside ? "1" : "0";
      if (d) {
        d.style.opacity = op;
        d.style.transform = `translate3d(${dotX.x.toFixed(2)}px, ${dotY.x.toFixed(2)}px, 0) translate(-50%,-50%)`;
      }
      if (r) {
        const s = pointer.down ? 0.82 : pointer.target ? 1.45 : 1;
        r.style.opacity = op;
        r.style.transform = `translate3d(${ringX.x.toFixed(2)}px, ${ringY.x.toFixed(2)}px, 0) translate(-50%,-50%) scale(${s})`;
      }
    };

    const settled = () => {
      if (!visible) return true;
      const err = Math.hypot(ringX.x - pointer.tx, ringY.x - pointer.ty);
      const vel = Math.hypot(ringX.v, ringY.v) + Math.hypot(dotX.v, dotY.v);
      return err < SLEEP.pos && vel < SLEEP.vel;
    };

    const unsubscribe = subscribe({ step, render, settled });
    return () => {
      unsubscribe();
      stopPointer();
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