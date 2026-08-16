import { onMount, onCleanup } from "solid-js";
import { subscribe } from "@/lib/physics/scheduler";
import { integrateSpring } from "@/lib/physics/math";
import { springFromFramer } from "~/lib/motion";
import { JapaneseText } from "~/components/primitives";

/*
 * "VOICE YOUR WORDS" — the line grows as it travels up the viewport.
 * Port of src/components/home/ScrollScaleRitual.jsx.
 *
 * framer's useScroll({target, offset:["start end","end start"]}) + useSpring
 * becomes: element progress measured from the rect, then run through the app's
 * own spring integrator on the shared scheduler — the same conversion
 * MagneticButton uses. Only transform and opacity are written, and only in the
 * render phase, so this stays composited and never triggers text layout.
 *
 * Range kept modest deliberately. At the old 0.55-1.9 the line ended up around
 * 13vw on a phone, roughly 128vw of nowrap text — it ran off both edges and was
 * clipped by the overflow-hidden below, so the "zoom" just looked broken.
 * 0.82-1.28 stays inside the viewport at every step.
 */
const lerp = (a, b, t) => a + (b - a) * t;

/** framer's [0, 0.15, 0.85, 1] → [0, 1, 1, 0.15] opacity keyframes. */
function opacityFor(p) {
  if (p < 0.15) return lerp(0, 1, p / 0.15);
  if (p < 0.85) return 1;
  return lerp(1, 0.15, (p - 0.85) / 0.15);
}

export default function ScrollScaleRitual() {
  let hostEl;
  let lineEl;
  const { omega, zeta } = springFromFramer(80, 24, 0.4);

  onMount(() => {
    const state = { x: 0, v: 0 };
    let target = 0;

    const measure = () => {
      if (!hostEl) return;
      const rect = hostEl.getBoundingClientRect();
      const viewport = window.innerHeight || 1;
      // "start end" → "end start": 0 when the top edge enters at the bottom of
      // the viewport, 1 when the bottom edge leaves past the top.
      const total = rect.height + viewport;
      target = Math.max(0, Math.min(1, (viewport - rect.top) / total));
    };

    measure();
    state.x = target;

    window.addEventListener("scroll", measure, { passive: true });
    window.addEventListener("resize", measure, { passive: true });

    const unsubscribe = subscribe({
      step: (dt) => integrateSpring(state, target, omega, zeta, dt),
      render: () => {
        if (!lineEl) return;
        lineEl.style.transform = `scale(${lerp(0.82, 1.28, state.x).toFixed(4)})`;
        lineEl.style.opacity = opacityFor(state.x).toFixed(3);
      },
      settled: () => Math.abs(state.x - target) < 0.0005 && Math.abs(state.v) < 0.0005,
    });

    onCleanup(() => {
      window.removeEventListener("scroll", measure);
      window.removeEventListener("resize", measure);
      unsubscribe();
    });
  });

  return (
    <div ref={hostEl} class="relative py-24 sm:py-36 overflow-hidden flex justify-center">
      <p
        ref={lineEl}
        class="font-display font-thin tracking-[0.08em] text-foreground/80 text-[6vw] sm:text-[3.6vw] leading-none whitespace-nowrap origin-center will-change-transform"
      >
        <JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
      </p>
    </div>
  );
}
