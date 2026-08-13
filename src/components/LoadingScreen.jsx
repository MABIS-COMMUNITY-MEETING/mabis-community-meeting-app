import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

/**
 * Numeric loader. A giant Iosevka counter climbs 00 → 100 while a hairline
 * sweeps across, the grid initializes, and a masked wordmark assembles
 * beneath — then resolves toward the app. Not a generic spinner.
 */
export default function LoadingScreen() {
  const [done, setDone] = useState(false);
  const raf = useRef();
  const countRef = useRef(null);
  const wordmarkRef = useRef(null);
  const lineRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const dur = 1300;
    let previous = -1;
    const tick = (t) => {
      const p = Math.min((t - start) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      const n = Math.round(eased * 100);
      if (n !== previous) {
        previous = n;
        if (countRef.current) countRef.current.textContent = String(n).padStart(3, "0");
        if (wordmarkRef.current) wordmarkRef.current.style.clipPath = `inset(0 ${(100 - n) * 0.6}% 0 0)`;
        if (lineRef.current) lineRef.current.style.transform = `scaleX(${n / 100})`;
        if (statusRef.current) statusRef.current.textContent = `LOADING ASSETS ／ ${n}%`;
      }
      if (p < 1) raf.current = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div className="fixed inset-0 overflow-hidden bg-ink text-bone">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} transition={{ duration: 1 }} className="absolute inset-0 grid-bg" />
      {/* faint drifting glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[60vw] w-[60vw] max-w-[600px] max-h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl blob-drift"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.28) 0%, transparent 62%)" }}
      />

      {/* corner brackets */}
      <div className="pointer-events-none absolute inset-5 sm:inset-8 corner-bracket" />

      {/* meta */}
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 tech-label text-bone/50">／ INITIALISING</div>
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 tech-label text-bone/50">MABIS ／ 2026</div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        <AnimatePresence>
          {!done && (
            <motion.div
              key="count"
              exit={{ opacity: 0, scale: 1.04 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-baseline"
            >
              <span ref={countRef} className="font-display font-thin tracking-ultra text-[22vw] sm:text-[16vw] leading-none tabular-nums">
                000
              </span>
              <span className="ml-2 tech-label text-primary">％</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* assembling wordmark behind counter */}
        <span ref={wordmarkRef}
          style={{ clipPath: "inset(0 100% 0 0)" }}
          className="absolute font-display font-thin tracking-ultra text-bone/8 text-[18vw] leading-none select-none"
        >
          COMMUNITY
        </span>

        {/* sweeping line */}
        <div className="relative mt-6 h-px w-56 overflow-hidden bg-bone/15">
          <div ref={lineRef}
            className="absolute inset-y-0 left-0 w-full origin-left bg-primary"
            style={{ transform: "scaleX(0)" }}
          />
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-5 flex items-center gap-3 tech-label text-bone/45"
        >
          <motion.span
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "linear" }}
            className="inline-block h-2.5 w-2.5 border border-bone/40 border-t-primary"
          />
          <span ref={statusRef}>LOADING ASSETS ／ 0%</span>
        </motion.div>
      </div>

      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 tech-label text-bone/40">
        <img src={LOGO} alt="" className="h-5 w-5 object-contain opacity-70 inline-block mr-2 align-middle" />
        SECONDARY COMMUNITY MEETING
      </div>
    </div>
  );
}