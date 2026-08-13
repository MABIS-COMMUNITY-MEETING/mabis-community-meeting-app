import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Quiet typographic interlude. The band moves slowly with page progress instead
 * of splitting into RGB ghost layers, so it reads as editorial punctuation.
 */
export default function ScrollVelocity({ text = "", className = "" }) {
  const { scrollYProgress } = useScroll();
  const x = useTransform(scrollYProgress, [0, 1], ["1%", "-10%"]);

  return (
    <div className={`relative overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div style={{ x }} className="inline-flex will-change-transform">
        <span className="select-none">{text}</span>
        <span aria-hidden className="ml-[0.75em] select-none">{text}</span>
      </motion.div>
    </div>
  );
}
