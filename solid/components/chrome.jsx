import { onMount, onCleanup } from "solid-js";
import { subscribeScrollProgress } from "@/lib/scroll-progress";

/*
 * Fixed decorative chrome — ports of GrainOverlay, PaletteStripe,
 * ScrollProgress and ScrollSectionIndicator.
 *
 * Grouped into one module the way page-chrome.jsx already groups PageNav /
 * PageFooter / OpenMoji: four files of three-to-forty lines that are always
 * mounted together buy nothing as separate chunks.
 *
 * All of these were already writing style.transform directly from a scroll
 * subscription rather than through React state, so they port across unchanged —
 * which is also exactly what Solid wants (never write a signal per frame).
 */

export function GrainOverlay() {
  return <div class="grain-layer" aria-hidden />;
}

/**
 * Hairline band of the ACTIVE theme's full palette — pride flags and presets
 * carry more colours than the two UI tokens, so this puts the rest on screen.
 */
export function PaletteStripe() {
  return (
    <div
      aria-hidden
      class="pointer-events-none fixed left-0 top-0 z-[61] h-[3px] w-full"
      style={{ "background-image": "var(--palette-stripes, none)" }}
    />
  );
}

/** Thin 2px scroll-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  let barEl;

  onMount(() => {
    const unsubscribe = subscribeScrollProgress((progress) => {
      if (barEl) barEl.style.transform = `scaleX(${progress})`;
    });
    onCleanup(() => unsubscribe?.());
  });

  return (
    <div
      ref={barEl}
      style={{ transform: "scaleX(0)", "background-image": "var(--palette-gradient, none)" }}
      aria-hidden
      class="pointer-events-none fixed left-0 top-[3px] z-[60] h-[2px] w-full origin-left bg-primary will-change-transform"
    />
  );
}

/**
 * Fixed right-edge scroll indicator: a live section counter bound to page
 * progress, a thin progress line, and a vertical SCROLL label. Decorative
 * depth layer; hidden on touch / small screens, never captures pointer.
 */
export function ScrollSectionIndicator(props) {
  let counterEl;
  let lineEl;
  let rootEl;

  onMount(() => {
    const total = props.total ?? 10;
    let previous = 1;
    const unsubscribe = subscribeScrollProgress((progress) => {
      const n = Math.max(1, Math.min(total, Math.ceil(progress * total)));
      if (n !== previous) {
        previous = n;
        if (counterEl) counterEl.textContent = `${String(n).padStart(2, "0")}＜${String(total).padStart(2, "0")}`;
      }
      if (lineEl) lineEl.style.transform = `scaleY(${progress})`;
      // The hero masthead has its own "scroll to continue" cue sitting at
      // roughly the same vertical-center spot this indicator is fixed to, so
      // showing both at the top of the page doubles up and visually collides.
      // Fade this one in only once the user has actually started scrolling.
      if (rootEl) rootEl.style.opacity = progress < 0.04 ? "0" : "1";
    });
    onCleanup(() => unsubscribe?.());
  });

  return (
    <div
      ref={rootEl}
      class="fixed right-3 lg:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 pointer-events-none transition-opacity duration-300"
      style={{ opacity: 0 }}
      aria-hidden
    >
      <span ref={counterEl} class="tech-label text-muted-foreground tabular-nums">
        01＜{String(props.total ?? 10).padStart(2, "0")}
      </span>
      <div class="relative h-36 w-px bg-foreground/15 overflow-hidden">
        <div ref={lineEl} style={{ transform: "scaleY(0)" }} class="absolute inset-0 origin-top bg-primary will-change-transform" />
      </div>
      <span class="tech-label vert-text text-muted-foreground">SCROLL</span>
    </div>
  );
}
