import React, { useState, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import {
  getLoadingState,
  getServerLoadingState,
  subscribeToLoadingState,
} from "@/lib/loading-state";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

/**
 * Numeric loader. The selected UI font is captured for its full lifetime.
 * Progress now comes from actual route/module/data preparation; there is no
 * minimum animation delay holding the page after the useful work is ready.
 */
export default function LoadingScreen() {
  const loading = useSyncExternalStore(
    subscribeToLoadingState,
    getLoadingState,
    getServerLoadingState,
  );
  const [loadingFont] = useState(() => {
    if (typeof document === "undefined") return "'GNUFreeMonoUI'";
    return getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'";
  });
  const progress = Math.max(0, Math.min(100, Math.round(loading.progress)));

  return (
    <div
      className="loading-screen fixed inset-0 overflow-hidden bg-ink text-bone"
      style={{ "--loading-font": loadingFont }}
      aria-busy="true"
    >
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ duration: 1 }} className="absolute inset-0 grid-bg" />
      {/* faint drifting glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[60vw] w-[60vw] max-w-[600px] max-h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl blob-drift"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.28) 0%, transparent 62%)" }}
      />

      {/* corner brackets */}
      <div className="pointer-events-none absolute inset-5 sm:inset-8 corner-bracket" />

      {/* meta */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 tech-label text-bone/50">INITIALISING</div>
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 tech-label text-bone/50">MABIS 2026</div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        <motion.div
          layout
          transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="flex items-baseline"
          aria-hidden
        >
          <span className="font-display font-normal tracking-ultra text-[22vw] sm:text-[16vw] leading-none tabular-nums">
            {String(progress).padStart(3, "0")}
          </span>
          <span className="ml-2 tech-label text-primary">％</span>
        </motion.div>

        {/* assembling wordmark behind counter */}
        <span
          style={{ clipPath: `inset(0 ${(100 - progress) * 0.6}% 0 0)` }}
          className="absolute font-display font-normal tracking-ultra text-bone/8 text-[18vw] leading-none select-none"
          aria-hidden
        >
          COMMUNITY
        </span>

        {/* progress hairline */}
        <div className="relative mt-6 h-px w-56 overflow-hidden bg-bone/15" aria-hidden>
          <div
            className="absolute inset-y-0 left-0 w-full origin-left bg-primary transition-transform duration-200"
            style={{ transform: `scaleX(${progress / 100})` }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.18 }}
          className="mt-5 flex items-center gap-3 tech-label text-bone/45"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            className="inline-block h-2.5 w-2.5 shrink-0 border border-bone/40 border-t-primary"
            aria-hidden
          />
          <span className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-bone/70">{loading.label}</span>
            <span className="tabular-nums">{loading.detail}</span>
          </span>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 tech-label text-bone/40">
        <img src={LOGO} alt="" className="h-5 w-5 object-contain opacity-70 inline-block mr-2 align-middle" />
        SECONDARY COMMUNITY MEETING
      </div>
    </div>
  );
}