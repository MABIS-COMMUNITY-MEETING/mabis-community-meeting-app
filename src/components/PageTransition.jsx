import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { playTransition } from "@/lib/sound";

const EASE = [0.16, 1, 0.3, 1];

/**
 * Quiet page transition: a short opacity/position shift and a single ruled
 * accent. Navigation should preserve orientation, not become a spectacle.
 */
export default function PageTransition({ children }) {
  useEffect(() => { playTransition(); }, []);

  return (
    <motion.div
      className="relative"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.32, ease: EASE }}
    >
      <motion.div
        aria-hidden
        className="fixed left-0 right-0 top-0 z-[80] h-px origin-left bg-primary pointer-events-none"
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        exit={{ scaleX: 0, transformOrigin: "right" }}
        transition={{ duration: 0.42, ease: EASE }}
      />
      {children}
    </motion.div>
  );
}
