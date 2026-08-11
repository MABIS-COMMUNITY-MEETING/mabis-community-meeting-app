import React, { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Scroll-reactive heading. As it travels through the viewport its letter-spacing
 * opens up and it drifts horizontally — kinetic typography that responds to
 * scrolling rather than sitting static. Intentionally allowed to overflow.
 */
export default function KineticHeading({ text = "", className = "" }) {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const ls = useTransform(scrollYProgress, [0, 0.5, 1], ["-0.06em", "0.01em", "0.18em"]);
  const x = useTransform(scrollYProgress, [0, 1], ["3%", "-5%"]);
  const y = useTransform(scrollYProgress, [0, 0.5, 1], [24, 0, -24]);
  const opacity = useTransform(scrollYProgress, [0, 0.18, 0.82, 1], [0.12, 1, 1, 0.12]);

  return (
    <motion.div ref={ref} style={{ x, y }} className="whitespace-nowrap">
      <motion.span
        style={{ letterSpacing: ls, opacity }}
        className={`inline-block font-display font-thin tracking-ultra leading-none will-change-transform ${className}`}
      >
        {text}
      </motion.span>
    </motion.div>
  );
}