import { onCleanup, onMount } from "solid-js";
import { JapaneseText } from "~/components/primitives";

const SCROLL_SCALE_THRESHOLDS = Array.from({ length: 101 }, (_, index) => index / 100);

/*
 * "VOICE YOUR WORDS" — the editorial interlude between the section index and
 * the widgets.
 *
 * CSS view timelines own the smooth compositor path. Firefox and older
 * browsers still need the words to grow with the viewport, so a dense
 * IntersectionObserver fallback updates one numeric custom property. It never
 * installs a scroll handler, reads layout in a frame loop, or wakes Solid's
 * reactive graph while scrolling.
 */
export default function ScrollScaleRitual() {
  let ritualEl;

  onMount(() => {
    if (!ritualEl) return;

    const root = document.documentElement;
    const motionReduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const motionDisabled = root.classList.contains("animations-disabled")
      || root.classList.contains("performance-lite");
    const setProgress = (value) => {
      ritualEl.style.setProperty("--voice-words-progress", value.toFixed(3));
    };

    if (motionReduced || motionDisabled) {
      setProgress(1);
      return;
    }

    if (globalThis.CSS?.supports?.("animation-timeline: view()")) return;

    if (typeof IntersectionObserver === "undefined") {
      setProgress(1);
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const viewportHeight = entry.rootBounds?.height || window.innerHeight || 1;
        const elementHeight = entry.boundingClientRect.height || 1;
        const maximumRatio = Math.min(1, viewportHeight / elementHeight);
        const progress = Math.min(1, entry.intersectionRatio / Math.max(maximumRatio, 0.001));
        setProgress(progress);
      }
    }, { threshold: SCROLL_SCALE_THRESHOLDS });

    observer.observe(ritualEl);
    onCleanup(() => observer.disconnect());
  });

  return (
    <div
      ref={ritualEl}
      class="voice-words-ritual relative py-24 sm:py-36 overflow-hidden flex justify-center"
    >
      <p class="voice-words-ritual__line font-display font-thin tracking-[0.08em] text-foreground/80 text-[6vw] sm:text-[3.6vw] leading-none whitespace-nowrap">
        <JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
      </p>
    </div>
  );
}
