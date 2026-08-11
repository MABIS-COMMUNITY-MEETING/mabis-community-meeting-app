import React, { useState, useEffect } from "react";
import { motion, useScroll } from "framer-motion";

/**
 * Fixed right-edge scroll indicator: a live section counter (01／10) bound to
 * page progress, a thin progress line, and a vertical SCROLL label. Decorative
 * depth layer; hidden on touch / small screens, never captures pointer.
 */
export default function ScrollSectionIndicator({ total = 10 }) {
  const { scrollYProgress } = useScroll();
  const [cur, setCur] = useState(1);

  useEffect(() => {
    return scrollYProgress.on("change", (v) => {
      const n = Math.max(1, Math.min(total, Math.ceil(v * total)));
      setCur(n);
    });
  }, [scrollYProgress, total]);

  return (
    <div
      className="fixed right-3 lg:right-6 top-1/2 -translate-y-1/2 z-40 hidden md:flex flex-col items-center gap-3 pointer-events-none"
      aria-hidden
    >
      <span className="tech-label text-muted-foreground tabular-nums">
        {String(cur).padStart(2, "0")}＜{String(total).padStart(2, "0")}
      </span>
      <div className="relative h-36 w-px bg-foreground/15 overflow-hidden">
        <motion.div style={{ scaleY: scrollYProgress }} className="absolute inset-0 origin-top bg-primary" />
      </div>
      <span className="tech-label vert-text text-muted-foreground">SCROLL</span>
    </div>
  );
}