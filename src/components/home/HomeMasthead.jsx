import React from "react";
import { motion } from "framer-motion";
import JapaneseText from "@/components/JapaneseText";

const EASE = [0.16, 1, 0.3, 1];

export default function HomeMasthead({ week_label, date_label }) {
  return (
    <section className="relative grid min-h-0 grid-cols-1 items-end gap-x-12 gap-y-7 border-b pb-8 pt-5 jp-rule sm:min-h-[58vh] sm:gap-y-10 sm:pb-14 sm:pt-0 lg:grid-cols-[1fr_15rem]">
      <div className="min-w-0">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.45 }}
          className="mb-5 flex items-center gap-3 sm:mb-8"
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
              className="-ml-[0.035em] block text-[clamp(2.75rem,13.7vw,5.5rem)] lg:text-[7.6vw]"
            >
              COMMUNITY
            </motion.span>
          </span>
          <span className="reveal-mask block">
            <motion.span
              initial={{ y: "102%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.78, ease: EASE, delay: 0.14 }}
              className="-ml-[0.035em] block text-[clamp(2.75rem,13.7vw,5.5rem)] text-foreground/28 lg:text-[7.6vw]"
            >
              MEETING
            </motion.span>
          </span>
        </h1>

        <div className="mt-7 flex max-w-2xl items-start gap-4 border-t jp-rule pt-4">
          <span className="tech-label shrink-0">01</span>
          <JapaneseText
            as="p"
            ja="ミーティング、お知らせ、スケジュール、係、メモ、コミュニティの記録をまとめて使える、みんなで使う作業スペースです。"
            className="max-w-xl text-xs sm:text-sm leading-6 text-muted-foreground"
            japaneseClassName="mt-1 block text-[0.9em]"
          >
            A shared working space for meetings, announcements, schedules, jobs, notes and community records.
          </JapaneseText>
        </div>
      </div>

      <motion.aside
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.28 }}
        className="border-t pt-4 jp-rule lg:border-l lg:border-t-0 lg:pb-1 lg:pl-6 lg:pt-0"
      >
        <div className="mb-5 flex items-center justify-between lg:block">
          <span className="jp-kicker">BANGKOK TH</span>
          <span className="jp-roman lg:mt-2 lg:block">MABIS 2026</span>
        </div>
        <dl className="grid grid-cols-2 gap-x-5 gap-y-2.5 tech-label text-muted-foreground lg:block lg:space-y-2.5">
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
