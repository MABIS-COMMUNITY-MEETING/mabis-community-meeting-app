import React, { useEffect } from "react";
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
        >
          ／／
        </motion.span>
        <div className="absolute top-6 left-6 tech-label text-bone/40">／ TRANSIT</div>
        <div className="absolute bottom-6 right-6 tech-label text-bone/40">MABIS ／ 2026</div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.5, ease: EASE, delay: 0.18 }}
      >
        {children}
      </motion.div>
    </div>
  );
}