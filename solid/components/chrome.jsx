import { Portal } from "solid-js/web";

/*
 * Fixed decorative chrome — GrainOverlay and PaletteStripe.
 *
 * Grouped into one module the way page-chrome.jsx already groups PageNav /
 * PageFooter / OpenMoji: small files that are always mounted together buy
 * nothing as separate chunks.
 *
 * ScrollProgress (a 2px bar tracking page position) and ScrollSectionIndicator
 * (a right-edge section counter with its own progress line) used to live here
 * too. Both existed only to draw the scroll position back at the reader, and
 * both drove a style.transform write on every frame of every scroll. They were
 * removed so scrolling is the browser's business alone — see "Scrolling belongs
 * to the browser" in README.md. Nothing else consumed src/lib/scroll-progress.js,
 * so that module and its passive scroll listener went with them.
 *
 * What remains here is static: no listeners, no per-frame writes.
 */

export function GrainOverlay() {
  return <div class="grain-layer" aria-hidden />;
}

/**
 * Hairline band of the ACTIVE theme's full palette — pride flags and presets
 * carry more colours than the two UI tokens, so this puts the rest on screen.
 * It shares the body's stacking context with the portaled header so the glass
 * surface cannot cover the theme colours.
 */
export function PaletteStripe() {
  return (
    <Portal>
      <div
        aria-hidden
        class="pointer-events-none fixed left-0 top-0 z-[61] h-[3px] w-full"
        style={{ "background-image": "var(--palette-stripes, none)" }}
      />
    </Portal>
  );
}


