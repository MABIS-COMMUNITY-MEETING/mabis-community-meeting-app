import React, { useEffect, useRef } from "react";
import { subscribeScrollProgress } from "@/lib/scroll-progress";

/**
 * Fixed right-edge scroll indicator: a live section counter (01 10) bound to
 * page progress, a thin progress line, and a vertical SCROLL label. Decorative
 * depth layer; hidden on touch / small screens, never captures pointer.
 */
export default function ScrollSectionIndicator({ total = 10 }) {
  const counterRef = useRef(null);
  const lineRef = useRef(null);
  const rootRef = useRef(null);

  useEffect(() => {
    let previous = 1;
    return subscribeScrollProgress((progress) => {
      const n = Math.max(1, Math.min(total, Math.ceil(progress * total)));
      if (n !== previous) {
        previous = n;
        if (counterRef.current) counterRef.current.textContent = `${String(n).padStart(2, "0")}＜${String(total).padStart(2, "0")}`;
      }
      if (lineRef.current) lineRef.current.style.transform = `scaleY(${progress})`;
      // The hero masthead has its own "scroll to continue" cue sitting at
      // roughly the same vertical-center spot this indicator is fixed to, so
      // showing both at the top of the page doubles up and visually collides.
      // Fade this one in only once the user has actually started scrolling.
      if (rootRef.current) rootRef.current.style.opacity = progress < 0.04 ? "0" : "1";
    });
  }, [total]);

  return (
    <div
      ref={rootRef}
      className="fixed right-3 lg:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 pointer-events-none transition-opacity duration-300"
      style={{ opacity: 0 }}
      aria-hidden
    >
      <span ref={counterRef} className="tech-label text-muted-foreground tabular-nums">
        01＜{String(total).padStart(2, "0")}
      </span>
      <div className="relative h-36 w-px bg-foreground/15 overflow-hidden">
        <div ref={lineRef} style={{ transform: "scaleY(0)" }} className="absolute inset-0 origin-top bg-primary will-change-transform" />
      </div>
      <span className="tech-label vert-text text-muted-foreground">SCROLL</span>
    </div>
  );
}