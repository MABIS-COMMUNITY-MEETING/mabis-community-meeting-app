import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import { MATERIAL, CURSOR, SLEEP } from "@/lib/physics/tokens";
import { integrateSpring, clamp, tanhSat, angleDelta } from "@/lib/physics/math";

/**
 * The cursor is simulated as a small swimming organism.
 *
 *   CORE  — the dot. A critically damped spring on the predicted pointer
 *           target: exact, never overshoots, defines "where you are".
 *   BODY  — the ring. A soft viscous membrane coupled to the core, integrated
 *           in the travel frame so it is loose along its path and tight across
 *           it, and deformed by an area-preserving matrix (det = 1) so it
 *           stretches without ever gaining or losing visual mass.
 *
 * Everything integrates on the shared fixed-timestep scheduler, so behaviour is
 * identical at 60Hz and 240Hz, and the whole system sleeps when it settles.
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

    // ── state ─────────────────────────────────────────────────────────
    const coreX = { x: cx, v: 0 }, coreY = { x: cy, v: 0 };
    const bodyX = { x: cx, v: 0 }, bodyY = { x: cy, v: 0 };
    const shear = { x: 0, v: 0 };
    const glow = { x: 0, v: 0 };            // label opacity
    const swim = { x: 0, v: 0 };            // 0..1 travel effort

    let theta = 0;     // deformation orientation (deg)
    let visible = false;
    let lastLabel = "";

    // scratch — the hot loop allocates nothing
    const f = { tx: 1, ty: 0, nx: 0, ny: 1 };
    const st = { x: 0, v: 0 }, sn = { x: 0, v: 0 };

    const step = (dt) => {
      if (!pointer.seen) return;

      if (!visible) {
        visible = true;
        coreX.x = bodyX.x = pointer.x;
        coreY.x = bodyY.x = pointer.y;
      }

      // ── CORE ────────────────────────────────────────────────────────
      const P = MATERIAL.precision;
      integrateSpring(coreX, pointer.tx, P.omega, P.zeta, dt);
      integrateSpring(coreY, pointer.ty, P.omega, P.zeta, dt);

      // travel frame (tangent / normal)
      const s = pointer.speed;
      // only trust the travel direction once the movement is clearly intentional —
      // below that, a sensitive mouse's noise flips the frame and shakes the ring
      if (s > 90) { f.tx = pointer.vx / s; f.ty = pointer.vy / s; }
      f.nx = -f.ty; f.ny = f.tx;

      // ── BODY: anisotropic viscous spring coupled to the core ────────
      const G = MATERIAL.glass;
      const ex = bodyX.x - coreX.x, ey = bodyY.x - coreY.x;
      st.x = ex * f.tx + ey * f.ty;
      sn.x = ex * f.nx + ey * f.ny;
      st.v = bodyX.v * f.tx + bodyY.v * f.ty;
      sn.v = bodyX.v * f.nx + bodyY.v * f.ny;

      integrateSpring(st, 0, G.omega * CURSOR.tangentScale, G.zeta, dt);
      integrateSpring(sn, 0, G.omega * CURSOR.normalScale, G.zeta, dt);

      bodyX.x = coreX.x + st.x * f.tx + sn.x * f.nx;
      bodyY.x = coreY.x + st.x * f.ty + sn.x * f.ny;
      bodyX.v = st.v * f.tx + sn.v * f.nx;
      bodyY.v = st.v * f.ty + sn.v * f.ny;

      // the core must stay enclosed by the body
      const ox = bodyX.x - coreX.x, oy = bodyY.x - coreY.x;
      const lag = Math.hypot(ox, oy);
      if (lag > CURSOR.maxLag) {
        const k = CURSOR.maxLag / lag;
        bodyX.x = coreX.x + ox * k;
        bodyY.x = coreY.x + oy * k;
      }

      // ── deformation: speed + lag, saturated, then softly sprung ─────
      const effort = tanhSat(CURSOR.shearAlpha * s + lag / 46);
      integrateSpring(swim, effort, 5.5, 1.0, dt);
      // drive deformation from the smoothed effort, never the raw sample
      integrateSpring(shear, pointer.label ? 0 : CURSOR.shearMax * swim.x, 7, 1.0, dt);
      integrateSpring(glow, pointer.label ? 1 : 0, 22, 1.0, dt);

      if (s > 140) {
        const want = (Math.atan2(pointer.vy, pointer.vx) * 180) / Math.PI;
        theta += angleDelta(want, theta) * clamp(dt * 7, 0, 1);
      }
    };

    const render = () => {
      if (!visible) return;
      const d = dotRef.current, r = ringRef.current;

      if (d) {
        d.style.opacity = pointer.inside ? "1" : "0";
        d.style.transform = `translate3d(${coreX.x.toFixed(2)}px, ${coreY.x.toFixed(2)}px, 0) translate(-50%,-50%)`;
      }

      if (r) {
        // R(θ)·diag(eˢ, e⁻ˢ)·R(−θ) — determinant 1, so area is preserved
        const rad = (theta * Math.PI) / 180;
        const c = Math.cos(rad), sn2 = Math.sin(rad);
        const ep = Math.exp(shear.x), em = Math.exp(-shear.x);
        const m11 = ep * c * c + em * sn2 * sn2;
        const m12 = (ep - em) * c * sn2;
        const m22 = ep * sn2 * sn2 + em * c * c;
        r.style.transform = `translate3d(${bodyX.x.toFixed(2)}px, ${bodyY.x.toFixed(2)}px, 0) translate(-50%,-50%) matrix(${m11.toFixed(4)}, ${m12.toFixed(4)}, ${m12.toFixed(4)}, ${m22.toFixed(4)}, 0, 0)`;
        r.classList.toggle("is-hover", !!pointer.target && !pointer.label);
        r.classList.toggle("is-label", !!pointer.label);
        // a click compresses the glass and energises it optically — it does not
        // fade out (opacity would betray the material as a transparent div)
        r.style.opacity = pointer.inside ? "1" : "0";
        r.style.setProperty("--glass-press", pointer.down ? "1" : "0");
        r.classList.toggle("is-press", !!pointer.down);

        const text = pointer.label || lastLabel;
        if (r.textContent !== text) r.textContent = text;
        if (pointer.label) lastLabel = pointer.label;
        r.style.color = `rgba(255,255,255,${glow.x.toFixed(3)})`;
      }
    };

    const settled = () => {
      if (!visible) return true;
      const err = Math.hypot(bodyX.x - pointer.tx, bodyY.x - pointer.ty);
      const vel = Math.hypot(bodyX.v, bodyY.v) + Math.hypot(coreX.v, coreY.v);
      return (
        err < SLEEP.pos &&
        vel < SLEEP.vel &&
        swim.x < 0.01 &&
        Math.abs(shear.x) < 0.004 &&
        Math.abs(glow.v) < 0.01
      );
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