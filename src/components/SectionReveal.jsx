import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

/**
 * Choreographed section entrance — the editorial motion language applied to
 * any block. On scroll-in: the index slides in, the kicker fades, a hairline
 * draws itself across, then the panel clips upward into place. Pieces react
 * together rather than fading independently.
 */
export default function SectionReveal({ index = "00", label = "", jp = "", children, className = "" }) {
  return (
    <motion.section
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-12% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } } }}
      className={className}
    >
      <motion.div
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4"
      >
        <motion.span
          variants={{ hidden: { x: -14, opacity: 0 }, show: { x: 0, opacity: 1, transition: { duration: 0.5, ease: EASE } } }}
          className="tech-label text-primary"
        >
          {index}
        </motion.span>
        <motion.span
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4 } } }}
          className="tech-label text-muted-foreground"
        >
          {label}
        </motion.span>
        {jp && (
          <motion.span
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delay: 0.1 } } }}
            className="font-jp text-sm text-foreground/55 hidden sm:block"
            lang="ja"
          >
            {jp}
          </motion.span>
        )}
        <motion.span
          variants={{ hidden: { scaleX: 0 }, show: { scaleX: 1, transition: { duration: 0.7, ease: EASE, delay: 0.08 } } }}
          className="flex-1 h-px bg-foreground/15 origin-left"
        />
        <motion.span
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.4, delay: 0.18 } } }}
          className="tech-label text-muted-foreground hidden sm:block"
        > SECTION
        </motion.span>
      </motion.div>

      <motion.div
        variants={{
          hidden: { y: 30, opacity: 0, clipPath: "inset(0 0 100% 0)" },
          show: { y: 0, opacity: 1, clipPath: "inset(0 0 0 0)", transition: { duration: 0.75, ease: EASE } },
        }}
      >
        {children}
      </motion.div>
    </motion.section>
  );
}