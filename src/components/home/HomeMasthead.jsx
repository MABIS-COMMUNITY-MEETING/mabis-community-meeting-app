import React from "react";
import { motion } from "framer-motion";

const EASE = [0.16, 1, 0.3, 1];

export default function HomeMasthead({ week_label, date_label }) {
  return (
    <section className="relative min-h-[58vh] border-b jp-rule pb-10 sm:pb-14 grid grid-cols-1 lg:grid-cols-[1fr_15rem] gap-x-12 gap-y-10 items-end">
      <div className="min-w-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="mb-8 flex items-center gap-3"
        >
          <span className="h-px w-10 bg-primary" />
          <span className="jp-kicker">COMMUNITY DASHBOARD</span>
        </motion.div>

        <h1 className="font-display font-light tracking-[-0.065em] leading-[0.9]">
          <span className="reveal-mask block">
            <motion.span
              initial={{ y: "102%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.78, ease: EASE, delay: 0.06 }}
              className="block text-[11.5vw] lg:text-[7.6vw] -ml-[0.035em]"
            >
              COMMUNITY
            </motion.span>
          </span>
          <span className="reveal-mask block">
            <motion.span
              initial={{ y: "102%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.78, ease: EASE, delay: 0.14 }}
              className="block text-[11.5vw] lg:text-[7.6vw] -ml-[0.035em] text-foreground/28"
            >
              MEETING
            </motion.span>
          </span>
        </h1>

        <div className="mt-7 flex max-w-2xl items-start gap-4 border-t jp-rule pt-4">
          <span className="tech-label shrink-0">01</span>
          <p className="max-w-xl text-xs sm:text-sm leading-6 text-muted-foreground">
            A shared working space for meetings, announcements, schedules, jobs, notes and community records.
          </p>
        </div>
      </div>

      <motion.aside
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.28 }}
        className="lg:border-l jp-rule lg:pl-6 lg:pb-1"
      >
        <div className="mb-5 flex items-center justify-between lg:block">
          <span className="jp-kicker">BANGKOK TH</span>
          <span className="jp-roman lg:mt-2 lg:block">MABIS 2026</span>
        </div>
        <dl className="space-y-2.5 tech-label text-muted-foreground">
          <div className="flex justify-between gap-4"><dt>WEEK</dt><dd className="text-foreground tabular-nums">{week_label}</dd></div>
          <div className="flex justify-between gap-4"><dt>DATE</dt><dd className="text-foreground tabular-nums">{date_label}</dd></div>
          <div className="flex justify-between gap-4"><dt>CYCLE</dt><dd className="text-foreground">FRIDAY</dd></div>
          <div className="flex justify-between gap-4"><dt>INDEX</dt><dd className="text-foreground tabular-nums">10</dd></div>
        </dl>
        <div className="my-5 h-px bg-foreground/15" />
        <p className="jp-kicker">SCROLL TO CONTINUE</p>
      </motion.aside>
    </section>
  );
}
