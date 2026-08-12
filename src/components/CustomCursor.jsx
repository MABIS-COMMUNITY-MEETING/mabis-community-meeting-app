import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Physics-driven custom cursor.
 *
 * Integration model (per frame, dt normalised to a 60Hz step):
 *  · Dot   — critically-damped analytic spring (ω, ζ) toward the raw pointer.
 *  · Ring  — a damped harmonic oscillator with mass, integrated semi-implicit
 *            Euler, plus a magnetic force field: nearby interactive elements
 *            pull the ring toward their centre with an inverse-square-ish
 *            falloff clamped by the element's own radius.
 *  · Shape — squash/stretch from the velocity magnitude, conserving area
 *            (sx * sy = 1), oriented along the velocity vector with angular
 *            smoothing across the ±π branch cut.
 *  · Trail — a 5-node Verlet rope: each node integrates x' = x + (x - x_prev)*d
 *            then is projected back to a max distance from its parent
 *            (Gauss–Seidel distance constraint, 2 relaxation passes).
 *
 * Sleeps when the system's total kinetic energy falls below a threshold, and
 * while the tab is hidden. Touch + reduced-motion safe.
 */

const TRAIL = 5;

// spring constants
const RING_K = 0.052;      // stiffness
const RING_D = 0.76;       // damping (velocity retention per step)
const DOT_K = 0.42;
const DOT_D = 0.55;
const MAG_RADIUS = 110;    // magnetic field radius (px beyond element bounds)
const MAG_STRENGTH = 0.30; // max fraction of the gap the field can close
const ROPE_LINK = 9;       // max distance between trail nodes

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

    const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
    const pointer = { x: cx, y: cy };
    const dot = { x: cx, y: cy, vx: 0, vy: 0 };
    const ring = { x: cx, y: cy, vx: 0, vy: 0 };
    const rope = Array.from({ length: TRAIL }, () => ({ x: cx, y: cy, px: cx, py: cy }));

    let scaleX = 1, angle = 0;
    let magnet = null;          // { x, y, r } centre of the hovered target
    let raf = null, last = performance.now();

    const wake = () => { if (raf === null && !document.hidden) { last = performance.now(); raf = requestAnimationFrame(loop); } };

    let seen = false;
    const onMove = (e) => {
      pointer.x = e.clientX; pointer.y = e.clientY;
      if (!seen) {
        seen = true;
        dot.x = ring.x = pointer.x; dot.y = ring.y = pointer.y;
        rope.forEach(n => { n.x = n.px = pointer.x; n.y = n.py = pointer.y; });
        if (dotRef.current) dotRef.current.style.opacity = "1";
        if (ringRef.current) ringRef.current.style.opacity = "1";
      }

      const t = e.target.closest?.("a, button, [role='button'], [data-cursor], input, textarea, select, label");
      const label = t?.getAttribute?.("data-cursor");
      const r = ringRef.current;
      if (r) {
        r.classList.toggle("is-hover", !!t && !label);
        r.classList.toggle("is-label", !!label);
        if (r.textContent !== (label || "")) r.textContent = label || "";
      }

      // build the magnetic attractor from the hovered element's box
      if (t) {
        const b = t.getBoundingClientRect();
        magnet = { x: b.left + b.width / 2, y: b.top + b.height / 2, r: Math.max(b.width, b.height) / 2 };
      } else {
        magnet = null;
      }
      wake();
    };

    const onDown = () => { ringRef.current && (ringRef.current.style.opacity = "0.5"); wake(); };
    const onUp = () => { ringRef.current && (ringRef.current.style.opacity = "1"); wake(); };
    const onVisibility = () => { if (document.hidden) { cancelAnimationFrame(raf); raf = null; } else wake(); };

    const loop = (now) => {
      // dt in 60Hz units, clamped so a stalled tab can't explode the integrator
      const dt = Math.min((now - last) / 16.667, 3);
      last = now;

      // ── target: pointer, bent by the magnetic field ──────────────────
      let tx = pointer.x, ty = pointer.y;
      if (magnet) {
        const mx = magnet.x - pointer.x, my = magnet.y - pointer.y;
        const d = Math.hypot(mx, my);
        const reach = magnet.r + MAG_RADIUS;
        if (d < reach && d > 0.001) {
          // smoothstep falloff: 1 at the centre → 0 at the field edge
          const u = 1 - d / reach;
          const fall = u * u * (3 - 2 * u);
          tx += mx * fall * MAG_STRENGTH;
          ty += my * fall * MAG_STRENGTH;
        }
      }

      // ── dot: stiff spring, semi-implicit Euler ───────────────────────
      dot.vx = (dot.vx + (pointer.x - dot.x) * DOT_K * dt) * Math.pow(DOT_D, dt);
      dot.vy = (dot.vy + (pointer.y - dot.y) * DOT_K * dt) * Math.pow(DOT_D, dt);
      dot.x += dot.vx * dt; dot.y += dot.vy * dt;

      // ── ring: soft damped oscillator toward the magnet-bent target ───
      ring.vx = (ring.vx + (tx - ring.x) * RING_K * dt) * Math.pow(RING_D, dt);
      ring.vy = (ring.vy + (ty - ring.y) * RING_K * dt) * Math.pow(RING_D, dt);
      ring.x += ring.vx * dt; ring.y += ring.vy * dt;

      // ── shape: area-conserving squash/stretch along velocity ─────────
      const r = ringRef.current;
      const hasLabel = r && r.classList.contains("is-label");
      const speed = Math.hypot(ring.vx, ring.vy);
      const target = hasLabel ? 1 : 1 + Math.min(speed * 0.055, 1.1);
      scaleX += (target - scaleX) * Math.min(0.16 * dt, 1);
      if (!hasLabel && speed > 0.35) {
        // shortest-arc angular interpolation across the ±180° seam
        const want = (Math.atan2(ring.vy, ring.vx) * 180) / Math.PI;
        let delta = ((want - angle + 540) % 360) - 180;
        angle += delta * Math.min(0.25 * dt, 1);
      }
      if (r) {
        r.style.transform = `translate(${ring.x}px, ${ring.y}px) translate(-50%,-50%) rotate(${angle}deg) scale(${scaleX.toFixed(4)}, ${(1 / Math.max(scaleX, 1)).toFixed(4)})`;
      }
      if (dotRef.current) {
        dotRef.current.style.transform = `translate(${dot.x}px, ${dot.y}px) translate(-50%,-50%)`;
      }

      // ── trail: Verlet rope with distance constraints ─────────────────
      let ropeEnergy = 0;
      for (let i = 0; i < TRAIL; i++) {
        const n = rope[i];
        const vx = (n.x - n.px) * 0.82, vy = (n.y - n.py) * 0.82;
        n.px = n.x; n.py = n.y;
        n.x += vx * dt; n.y += vy * dt;
        ropeEnergy += vx * vx + vy * vy;
      }
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < TRAIL; i++) {
          const n = rope[i];
          const ax = i === 0 ? dot.x : rope[i - 1].x;
          const ay = i === 0 ? dot.y : rope[i - 1].y;
          const dx = n.x - ax, dy = n.y - ay;
          const d = Math.hypot(dx, dy);
          if (d > ROPE_LINK) {
            const k = (d - ROPE_LINK) / d;
            n.x -= dx * k; n.y -= dy * k;
          }
        }
      }
      for (let i = 0; i < TRAIL; i++) {
        const el = trailRefs.current[i];
        if (el) {
          const s = 1 - i / (TRAIL + 1);
          el.style.transform = `translate(${rope[i].x}px, ${rope[i].y}px) translate(-50%,-50%) scale(${s.toFixed(3)})`;
        }
      }

      // ── sleep when the whole system is at rest ───────────────────────
      const energy =
        ring.vx * ring.vx + ring.vy * ring.vy +
        dot.vx * dot.vx + dot.vy * dot.vy +
        ropeEnergy;
      const settled =
        energy < 0.004 &&
        Math.abs(tx - ring.x) < 0.2 && Math.abs(ty - ring.y) < 0.2 &&
        Math.abs(scaleX - 1) < 0.004;
      if (settled) { raf = null; return; }

      raf = requestAnimationFrame(loop);
    };

    wake();
    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mousedown", onDown, { passive: true });
    window.addEventListener("mouseup", onUp, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.body.classList.remove("cursor-ready");
    };
  }, []);

  if (!enabled) return null;
  return createPortal(
    <>
      {Array.from({ length: TRAIL }).map((_, i) => (
        <div
          key={i}
          ref={(el) => (trailRefs.current[i] = el)}
          className="cursor-trail"
          style={{ opacity: 0.5 - i * 0.09 }}
          aria-hidden
        />
      ))}
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
    </>,
    document.body
  );
}