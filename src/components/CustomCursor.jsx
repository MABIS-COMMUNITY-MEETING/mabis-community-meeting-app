import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import { MATERIAL, CURSOR, SLEEP } from "@/lib/physics/tokens";
import { integrateSpring, clamp, tanhSat, angleDelta } from "@/lib/physics/math";
import { lowPowerMode, PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";
import { customCursorEnabled, CURSOR_EVENT } from "@/lib/cursor-preference";

/**
 * The cursor keeps the browser pointer's OS-processed position exact while its
 * outline behaves like a small swimming organism.
 *
 *   POSITION — the core dot reads PointerEvent clientX/clientY directly.
 *              The outer ring follows that same CSS-pixel target through a
 *              capped spring, so the dot can escape it during a quick gesture
 *              without changing OS sensitivity, acceleration, or DPI.
 *   MATERIAL — bounded underdamped springs shape and recapture the ring like a
 *              soft membrane, producing a gentle rebound before settling.
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
    const ringX = { x: 0, v: 0 };           // spring-follow centre
    const ringY = { x: 0, v: 0 };
    const shear = { x: 0, v: 0 };
    const scale = { x: 1, v: 0 };           // press + travel expansion
    const glow = { x: 0, v: 0 };            // label opacity
    const swim = { x: 0, v: 0 };            // 0..1 travel effort

    let theta = 0;     // deformation orientation (deg)
    let visible = false;
    let lastLabel = "";
    let prevRingX = 0, prevRingY = 0;
    let prevShear = 0, prevScale = 1, prevTheta = 0, prevGlow = 0;
    let lastHover = false, lastIsLabel = false, lastDotOpacity = "", lastRingOpacity = "", lastColor = "";

    const step = (dt) => {
      if (!pointer.seen) return;

      if (!visible) {
        visible = true;
        ringX.x = prevRingX = pointer.rawX;
        ringY.x = prevRingY = pointer.rawY;
      }

      // The dot is never interpolated. Only the ring's bounded follower and
      // material response use the fixed-timestep spring simulation.
      prevRingX = ringX.x; prevRingY = ringY.x;
      prevShear = shear.x; prevScale = scale.x; prevTheta = theta; prevGlow = glow.x;

      // A velocity estimate belongs to the last input sample. Release it after
      // a brief grace period so deformation cannot loop forever while idle.
      const idleFor = performance.now() / 1000 - pointer.movedAt;
      const s = idleFor <= CURSOR.idleReleaseDelay ? pointer.speed : 0;

      integrateSpring(ringX, pointer.rawX, MATERIAL.follow.omega, MATERIAL.follow.zeta, dt);
      integrateSpring(ringY, pointer.rawY, MATERIAL.follow.omega, MATERIAL.follow.zeta, dt);

      let tetherX = pointer.rawX - ringX.x;
      let tetherY = pointer.rawY - ringY.x;
      let tetherDistance = Math.hypot(tetherX, tetherY);
      if (tetherDistance > CURSOR.ringMaxLag) {
        const nx = tetherX / tetherDistance;
        const ny = tetherY / tetherDistance;
        ringX.x = pointer.rawX - nx * CURSOR.ringMaxLag;
        ringY.x = pointer.rawY - ny * CURSOR.ringMaxLag;
        // Remove only velocity that would stretch the tether farther. Inward
        // velocity survives, so the ring catches the dot without a hard snap.
        const inwardVelocity = ringX.v * nx + ringY.v * ny;
        if (inwardVelocity < 0) {
          ringX.v -= inwardVelocity * nx;
          ringY.v -= inwardVelocity * ny;
        }
        tetherX = nx * CURSOR.ringMaxLag;
        tetherY = ny * CURSOR.ringMaxLag;
        tetherDistance = CURSOR.ringMaxLag;
      }

      const movementEffort = tanhSat(CURSOR.shearAlpha * s);
      const tetherEffort = clamp(tetherDistance / CURSOR.ringMaxLag, 0, 1);
      const effort = Math.max(movementEffort, tetherEffort);
      integrateSpring(swim, effort, MATERIAL.flow.omega, MATERIAL.flow.zeta, dt);
      integrateSpring(
        shear,
        pointer.label ? 0 : CURSOR.shearMax * swim.x,
        MATERIAL.liquid.omega,
        MATERIAL.liquid.zeta,
        dt
      );
      const scaleTarget = pointer.down ? CURSOR.pressScale : 1 + CURSOR.motionExpansion * swim.x;
      integrateSpring(scale, scaleTarget, MATERIAL.bounce.omega, MATERIAL.bounce.zeta, dt);
      integrateSpring(glow, pointer.label ? 1 : 0, MATERIAL.glass.omega, MATERIAL.glass.zeta, dt);

      if (tetherDistance > 0.75) {
        const want = (Math.atan2(tetherY, tetherX) * 180) / Math.PI;
        theta += angleDelta(want, theta) * clamp(dt * 10, 0, 1);
      }
    };

    const render = (alpha = 1) => {
      if (!visible) return;
      const d = dotRef.current, r = ringRef.current;
      const a = clamp(alpha, 0, 1);
      const px = pointer.rawX;
      const py = pointer.rawY;
      const rx = prevRingX + (ringX.x - prevRingX) * a;
      const ry = prevRingY + (ringY.x - prevRingY) * a;
      const sh = prevShear + (shear.x - prevShear) * a;
      const sc = prevScale + (scale.x - prevScale) * a;
      const th = prevTheta + angleDelta(theta, prevTheta) * a;
      const gl = prevGlow + (glow.x - prevGlow) * a;

      if (d) {
        const opacity = pointer.inside ? "1" : "0";
        if (opacity !== lastDotOpacity) { d.style.opacity = opacity; lastDotOpacity = opacity; }
        d.style.transform = `translate3d(${px.toFixed(2)}px, ${py.toFixed(2)}px, 0) translate(-50%,-50%)`;
      }

      if (r) {
        // Uniform bounce multiplies the area-preserving directional membrane.
        // Only this outer ring uses spring-follow translation; the dot remains raw.
        const rad = (th * Math.PI) / 180;
        const c = Math.cos(rad), sn2 = Math.sin(rad);
        const ep = sc * Math.exp(sh), em = sc * Math.exp(-sh);
        const m11 = ep * c * c + em * sn2 * sn2;
        const m12 = (ep - em) * c * sn2;
        const m22 = ep * sn2 * sn2 + em * c * c;
        r.style.transform = `translate3d(${rx.toFixed(2)}px, ${ry.toFixed(2)}px, 0) translate(-50%,-50%) matrix(${m11.toFixed(4)}, ${m12.toFixed(4)}, ${m12.toFixed(4)}, ${m22.toFixed(4)}, 0, 0)`;
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
        Math.hypot(ringX.x - pointer.rawX, ringY.x - pointer.rawY) < SLEEP.pos &&
        Math.hypot(ringX.v, ringY.v) < SLEEP.vel &&
        swim.x < 0.01 &&
        Math.abs(swim.v) < 0.01 &&
        Math.abs(shear.x) < 0.004 &&
        Math.abs(shear.v) < 0.01 &&
        Math.abs(scale.x - (pointer.down ? CURSOR.pressScale : 1)) < 0.002 &&
        Math.abs(scale.v) < 0.01 &&
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