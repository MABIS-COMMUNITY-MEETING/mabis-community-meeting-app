import { onCleanup, onMount } from "solid-js";
import { subscribe, wake } from "@/lib/physics/scheduler";
import { integrateSpring } from "@/lib/physics/math";
import { MOTION_EVENT } from "@/lib/motion-preference";
import { PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";
import { springFromFramer } from "~/lib/motion";
import { JapaneseText } from "~/components/primitives";

const lerp = (a, b, t) => a + (b - a) * t;

function opacityFor(progress) {
  const p = Math.max(0, Math.min(1, progress));
  if (p < 0.15) return lerp(0, 1, p / 0.15);
  if (p < 0.85) return 1;
  return lerp(1, 0.15, (p - 0.85) / 0.15);
}

/*
 * "VOICE YOUR WORDS" — the line grows from 0.82 to 1.28 as it travels from
 * the bottom to the top of the viewport, matching the original interaction.
 *
 * Scroll events only mark geometry stale and wake the shared animation clock.
 * The scheduler performs the single rect read in its sample phase, integrates
 * the spring at a fixed timestep, then writes compositor-only transform and
 * opacity in its render phase. No browser support guess can bypass this path.
 */
export default function ScrollScaleRitual() {
  let hostEl;
  let lineEl;

  onMount(() => {
    if (!hostEl || !lineEl) return;

    const root = document.documentElement;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const { omega, zeta } = springFromFramer(80, 24, 0.4);
    let stopScrollMotion = null;

    const paintStatic = () => {
      lineEl.style.transform = "translateZ(0) scale(1)";
      lineEl.style.opacity = "0.82";
      lineEl.style.willChange = "auto";
    };

    const motionDisabled = () => motionQuery.matches
      || root.classList.contains("animations-disabled")
      || root.classList.contains("performance-lite");

    const startScrollMotion = () => {
      if (stopScrollMotion) return;

      const state = { x: 0, v: 0 };
      let previousX = 0;
      let target = 0;
      let needsMeasure = true;

      const measure = () => {
        const rect = hostEl.getBoundingClientRect();
        const viewport = window.innerHeight || 1;
        target = Math.max(0, Math.min(1, (viewport - rect.top) / (rect.height + viewport)));
      };

      measure();
      state.x = previousX = target;
      lineEl.style.willChange = "transform, opacity";

      const markForMeasure = () => {
        needsMeasure = true;
        wake();
      };

      window.addEventListener("scroll", markForMeasure, { passive: true });
      window.addEventListener("resize", markForMeasure, { passive: true });

      const unsubscribe = subscribe({
        sample: () => {
          if (!needsMeasure) return;
          needsMeasure = false;
          measure();
        },
        step: (dt) => {
          previousX = state.x;
          integrateSpring(state, target, omega, zeta, dt);
        },
        render: (alpha) => {
          const interpolated = lerp(previousX, state.x, Math.max(0, Math.min(1, alpha)));
          lineEl.style.transform = `translateZ(0) scale(${lerp(0.82, 1.28, interpolated).toFixed(4)})`;
          lineEl.style.opacity = opacityFor(interpolated).toFixed(3);
        },
        settled: () => !needsMeasure
          && Math.abs(state.x - target) < 0.0005
          && Math.abs(state.v) < 0.0005,
      });

      stopScrollMotion = () => {
        window.removeEventListener("scroll", markForMeasure);
        window.removeEventListener("resize", markForMeasure);
        unsubscribe();
        stopScrollMotion = null;
      };
    };

    const syncMotion = () => {
      if (motionDisabled()) {
        stopScrollMotion?.();
        paintStatic();
      } else {
        startScrollMotion();
      }
    };

    window.addEventListener(MOTION_EVENT, syncMotion);
    window.addEventListener(PERFORMANCE_TIER_EVENT, syncMotion);
    if (motionQuery.addEventListener) motionQuery.addEventListener("change", syncMotion);
    else motionQuery.addListener?.(syncMotion);

    syncMotion();

    onCleanup(() => {
      stopScrollMotion?.();
      window.removeEventListener(MOTION_EVENT, syncMotion);
      window.removeEventListener(PERFORMANCE_TIER_EVENT, syncMotion);
      if (motionQuery.removeEventListener) motionQuery.removeEventListener("change", syncMotion);
      else motionQuery.removeListener?.(syncMotion);
    });
  });

  return (
    <div
      ref={hostEl}
      class="voice-words-ritual relative py-24 sm:py-36 overflow-hidden flex justify-center"
    >
      <p
        ref={lineEl}
        class="voice-words-ritual__line font-display font-thin tracking-[0.08em] text-foreground/80 text-[6vw] sm:text-[3.6vw] leading-none whitespace-nowrap origin-center"
      >
        <JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
      </p>
    </div>
  );
}
