import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowUpRight, Plus } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import MagneticButton from "@/components/MagneticButton";
import Marquee from "@/components/Marquee";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

// staggered character container helpers
const charParent = (stagger, delay) => ({
  hidden: {},
  show: { transition: { staggerChildren: stagger, delayChildren: delay } },
});
const charChild = {
  hidden: { y: "115%", opacity: 0 },
  show: { y: "0%", opacity: 1, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

function SplitChars({ text, stagger = 0.04, delay = 0, className = "" }) {
  return (
    <motion.span
      className={`reveal-mask ${className}`}
      variants={charParent(stagger, delay)}
      initial="hidden"
      animate="show"
      style={{ display: "inline-block" }}
    >
      {Array.from(text).map((c, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
          <motion.span variants={charChild} style={{ display: "inline-block" }}>{c === " " ? "\u00A0" : c}</motion.span>
        </span>
      ))}
    </motion.span>
  );
}

export default function Splash() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1800);
    return () => clearTimeout(t);
  }, []);

  const enter = () => navigate(isAuthenticated ? "/home" : "/login");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-ink text-bone">
      {/* animated grid */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.5 }}
        transition={{ duration: 1.4 }}
        className="absolute inset-0 grid-bg"
      />
      {/* radial glow */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.5 }}
        transition={{ duration: 1.6, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute left-1/2 top-1/2 h-[80vw] w-[80vw] max-w-[820px] max-h-[820px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.35) 0%, transparent 60%)" }}
      />

      {/* top bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-5 sm:px-8 py-5"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center border border-bone/30">
            <img src={LOGO} alt="MABIS" className="h-5 w-5 object-contain" />
          </span>
          <span className="tech-label text-bone/60">MABIS ／ COMMUNITY MEETING</span>
        </div>
        <span className="tech-label hidden sm:block text-bone/50">EST. BANGKOK ／ TH</span>
      </motion.div>

      {/* vertical side labels */}
      <motion.span
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.8 }}
        className="vert-text tech-label absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 text-bone/45 z-10 hidden md:block"
      >SECONDARY ／ COMMUNITY</motion.span>
      <motion.span
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.1, duration: 0.8 }}
        className="vert-text tech-label absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 text-bone/45 z-10 hidden md:block"
      >N° 2026 ／ EDITION</motion.span>

      {/* crosshair decorations */}
      <Plus className="absolute top-24 left-6 h-3 w-3 text-bone/30" />
      <Plus className="absolute bottom-24 right-6 h-3 w-3 text-bone/30" />
      <Plus className="absolute top-1/3 right-1/4 h-2.5 w-2.5 text-primary/60" />

      {/* center stage */}
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-5 sm:px-8">
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
          className="tech-label text-primary mb-6"
        >
          ／ 01 — SECONDARY COMMUNITY MEETING APP
        </motion.div>

        <h1 className="text-center font-display font-extralight tracking-ultra leading-[0.9] text-6xl sm:text-8xl md:text-9xl lg:text-[11rem]">
          <span className="block">
            <SplitChars text="COMMUNITY" stagger={0.05} delay={0.6} />
          </span>
          <span className="block mt-2 sm:mt-3">
            <SplitChars text="MEETING" stagger={0.05} delay={1.0} />
          </span>
        </h1>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.6, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="h-px w-40 bg-bone/40 my-8 sm:my-10"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 0.7 }}
          className="max-w-md text-center text-sm sm:text-base text-bone/65 leading-relaxed"
        >
          A weekly ritual of voice, presence, and shared decision —
          recorded, remembered, and refined by the secondary community.
        </motion.p>

        <AnimatePresence>
          {ready && (
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 180, damping: 18 }}
              className="mt-10 sm:mt-12"
            >
              <MagneticButton strength={0.4}>
                <button
                  onClick={enter}
                  data-cursor="ENTER"
                  className="group relative flex items-center gap-4 border border-bone/40 bg-bone/5 px-8 py-4 backdrop-blur-sm hover:bg-bone hover:text-ink transition-colors"
                >
                  <span className="tech-label">N° 02</span>
                  <span className="text-lg sm:text-xl font-display font-normal tracking-tight">
                    {isAuthenticated ? "ENTER ／ START" : "ENTER ／ LOG IN"}
                  </span>
                  <span className="relative flex h-8 w-8 items-center justify-center overflow-hidden">
                    <motion.span animate={{ y: ready ? 0 : -24 }} transition={{ duration: 0.5 }}>
                      <ArrowUpRight className="h-6 w-6" />
                    </motion.span>
                  </span>
                </button>
              </MagneticButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* bottom marquee */}
      <div className="absolute bottom-0 left-0 right-0 z-10 border-t border-bone/15 py-3 bg-ink/80 backdrop-blur-sm">
        <Marquee speed={32} className="text-bone/55">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} className="flex items-center tech-label">
              <span className="px-6">SECONDARY COMMUNITY MEETING</span>
              <Plus className="h-3 w-3 text-primary/70" />
              <span className="px-6">FRIDAY ／ WEEKLY</span>
              <Plus className="h-3 w-3 text-primary/70" />
              <span className="px-6">MABIS ／ BANGKOK</span>
              <Plus className="h-3 w-3 text-primary/70" />
            </span>
          ))}
        </Marquee>
      </div>
    </div>
  );
}