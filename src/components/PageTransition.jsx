import React, { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { playTransition } from "@/lib/sound";

const EASE = [0.16, 1, 0.3, 1];

/**
 * Cinematic page transition. A full-bleed ink curtain wipes upward to cover
 * the outgoing page, then wipes away to reveal the incoming one — with a
 * giant typographic mark sweeping underneath and the content lifting in.
 * Keeps navigation feeling choreographed without becoming sluggish.
 */
export default function PageTransition({ children }) {
  useEffect(() => { playTransition(); }, []);
  const contentRef = useRef(null);

  // The content wrapper below animates `y`, which Framer Motion implements as
  // a `transform`. It never clears that inline style once the animation
  // settles — even resting at y:0 the node keeps `transform: translateY(0px)`.
  // Any non-`none` transform makes an element the containing block for
  // `position: fixed` descendants, so every fullscreen widget nested in
  // {children} (Jobs, Calendar, Members, Discussion, ...) was being pinned to
  // this wrapper's box instead of the viewport once the page had transitioned
  // in. Once the lift-in finishes we don't need the transform any more, so
  // drop it and let fixed descendants size against the real viewport again.
  const clearLiftTransform = () => {
    if (contentRef.current) contentRef.current.style.transform = "none";
  };

  return (
    <div className="relative">
      <motion.div
        className="fixed inset-0 z-[80] pointer-events-none bg-ink text-bone overflow-hidden"
        initial={{ clipPath: "inset(0 0 0 0)" }}
        animate={{ clipPath: "inset(0 0 100% 0)" }}
        exit={{ clipPath: "inset(0 0 0 0)" }}
        transition={{ duration: 0.5, ease: EASE }}
      >
        <div className="absolute inset-0 grid-bg opacity-30" />
        <motion.span
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 select-none font-display font-thin tracking-ultra text-bone/12 text-[30vw] leading-none"
          initial={{ x: "-8%" }}
          animate={{ x: "8%" }}
          exit={{ x: "-8%" }}
          transition={{ duration: 0.5, ease: EASE }}
        > </motion.span>
        <div className="absolute top-6 left-6 tech-label text-bone/40"> TRANSIT</div>
        <div className="absolute bottom-6 right-6 tech-label text-bone/40">MABIS 2026</div>
      </motion.div>

      <motion.div
        ref={contentRef}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
        onAnimationComplete={clearLiftTransform}
      >
        {children}
      </motion.div>
    </div>
  );
}
