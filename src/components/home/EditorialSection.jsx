import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

export default function EditorialSection({ index = "00", label = "", children }) {
  const flag = `var(--flag-${((parseInt(index, 10) || 1) % 8) + 1}, hsl(var(--primary)))`;

  return (
    <motion.section
      id={`sec-${index}`}
      data-gp-section
      tabIndex={-1}
      aria-label={`${index} ${label}`}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-8% 0px" }}
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
      className="relative grid scroll-mt-20 grid-cols-1 gap-x-8 outline-none lg:grid-cols-[6.5rem_1fr]"
    >
      <div className="hidden lg:flex flex-col items-end select-none">
        <motion.span
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: EASE } } }}
          className="jp-index text-[3.8rem] leading-[0.85] font-light text-foreground/12"
        >
          {index}
        </motion.span>
        <motion.span
          variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.65, ease: EASE } } }}
          className="mt-5 w-px flex-1 min-h-[3rem] origin-top opacity-45"
          style={{ background: flag }}
        />
      </div>

      <div className="min-w-0">
        <motion.header
          variants={{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: EASE } } }}
          className="mb-4 grid grid-cols-[auto_1fr] items-start gap-x-3 border-t pt-3 jp-rule sm:mb-5 sm:grid-cols-[4rem_1fr_auto] sm:gap-x-5"
        >
          <span className="tech-label tabular-nums" style={{ color: flag }}>{index}</span>
          <div className="min-w-0">
            <h2 className="break-words font-display text-[clamp(1.45rem,7vw,2rem)] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[2.15rem]">
              {label}
            </h2>
          </div>
          <span className="hidden sm:block jp-kicker text-right">MABIS SECTION</span>
        </motion.header>

        <motion.div
          variants={{ hidden: { opacity: 0 }, show: { opacity: 1, transition: { duration: 0.55, ease: EASE } } }}
          className="-mx-4 sm:mx-0"
        >
          {children}
        </motion.div>
      </div>
    </motion.section>
  );
}
