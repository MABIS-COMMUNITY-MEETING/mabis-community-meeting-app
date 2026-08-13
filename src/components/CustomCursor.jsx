import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import { CURSOR } from "@/lib/physics/tokens";
import { integrateSpring, clamp, tanhSat, angleDelta } from "@/lib/physics/math";
import { lowPowerMode, PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";
import { customCursorEnabled, CURSOR_EVENT } from "@/lib/cursor-preference";

/**
 * The cursor keeps the browser pointer's OS-processed position exact while its
 * outline behaves like a small swimming organism.
 *
 *   POSITION — the dot and ring share PointerEvent clientX/clientY directly.
 *              Those CSS-pixel coordinates already include the OS sensitivity
 *              and acceleration; extra smoothing, prediction, or DPR scaling
 *              would make the visual pointer diverge from the native pointer.
 *   MATERIAL — the ring deforms from estimated speed using an area-preserving
 *              matrix (det = 1), so it stays expressive without moving the
 *              cursor's actual point of aim.
 *
 * Deformation integrates on the shared fixed-timestep scheduler, so behaviour
 * is identical at 60Hz and 240Hz and the system sleeps when it settles.
 */
export default function CustomCursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);
  const [enabled, setEnabled] = useState(false);
  const [lowPower, setLowPower] = useState(lowPowerMode);
  const [preferenceEnabled, setPreferenceEnabled] = useState(customCursorEnabled);

  useEffect(() => {
    const updateTier = (event) => setLowPower(event.detail);
    window.addEventListener(PERFORMANCE_TIER_EVENT, updateTier);
    return () => window.removeEventListener(PERFORMANCE_TIER_EVENT, updateTier);
  }, []);

  useEffect(() => {
    const updatePreference = (event) => setPreferenceEnabled(Boolean(event.detail));
    window.addEventListener(CURSOR_EVENT, updatePreference);
    return () => window.removeEventListener(CURSOR_EVENT, updatePreference);
  }, []);

  useEffect(() => {
    setEnabled(false);
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!preferenceEnabled || !fine || reduced || lowPower) {
      document.body.classList.remove("cursor-ready");
      return;
    }
    setEnabled(true);
    document.body.classList.add("cursor-ready");

    const stopPointer = startPointerEngine();

    // ── state ─────────────────────────────────────────────────────────
    const shear = { x: 0, v: 0 };
    const glow = { x: 0, v: 0 };            // label opacity
    const swim = { x: 0, v: 0 };            // 0..1 travel effort

    let theta = 0;     // deformation orientation (deg)
    let visible = false;
    let lastLabel = "";
    let prevShear = 0, prevTheta = 0, prevGlow = 0;
    let lastHover = false, lastIsLabel = false, lastDotOpacity = "", lastRingOpacity = "", lastColor = "";

    const step = (dt) => {
      if (!pointer.seen) return;

      if (!visible) visible = true;

      // Only the material response is interpolated. Position stays on the most
      // recent browser pointer sample so the page adds no sensitivity or lag.
      prevShear = shear.x; prevTheta = theta; prevGlow = glow.x;

      const s = pointer.speed;
      const effort = tanhSat(CURSOR.shearAlpha * s);
      integrateSpring(swim, effort, 5.5, 1.0, dt);
      // Drive deformation from smoothed effort, never the raw sample. This
      // changes the ring's shape only; its centre stays at the OS pointer.
      integrateSpring(shear, pointer.label ? 0 : CURSOR.shearMax * swim.x, 7, 1.0, dt);
      integrateSpring(glow, pointer.label ? 1 : 0, 22, 1.0, dt);

      if (s > 140) {
        const want = (Math.atan2(pointer.vy, pointer.vx) * 180) / Math.PI;
        theta += angleDelta(want, theta) * clamp(dt * 7, 0, 1);
      }
    };

    const render = (alpha = 1) => {
      if (!visible) return;
      const d = dotRef.current, r = ringRef.current;
      const a = clamp(alpha, 0, 1);
      const px = pointer.rawX;
      const py = pointer.rawY;
      const sh = prevShear + (shear.x - prevShear) * a;
      const th = prevTheta + angleDelta(theta, prevTheta) * a;
      const gl = prevGlow + (glow.x - prevGlow) * a;

      if (d) {
        const opacity = pointer.inside ? "1" : "0";
        if (opacity !== lastDotOpacity) { d.style.opacity = opacity; lastDotOpacity = opacity; }
        d.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) translate(-50%,-50%)`;
      }

      if (r) {
        // R(θ)·diag(eˢ, e⁻ˢ)·R(−θ) — determinant 1, so area is preserved
        const rad = (th * Math.PI) / 180;
        const c = Math.cos(rad), sn2 = Math.sin(rad);
        const ep = Math.exp(sh), em = Math.exp(-sh);
        const m11 = ep * c * c + em * sn2 * sn2;
        const m12 = (ep - em) * c * sn2;
        const m22 = ep * sn2 * sn2 + em * c * c;
        r.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) translate(-50%,-50%) matrix(${m11.toFixed(4)}, ${m12.toFixed(4)}, ${m12.toFixed(4)}, ${m22.toFixed(4)}, 0, 0)`;
        const hover = !!pointer.target && !pointer.label;
        const isLabel = !!pointer.label;
        if (hover !== lastHover) { r.classList.toggle("is-hover", hover); lastHover = hover; }
        if (isLabel !== lastIsLabel) { r.classList.toggle("is-label", isLabel); lastIsLabel = isLabel; }
        const opacity = pointer.down ? "0.5" : pointer.inside ? "1" : "0";
        if (opacity !== lastRingOpacity) { r.style.opacity = opacity; lastRingOpacity = opacity; }

        const text = pointer.label || lastLabel;
        if (r.textContent !== text) r.textContent = text;
        if (pointer.label) lastLabel = pointer.label;
        const color = `rgba(255,255,255,${gl.toFixed(3)})`;
        if (color !== lastColor) { r.style.color = color; lastColor = color; }
      }
    };

    const settled = () => {
      if (!visible) return true;
      return (
        swim.x < 0.01 &&
        Math.abs(swim.v) < 0.01 &&
        Math.abs(shear.x) < 0.004 &&
        Math.abs(shear.v) < 0.01 &&
        Math.abs(glow.v) < 0.01
      );
    };

    const unsubscribe = subscribe({ step, render, settled });
    return () => {
      unsubscribe();
      stopPointer();
      document.body.classList.remove("cursor-ready");
    };
  }, [lowPower, preferenceEnabled]);

  if (!enabled) return null;
  return createPortal(
    <>
      <div ref={dotRef} className="cursor-dot" style={{ opacity: 0 }} aria-hidden />
      <div ref={ringRef} className="cursor-ring" style={{ opacity: 0 }} aria-hidden />
    </>,
    document.body
  );
}