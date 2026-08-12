import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine, kinetic } from "@/lib/physics/pointer";
import { MATERIAL, CURSOR, SLEEP } from "@/lib/physics/tokens";
import { integrateSpring, clamp, tanhSat, angleDelta } from "@/lib/physics/math";

/**
 * Coupled multi-body cursor driven by the global physics engine.
 *
 *  BODY A — dot   : precision material, chases the predicted pointer target
 *  BODY B — ring  : glass material, chases the dot (coupling, not the pointer)
 *  BODY C — label : paper material, chases the ring — settles last
 *  BODY D — trail : Verlet rope constrained to the dot
 *
 * Because B follows A and C follows B, the visible lag ordering emerges from
 * the coupling itself rather than from staggered delays.
 *
 * The ring integrates in a frame aligned to travel direction, with different
 * stiffness along the tangent and normal — it flows along its path while
 * staying tight across it. Deformation uses an area-preserving matrix
 * R(θ)·diag(eˢ,e⁻ˢ)·R(−θ), so the ring never gains or loses visual mass.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const trailRefs = useRef([]);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!fine || reduced) return;
    setEnabled(true);
    document.body.classList.add("cursor-ready");

    const stopPointer = startPointerEngine();

    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    // each body holds two 1-D spring states {x, v}
    const dotX = { x: cx, v: 0 }, dotY = { x: cy, v: 0 };
    const ringX = { x: cx, v: 0 }, ringY = { x: cy, v: 0 };
    const rope = Array.from({ length: CURSOR.trailNodes }, () => ({ x: cx, y: cy, px: cx, py: cy }));

    // scalar spring states for continuous material parameters
    const shear = { x: 0, v: 0 };
    const labelOpacity = { x: 0, v: 0 };
    let theta = 0;             // deformation orientation, degrees
    let trailEnergy = 0;
    let visible = false;
    let lastLabel = "";

    // reusable frame vectors — no allocation in the hot loop
    const tmp = { tx: 0, ty: 0, nx: 0, ny: 0 };
    const st = { x: 0, v: 0 }, sn = { x: 0, v: 0 };

    const step = (dt) => {
      if (!pointer.seen) return;
      if (!visible) {
        visible = true;
        dotX.x = ringX.x = pointer.x;
        dotY.x = ringY.x = pointer.y;
        rope.forEach(n => { n.x = n.px = pointer.x; n.y = n.py = pointer.y; });
        if (dotRef.current) dotRef.current.style.opacity = "1";
        if (ringRef.current) ringRef.current.style.opacity = "1";
      }

      // ── BODY A: precision spring on the predicted target ──────────────
      const P = MATERIAL.precision;
      integrateSpring(dotX, pointer.tx, P.omega, P.zeta, dt);
      integrateSpring(dotY, pointer.ty, P.omega, P.zeta, dt);

      // ── BODY B: anisotropic glass spring coupled to the dot ───────────
      const G = MATERIAL.glass;
      const s = pointer.speed;
      if (s > 30) { tmp.tx = pointer.vx / s; tmp.ty = pointer.vy / s; }
      else { tmp.tx = 1; tmp.ty = 0; }
      tmp.nx = -tmp.ty; tmp.ny = tmp.tx;

      // project (error, velocity) into the travel frame
      const erx = ringX.x - dotX.x, ery = ringY.x - dotY.x;
      const et = erx * tmp.tx + ery * tmp.ty;
      const en = erx * tmp.nx + ery * tmp.ny;
      const vt = ringX.v * tmp.tx + ringY.v * tmp.ty;
      const vn = ringX.v * tmp.nx + ringY.v * tmp.ny;

      st.x = et; st.v = vt; sn.x = en; sn.v = vn;
      integrateSpring(st, 0, G.omega * CURSOR.tangentScale, G.zeta, dt);
      integrateSpring(sn, 0, G.omega * CURSOR.normalScale, G.zeta, dt);

      // recompose into world coordinates (Rᵀ)
      ringX.x = dotX.x + st.x * tmp.tx + sn.x * tmp.nx;
      ringY.x = dotY.x + st.x * tmp.ty + sn.x * tmp.ny;
      ringX.v = st.v * tmp.tx + sn.v * tmp.nx;
      ringY.v = st.v * tmp.ty + sn.v * tmp.ny;

      // hard constraint: the dot can never leave the ring's interior
      const ox = ringX.x - dotX.x, oy = ringY.x - dotY.x;
      const od = Math.hypot(ox, oy);
      const maxOffset = 14;
      if (od > maxOffset) {
        const k = maxOffset / od;
        ringX.x = dotX.x + ox * k;
        ringY.x = dotY.x + oy * k;
      }

      // label text lives inside the ring — only its opacity is a body
      integrateSpring(labelOpacity, pointer.label ? 1 : 0, 22, 1.0, dt);

      // ── deformation: s = s_max·tanh(α|v|), suppressed while labelled ──
      const targetShear = pointer.label ? 0 : CURSOR.shearMax * tanhSat(CURSOR.shearAlpha * s);
      integrateSpring(shear, targetShear, 26, 1.0, dt);
      if (s > 60) {
        const want = (Math.atan2(pointer.vy, pointer.vx) * 180) / Math.PI;
        theta += angleDelta(want, theta) * clamp(dt * 14, 0, 1);
      }

      // ── BODY D: Verlet rope, Gauss–Seidel distance constraints ────────
      const retain = Math.pow(CURSOR.trailRetain, dt * 60);
      trailEnergy = 0;
      for (let i = 0; i < rope.length; i++) {
        const n = rope[i];
        const vx = (n.x - n.px) * retain, vy = (n.y - n.py) * retain;
        n.px = n.x; n.py = n.y;
        n.x += vx; n.y += vy;
        trailEnergy += vx * vx + vy * vy;
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < rope.length; i++) {
          const n = rope[i];
          const ax = i === 0 ? dotX.x : rope[i - 1].x;
          const ay = i === 0 ? dotY.x : rope[i - 1].y;
          const dx = n.x - ax, dy = n.y - ay;
          const d = Math.hypot(dx, dy);
          if (d > CURSOR.trailLink) {
            const k = (d - CURSOR.trailLink) / d;
            n.x -= dx * k; n.y -= dy * k;
          }
        }
      }
    };

    const render = () => {
      if (!visible) return;
      const d = dotRef.current, r = ringRef.current;
      if (d) d.style.transform = `translate3d(${dotX.x.toFixed(2)}px, ${dotY.x.toFixed(2)}px, 0) translate(-50%,-50%)`;

      if (r) {
        // R(θ)·diag(eˢ, e⁻ˢ)·R(−θ) → det = 1, area preserved
        const rad = (theta * Math.PI) / 180;
        const c = Math.cos(rad), sn2 = Math.sin(rad);
        const ep = Math.exp(shear.x), em = Math.exp(-shear.x);
        const a = ep * c * c + em * sn2 * sn2;
        const b = (ep - em) * c * sn2;
        const dd = ep * sn2 * sn2 + em * c * c;
        r.style.transform = `translate3d(${ringX.x.toFixed(2)}px, ${ringY.x.toFixed(2)}px, 0) translate(-50%,-50%) matrix(${a.toFixed(4)}, ${b.toFixed(4)}, ${b.toFixed(4)}, ${dd.toFixed(4)}, 0, 0)`;
        const hovering = !!pointer.target && !pointer.label;
        r.classList.toggle("is-hover", hovering);
        r.classList.toggle("is-label", !!pointer.label);
        r.style.opacity = pointer.down ? "0.5" : pointer.inside ? "1" : "0";

        // label text sits inside the ring, as originally
        const text = pointer.label || lastLabel;
        if (r.textContent !== text) r.textContent = text;
        if (pointer.label) lastLabel = pointer.label;
        r.style.color = `rgba(255,255,255,${labelOpacity.x.toFixed(3)})`;
      }

      // trail intensity from compressed kinetic energy — invisible when slow
      const intensity = kinetic();
      for (let i = 0; i < rope.length; i++) {
        const el = trailRefs.current[i];
        if (!el) continue;
        const fall = 1 - i / (rope.length + 1);
        el.style.opacity = (intensity * 0.42 * fall).toFixed(3);
        el.style.transform = `translate3d(${rope[i].x.toFixed(2)}px, ${rope[i].y.toFixed(2)}px, 0) translate(-50%,-50%) scale(${fall.toFixed(3)})`;
      }
    };

    const settled = () => {
      if (!visible) return true;
      const perr = Math.hypot(ringX.x - pointer.tx, ringY.x - pointer.ty);
      const vel = Math.hypot(ringX.v, ringY.v) + Math.hypot(dotX.v, dotY.v);
      return (
        perr < SLEEP.pos &&
        vel < SLEEP.vel &&
        trailEnergy < 0.02 &&
        Math.abs(shear.x) < 0.004 &&
        Math.abs(labelOpacity.v) < 0.01
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
      {Array.from({ length: CURSOR.trailNodes }).map((_, i) => (
        <div key={i} ref={(el) => (trailRefs.current[i] = el)} className="cursor-trail" style={{ opacity: 0 }} aria-hidden />
      ))}
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
    </>,
    document.body
  );
}