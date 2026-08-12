import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine, kinetic } from "@/lib/physics/pointer";
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
 *   TAIL  — an inextensible chain behind the core. Each link is a Verlet
 *           particle with distance constraints (length is conserved) plus a
 *           bending constraint that resists sharp kinks, so the chain reads as
 *           one continuous curve. A travelling sine wave, whose amplitude and
 *           frequency scale with swimming speed, is injected along the chain
 *           normals — that is what produces the tadpole's undulation instead of
 *           a lifeless trail.
 *
 * Everything integrates on the shared fixed-timestep scheduler, so behaviour is
 * identical at 60Hz and 240Hz, and the whole system sleeps when it settles.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const tailRefs = useRef([]);
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
    const N = CURSOR.trailNodes;

    // ── state ─────────────────────────────────────────────────────────
    const coreX = { x: cx, v: 0 }, coreY = { x: cy, v: 0 };
    const bodyX = { x: cx, v: 0 }, bodyY = { x: cy, v: 0 };
    const shear = { x: 0, v: 0 };
    const glow = { x: 0, v: 0 };            // label opacity
    const swim = { x: 0, v: 0 };            // 0..1 swimming effort
    const tail = Array.from({ length: N }, () => ({ x: cx, y: cy, px: cx, py: cy }));

    let theta = 0;     // deformation orientation (deg)
    let phase = 0;     // tail wave phase (rad)
    let visible = false;
    let lastLabel = "";
    let tailEnergy = 0;

    // scratch — the hot loop allocates nothing
    const f = { tx: 1, ty: 0, nx: 0, ny: 1 };
    const st = { x: 0, v: 0 }, sn = { x: 0, v: 0 };

    const step = (dt) => {
      if (!pointer.seen) return;

      if (!visible) {
        visible = true;
        coreX.x = bodyX.x = pointer.x;
        coreY.x = bodyY.x = pointer.y;
        for (const n of tail) { n.x = n.px = pointer.x; n.y = n.py = pointer.y; }
      }

      // ── CORE ────────────────────────────────────────────────────────
      const P = MATERIAL.precision;
      integrateSpring(coreX, pointer.tx, P.omega, P.zeta, dt);
      integrateSpring(coreY, pointer.ty, P.omega, P.zeta, dt);

      // travel frame (tangent / normal)
      const s = pointer.speed;
      if (s > 25) { f.tx = pointer.vx / s; f.ty = pointer.vy / s; }
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
      const effort = tanhSat(CURSOR.shearAlpha * s + lag / 24);
      integrateSpring(swim, effort, 7, 0.9, dt);
      integrateSpring(shear, pointer.label ? 0 : CURSOR.shearMax * effort, 9, 0.8, dt);
      integrateSpring(glow, pointer.label ? 1 : 0, 22, 1.0, dt);

      if (s > 50) {
        const want = (Math.atan2(pointer.vy, pointer.vx) * 180) / Math.PI;
        theta += angleDelta(want, theta) * clamp(dt * 12, 0, 1);
      }

      // ── TAIL ────────────────────────────────────────────────────────
      // wave frequency rises with effort — a resting tadpole barely stirs
      phase += dt * (4 + 16 * swim.x);
      const amp = CURSOR.waveAmp * swim.x;

      // Verlet integration with velocity retention
      const retain = Math.pow(CURSOR.trailRetain, dt * 60);
      tailEnergy = 0;
      for (let i = 0; i < N; i++) {
        const n = tail[i];
        const vx = (n.x - n.px) * retain, vy = (n.y - n.py) * retain;
        n.px = n.x; n.py = n.y;
        n.x += vx; n.y += vy;
        // travelling wave, growing toward the tip
        const grow = (i + 1) / N;
        const w = Math.sin(phase - i * CURSOR.waveLength) * amp * grow * dt * 60;
        n.x += f.nx * w;
        n.y += f.ny * w;
        tailEnergy += vx * vx + vy * vy;
      }

      // constraints — two relaxation passes keep the chain taut and smooth
      for (let pass = 0; pass < 2; pass++) {
        // distance: each link holds its rest length from its parent
        for (let i = 0; i < N; i++) {
          const n = tail[i];
          const ax = i === 0 ? coreX.x : tail[i - 1].x;
          const ay = i === 0 ? coreY.x : tail[i - 1].y;
          const dx = n.x - ax, dy = n.y - ay;
          const d = Math.hypot(dx, dy) || 1;
          const k = (d - CURSOR.trailLink) / d;
          n.x -= dx * k; n.y -= dy * k;
        }
        // bending: pull each node toward the midpoint of its neighbours,
        // which penalises curvature and removes kinks
        for (let i = 1; i < N - 1; i++) {
          const a = tail[i - 1], n = tail[i], b = tail[i + 1];
          n.x += ((a.x + b.x) * 0.5 - n.x) * CURSOR.bendStiffness;
          n.y += ((a.y + b.y) * 0.5 - n.y) * CURSOR.bendStiffness;
        }
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
        r.style.opacity = pointer.down ? "0.5" : pointer.inside ? "1" : "0";

        const text = pointer.label || lastLabel;
        if (r.textContent !== text) r.textContent = text;
        if (pointer.label) lastLabel = pointer.label;
        r.style.color = `rgba(255,255,255,${glow.x.toFixed(3)})`;
      }

      const intensity = kinetic();
      for (let i = 0; i < N; i++) {
        const el = tailRefs.current[i];
        if (!el) continue;
        const taper = Math.pow(1 - i / N, 1.5);
        el.style.opacity = pointer.inside ? ((0.26 + intensity * 0.5) * taper).toFixed(3) : "0";
        el.style.transform = `translate3d(${tail[i].x.toFixed(2)}px, ${tail[i].y.toFixed(2)}px, 0) translate(-50%,-50%) scale(${(taper * 1.6).toFixed(3)})`;
      }
    };

    const settled = () => {
      if (!visible) return true;
      const err = Math.hypot(bodyX.x - pointer.tx, bodyY.x - pointer.ty);
      const vel = Math.hypot(bodyX.v, bodyY.v) + Math.hypot(coreX.v, coreY.v);
      return (
        err < SLEEP.pos &&
        vel < SLEEP.vel &&
        tailEnergy < 0.02 &&
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
      {Array.from({ length: CURSOR.trailNodes }).map((_, i) => (
        <div key={i} ref={(el) => (tailRefs.current[i] = el)} className="cursor-trail" style={{ opacity: 0 }} aria-hidden />
      ))}
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
    </>,
    document.body
  );
}