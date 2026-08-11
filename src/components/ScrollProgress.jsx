import { motion, useScroll, useSpring } from "framer-motion";

/** Thin 2px scroll-progress bar pinned to the top of the viewport. */
export default function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return (
    <motion.div
      style={{ scaleX }}
      aria-hidden
      className="fixed left-0 top-0 z-[60] h-[2px] w-full origin-left bg-primary"
    />
  );
}