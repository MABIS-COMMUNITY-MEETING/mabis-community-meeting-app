import { createSignal, createEffect, on, onMount, onCleanup } from "solid-js";
import { JapaneseText } from "~/components/primitives";
import { getLoadingState, subscribeToLoadingState } from "@/lib/loading-state";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";
const clampProgress = (value) => Math.max(0, Math.min(100, Number(value) || 0));

/**
 * Numeric loader — 1:1 port of src/components/LoadingScreen.jsx.
 *
 * The selected UI font is captured for its full lifetime. Progress comes from
 * real route/module/data preparation; the visual counter follows those
 * milestones on one requestAnimationFrame loop that writes textContent and
 * transform directly, so no framework reconciles an intermediate frame. That
 * design carries over unchanged — it was already doing what Solid would want.
 */
export default function LoadingScreen() {
  // useSyncExternalStore → signal + subscription. equals:false because the
  // store may hand back the same object mutated in place; reference equality
  // would then swallow every update after the first.
  const [loading, setLoading] = createSignal(getLoadingState(), { equals: false });
  onMount(() => {
    const unsubscribe = subscribeToLoadingState(() => setLoading(getLoadingState()));
    onCleanup(() => unsubscribe?.());
  });

  // Read once and never again, exactly like React's lazy useState initialiser.
  const loadingFont = typeof document === "undefined"
    ? "'GNUFreeMonoUI'"
    : getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'";

  const progress = () => clampProgress(loading().progress);

  let visualProgress = progress();
  let numberEl;
  let barEl;

  const paint = (value) => {
    const rounded = Math.round(value);
    if (numberEl && numberEl.dataset.value !== String(rounded)) {
      numberEl.dataset.value = String(rounded);
      numberEl.textContent = String(rounded).padStart(3, "0");
    }
    if (barEl) {
      barEl.style.transform = `scaleX(${Math.max(0.0001, value / 100)})`;
    }
  };

  createEffect(on(progress, (target) => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      || root.classList.contains("animations-disabled")
      || root.classList.contains("performance-lite");

    if (reduceMotion) {
      visualProgress = target;
      paint(target);
      return;
    }

    let frame = 0;
    let previousTime = performance.now();
    paint(visualProgress);

    const step = (now) => {
      const elapsed = Math.min(48, Math.max(0, now - previousTime));
      previousTime = now;
      const blend = 1 - Math.exp(-elapsed / 72);
      let next = visualProgress + (target - visualProgress) * blend;
      if (Math.abs(target - next) < 0.025) next = target;
      visualProgress = next;
      paint(next);
      if (next !== target) frame = window.requestAnimationFrame(step);
    };

    if (visualProgress !== target) frame = window.requestAnimationFrame(step);
    onCleanup(() => window.cancelAnimationFrame(frame));
  }));

  const initialNumber = String(Math.round(visualProgress)).padStart(3, "0");
  const initialScale = Math.max(0.0001, visualProgress / 100);

  return (
    <div
      class="loading-screen fixed inset-0 overflow-hidden bg-ink text-bone"
      style={{ "--loading-font": loadingFont }}
      aria-busy="true"
    >
      <div class="loading-grid absolute inset-0 grid-bg" aria-hidden />
      <div class="loading-glow-shell" aria-hidden>
        <div class="loading-glow" />
      </div>
      <div class="loading-frame pointer-events-none corner-bracket" aria-hidden />

      <div class="loading-meta tech-label text-bone/50" aria-hidden>
        <span>INITIALISING</span>
        <span>MABIS 2026</span>
      </div>

      <div class="loading-center relative z-10 flex flex-col items-center justify-center">
        <span class="loading-wordmark font-display font-normal tracking-ultra text-bone/8 leading-none select-none" aria-hidden>
          COMMUNITY
        </span>

        <div class="loading-counter relative flex items-baseline" aria-hidden>
          <span
            ref={numberEl}
            data-value={Math.round(visualProgress)}
            class="loading-counter-number font-display font-normal tracking-ultra leading-none tabular-nums"
          >
            {initialNumber}
          </span>
          <span class="ml-2 tech-label text-primary">％</span>
        </div>

        <div
          class="loading-progress-track relative mt-6 h-px overflow-hidden bg-bone/15"
          role="progressbar"
          aria-label="Loading application"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress())}
        >
          <span
            ref={barEl}
            class="loading-progress loading-progress-fill absolute inset-y-0 left-0 w-full origin-left bg-primary"
            style={{ transform: `scaleX(${initialScale})` }}
          />
        </div>

        <div
          class="loading-status mt-5 flex items-center gap-3 tech-label text-bone/45"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span class="loading-spinner inline-block h-2.5 w-2.5 shrink-0 border border-bone/40 border-t-primary" aria-hidden />
          <span class="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span class="text-bone/70">CACHING STUFF</span>
            <span class="min-w-0 tabular-nums">{loading().detail}</span>
          </span>
        </div>
      </div>

      <div class="loading-footer tech-label text-bone/40">
        <img src={LOGO} alt="" decoding="async" fetchpriority="low" class="inline-block h-5 w-5 object-contain opacity-70" />
        <JapaneseText ja="セカンダリー・コミュニティ・ミーティング" japaneseClass="ml-1.5 inline normal-case tracking-normal text-[0.85em]" layout="inline">SECONDARY COMMUNITY MEETING</JapaneseText>
      </div>
    </div>
  );
}
