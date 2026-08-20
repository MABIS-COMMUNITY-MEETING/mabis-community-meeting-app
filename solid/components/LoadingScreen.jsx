import { createSignal, onMount, onCleanup } from "solid-js";
import { JapaneseText } from "~/components/primitives";
import { getLoadingState, subscribeToLoadingState } from "@/lib/loading-state";
import { lockBodyScroll } from "@/lib/scroll-lock";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";
const clampProgress = (value) => Math.max(0, Math.min(100, Number(value) || 0));

// How long a real target can sit still before the counter starts trickling
// forward on its own, and how far it's allowed to creep ahead of the last
// real update while it waits for the next one.
const STALL_MS = 260;
const TRICKLE_CAP = 9;
const TRICKLE_RATE = 0.01;

/**
 * Numeric loader — 1:1 port of src/components/LoadingScreen.jsx, plus one
 * fix on top of the React version: real progress arrives in uneven bursts
 * (home-warmup.js resolves ~21 concurrent tasks in whatever order they
 * finish over the network), so the target can go several hundred ms — long
 * enough to read as "stuck" — between updates. 14 + round((11/21)*80) lands
 * on exactly 56, so "stuck at 56" is not a one-off, it's the 11th of 21 tasks
 * landing and the 12th being a slow one.
 *
 * The number itself already animated smoothly toward each new target; what
 * it never did was move BETWEEN targets. This adds a small decelerating
 * trickle that only kicks in once a target has been still for STALL_MS, caps
 * itself TRICKLE_CAP points ahead and never crosses 97 — so it stays honest
 * (100 only ever comes from a real completion event) while never visibly
 * freezing. The moment a real update arrives the trickle resets and the
 * counter is pulled straight to the new, higher-priority target.
 */
export default function LoadingScreen() {
  // useSyncExternalStore → signal + subscription. equals:false because the
  // store may hand back the same object mutated in place; reference equality
  // would then swallow every update after the first.
  const [loading, setLoading] = createSignal(getLoadingState(), { equals: false });
  onMount(() => {
    // The fallback is a full-viewport state, so the document underneath must
    // not accept wheel/touch input while it owns the screen. The shared lock
    // is reference-counted and navigation-safe; cleanup always releases it.
    const releaseScroll = lockBodyScroll();
    const unsubscribe = subscribeToLoadingState(() => setLoading(getLoadingState()));
    onCleanup(() => {
      unsubscribe?.();
      releaseScroll();
    });
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

  onMount(() => {
    let raf;
    let previousTime = performance.now();
    let lastTarget = progress();
    let lastRealChangeAt = previousTime;
    let trickle = 0;
    paint(visualProgress);

    const step = (now) => {
      const elapsed = Math.min(48, Math.max(0, now - previousTime));
      previousTime = now;

      const target = progress();
      if (target !== lastTarget) {
        lastTarget = target;
        lastRealChangeAt = now;
        trickle = 0;
      }

      const root = document.documentElement;
      const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
        || root.classList.contains("animations-disabled")
        || root.classList.contains("performance-lite");

      if (reduceMotion) {
        // No trickle without motion — jump straight to the real value, same
        // as the previous behaviour.
        visualProgress = target;
        paint(target);
        raf = window.requestAnimationFrame(step);
        return;
      }

      const stalledFor = now - lastRealChangeAt;
      if (target < 97 && stalledFor > STALL_MS) {
        // Decelerating creep toward the cap — fast at first, asymptotically
        // slower, so it reads as "still working" rather than as fake progress.
        trickle = Math.min(trickle + elapsed * TRICKLE_RATE * (1 - trickle / TRICKLE_CAP), TRICKLE_CAP);
      }
      const displayTarget = Math.min(target + trickle, 97);

      const blend = 1 - Math.exp(-elapsed / 72);
      let next = visualProgress + (displayTarget - visualProgress) * blend;
      if (Math.abs(displayTarget - next) < 0.025) next = displayTarget;
      visualProgress = next;
      paint(next);
      raf = window.requestAnimationFrame(step);
    };

    raf = window.requestAnimationFrame(step);
    onCleanup(() => window.cancelAnimationFrame(raf));
  });

  const initialNumber = String(Math.round(visualProgress)).padStart(3, "0");
  const initialScale = Math.max(0.0001, visualProgress / 100);

  return (
    <div
      class="loading-screen fixed inset-0 z-[200] overflow-hidden overscroll-none touch-none bg-ink text-bone"
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
