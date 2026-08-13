import React from "react";
import { motion, useScroll, useVelocity, useSpring, useTransform } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

/**
 * Giant typographic band that drifts with scroll position and separates into
 * RGB-split ghost layers when the user scrolls fast — "headings that distort
 * during scrolling" + "letters that temporarily separate during transitions".
 */
export default function ScrollVelocity({ text = "", className = "" }) {
  const { scrollY } = useScroll();
  const raw = useVelocity(scrollY);
  const vel = useSpring(raw, { stiffness: 90, damping: 30, mass: 0.4 });
  const x = useTransform(vel, [-5000, 0, 5000], [90, 0, -90]);
  const sep = useTransform(vel, [-6000, 0, 6000], [14, 0, 14]);
  const ghostA = useTransform(sep, (s) => `-${s}px`);
  const ghostB = useTransform(sep, (s) => `${s}px`);
  const ghostOpacity = useTransform(vel, [-300, 0, 300], [0.6, 0, 0.6]);

  return (
    <div className={`relative overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div style={{ x }} className="relative inline-flex will-change-transform">
        <motion.span aria-hidden style={{ x: ghostA, opacity: ghostOpacity }} className="absolute inset-0 select-none text-primary">{text}</motion.span>
        <motion.span aria-hidden style={{ x: ghostB, opacity: ghostOpacity }} className="absolute inset-0 select-none text-secondary">{text}</motion.span>
        <span className="relative select-none">{text}</span>
      </motion.div>
    </div>
  );
}