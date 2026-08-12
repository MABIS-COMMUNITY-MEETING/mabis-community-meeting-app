import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LiquidGlassEngine } from "liquid-glass-web-react";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import { MATERIAL, SLEEP } from "@/lib/physics/tokens";
import { integrateSpring } from "@/lib/physics/math";

/**
 * The cursor is an oval lens of liquid glass swimming above the page.
 *
 * The lens is driven by liquid-glass-web-react's engine: it refracts the live
 * DOM of #root through a generated displacement map, so text genuinely bends
 * under the cursor instead of being tinted. Position comes from a critically
 * damped spring on the predicted pointer, pushed straight into the engine once
 * per frame — no React re-renders, no map regeneration.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const defsRef = useRef(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    document.body.classList.add("cursor-ready");

    const stopPointer = startPointerEngine();
    const root = document.getElementById("root");

    let engine = null;
    try {
      engine = new LiquidGlassEngine({
        container: root,
        filtered: root,
        defsHost: defsRef.current,
      });
      engine.setOptions({
        width: 54,
        height: 38,
        radius: "auto",
        strength: 0.055,
        chromaticAberration: 0.28,
        curvature: 0.8,
        depth: 12,
        glow: 0.18,
        edgeHighlight: 0.35,
        shadow: false,
      });
    } catch {
      engine = null;
    }

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    const coreX = { x: cx, v: 0 }, coreY = { x: cy, v: 0 };
    let visible = false;

    const step = (dt) => {
      if (!pointer.seen) return;
      if (!visible) {
        visible = true;
        coreX.x = pointer.x; coreY.x = pointer.y;
      }
      const P = MATERIAL.precision;
      integrateSpring(coreX, pointer.tx, P.omega, P.zeta, dt);
      integrateSpring(coreY, pointer.ty, P.omega, P.zeta, dt);
    };

    const render = () => {
      if (!visible) return;
      const d = dotRef.current;
      if (d) {
        d.style.opacity = pointer.inside ? "1" : "0";
        d.style.transform = `translate3d(${coreX.x.toFixed(2)}px, ${coreY.x.toFixed(2)}px, 0) translate(-50%,-50%)`;
      }
      if (engine) {
        const r = root.getBoundingClientRect();
        engine.setPosition(
          (coreX.x - r.left) / (r.width || 1),
          (coreY.x - r.top) / (r.height || 1)
        );
      }
    };

    const settled = () => {
      if (!visible) return true;
      const err = Math.hypot(coreX.x - pointer.tx, coreY.x - pointer.ty);
      const vel = Math.hypot(coreX.v, coreY.v);
      return err < SLEEP.pos && vel < SLEEP.vel;
    };

    const unsubscribe = subscribe({ step, render, settled });
    return () => {
      unsubscribe();
      stopPointer();
      engine?.destroy?.();
      document.body.classList.remove("cursor-ready");
    };
  }, []);

  if (!enabled) return null;

  return createPortal(
    <>
      <svg ref={defsRef} width="0" height="0" aria-hidden style={{ position: "fixed" }} />
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
    </>,
    document.body
  );
}