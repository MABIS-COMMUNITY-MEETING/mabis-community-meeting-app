import { createSignal, createEffect, onMount, onCleanup, Show } from "solid-js";
import { Portal } from "solid-js/web";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer, startPointerEngine } from "@/lib/physics/pointer";
import { MATERIAL, CURSOR, SLEEP } from "@/lib/physics/tokens";
import { integrateSpring, clamp, tanhSat, angleDelta } from "@/lib/physics/math";
import { lowPowerMode, PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";
import { customCursorEnabled, CURSOR_EVENT } from "@/lib/cursor-preference";
/* The ring is a glass surface and uses the same tint and shine layers every
   other glass surface does. Imported here for the same reason Glass.jsx
   imports it — the stylesheet ships in whichever chunk actually renders the
   material, never in the render-blocking entry. */
import "@/styles/glass.css";

/**
 * CustomCursor — Solid port of src/components/CustomCursor.jsx.
 *
 * The cursor preserves the browser pointer's OS-processed movement while its
 * outline behaves like a small swimming organism.
 *
 *   POSITION — the core dot reads PointerEvent clientX/clientY through a tiny
 *              spatial deadband that absorbs ±1 px OS noise. Movement beyond
 *              it snaps to the browser coordinate, so there is no timed easing,
 *              accumulating lag, sensitivity change, prediction, or DPR math.
 *              The outer ring follows that stabilized CSS-pixel target through
 *              a capped spring, so the dot can escape it during a quick gesture.
 *   MATERIAL — bounded underdamped springs shape and recapture the ring like a
 *              soft membrane, producing a gentle rebound before settling.
 *
 * Deformation integrates on the shared fixed-timestep scheduler, so behaviour
 * is identical at 60Hz and 240Hz and the system sleeps when it settles.
 *
 * ── What the Solid port changes ──────────────────────────────────────────
 * Nothing about the physics. The React version already kept every hot value
 * in refs and wrote transforms directly, precisely to avoid a re-render per
 * frame. Solid makes that the natural shape rather than an optimisation:
 * locals are stable because the body runs once, so the refs simply become
 * `let`, and the simulation is exactly as it was.
 */
export default function CustomCursor() {
  let dotEl;
  let ringEl;
  let ringLabelEl;

  const [enabled, setEnabled] = createSignal(false);
  const [lowPower, setLowPower] = createSignal(lowPowerMode());
  const [preferenceEnabled, setPreferenceEnabled] = createSignal(customCursorEnabled());

  onMount(() => {
    const updateTier = (event) => setLowPower(event.detail);
    const updatePreference = (event) => setPreferenceEnabled(Boolean(event.detail));
    window.addEventListener(PERFORMANCE_TIER_EVENT, updateTier);
    window.addEventListener(CURSOR_EVENT, updatePreference);
    onCleanup(() => {
      window.removeEventListener(PERFORMANCE_TIER_EVENT, updateTier);
      window.removeEventListener(CURSOR_EVENT, updatePreference);
    });
  });

  createEffect(() => {
    const prefOn = preferenceEnabled();
    const isLowPower = lowPower();

    setEnabled(false);
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!prefOn || !fine || reduced || isLowPower) {
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
    let dotReady = false, dotMoved = false;
    let dotX = 0, dotY = 0;
    let lastLabel = "";
    let prevRingX = 0, prevRingY = 0;
    let prevShear = 0, prevScale = 1, prevTheta = 0, prevGlow = 0;
    let lastHover = false, lastIsLabel = false, lastDotOpacity = "", lastRingOpacity = "", lastLabelAlpha = "";

    // Spatial hysteresis, not temporal smoothing: ignore only motion contained
    // within the noise radius, then snap fully to the browser coordinate.
    const sampleDot = () => {
      dotMoved = false;
      if (!pointer.seen) return;
      if (!dotReady) {
        dotX = pointer.rawX;
        dotY = pointer.rawY;
        dotReady = true;
        dotMoved = true;
        return;
      }
      const dx = pointer.rawX - dotX;
      const dy = pointer.rawY - dotY;
      if (Math.hypot(dx, dy) <= CURSOR.dotJitterDeadband) return;
      dotX = pointer.rawX;
      dotY = pointer.rawY;
      dotMoved = true;
    };

    const step = (dt) => {
      if (!pointer.seen) return;

      if (!visible) {
        visible = true;
        ringX.x = prevRingX = dotX;
        ringY.x = prevRingY = dotY;
      }

      // The dot is never interpolated. Only the ring's bounded follower and
      // material response use the fixed-timestep spring simulation.
      prevRingX = ringX.x; prevRingY = ringY.x;
      prevShear = shear.x; prevScale = scale.x; prevTheta = theta; prevGlow = glow.x;

      // A velocity estimate belongs to the last input sample. Release it after
      // a brief grace period so deformation cannot loop forever while idle.
      const idleFor = performance.now() / 1000 - pointer.movedAt;
      const s = dotMoved && idleFor <= CURSOR.idleReleaseDelay ? pointer.speed : 0;

      integrateSpring(ringX, dotX, MATERIAL.follow.omega, MATERIAL.follow.zeta, dt);
      integrateSpring(ringY, dotY, MATERIAL.follow.omega, MATERIAL.follow.zeta, dt);

      let tetherX = dotX - ringX.x;
      let tetherY = dotY - ringY.x;
      let tetherDistance = Math.hypot(tetherX, tetherY);
      if (tetherDistance > CURSOR.ringMaxLag) {
        const nx = tetherX / tetherDistance;
        const ny = tetherY / tetherDistance;
        ringX.x = dotX - nx * CURSOR.ringMaxLag;
        ringY.x = dotY - ny * CURSOR.ringMaxLag;
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
        dt,
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
      const d = dotEl, r = ringEl;
      const a = clamp(alpha, 0, 1);
      const px = dotX;
      const py = dotY;
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

        /* Written to the label element, never to the ring. The ring now holds
           the glass layers as children, and assigning textContent to it would
           delete them on the first hover. */
        const text = pointer.label || lastLabel;
        if (ringLabelEl && ringLabelEl.textContent !== text) ringLabelEl.textContent = text;
        if (pointer.label) lastLabel = pointer.label;
        /* Only the alpha is written. The colour itself is
           hsl(var(--foreground) / var(--cursor-label-alpha)) in index.css, so
           the label follows the active theme — named, custom, Pride or Material
           You — instead of the hard-coded white this used to fade in. */
        const labelAlpha = gl.toFixed(3);
        if (labelAlpha !== lastLabelAlpha) {
          r.style.setProperty("--cursor-label-alpha", labelAlpha);
          lastLabelAlpha = labelAlpha;
        }
      }
    };

    const settled = () => {
      if (!visible) return true;
      return (
        Math.hypot(ringX.x - dotX, ringY.x - dotY) < SLEEP.pos &&
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

    const unsubscribe = subscribe({ sample: sampleDot, step, render, settled });

    onCleanup(() => {
      unsubscribe();
      stopPointer();
      document.body.classList.remove("cursor-ready");
    });
  });

  return (
    <Show when={enabled()}>
      <Portal>
        <div ref={dotEl} class="cursor-dot" style={{ opacity: 0 }} aria-hidden />
        {/* The live blur sits on the ring itself rather than on a
            .liquidGlass-effect layer: the ring's contain, will-change and
            per-frame opacity each start a backdrop root, which would leave a
            child's backdrop-filter sampling nothing. See glass.css. */}
        <div ref={ringEl} class="cursor-ring" style={{ opacity: 0 }} aria-hidden>
          <span class="liquidGlass-tint" />
          <span class="liquidGlass-matte" />
          <span class="liquidGlass-shine" />
          <span ref={ringLabelEl} class="liquidGlass-text" />
        </div>
      </Portal>
    </Show>
  );
}
