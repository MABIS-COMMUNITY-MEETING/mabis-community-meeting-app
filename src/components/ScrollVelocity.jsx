import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Restrained typographic drift.
 * The text moves slowly with scroll position, acting as spatial punctuation
 * rather than a separate visual effect system.
 */
export default function ScrollVelocity({ text = "", className = "" }) {
  const { scrollYProgress } = useScroll();
  const x = useTransform(scrollYProgress, [0, 1], ["2%", "-12%"]);

  return (
    <div className={`relative overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div style={{ x }} className="inline-flex will-change-transform">
        <span className="relative select-none">{text}</span>
        <span aria-hidden className="relative select-none ml-[0.6em]">{text}</span>
      </motion.div>
    </div>
  );
}
