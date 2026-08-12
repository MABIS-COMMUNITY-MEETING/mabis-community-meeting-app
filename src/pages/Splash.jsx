import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowUpRight, Plus, ArrowDown } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import MagneticButton from "@/components/MagneticButton";
import Marquee from "@/components/Marquee";
import KineticBackground from "@/components/KineticBackground";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

const EASE = [0.16, 1, 0.3, 1];
const charParent = (stagger, delay) => ({ hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } });
const charChild = {
  hidden: { y: "115%", opacity: 0 },
  show: { y: "0%", opacity: 1, transition: { duration: 0.7, ease: EASE } },
};

function SplitChars({ text, stagger = 0.05, delay = 0, className = "" }) {
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

  // pointer parallax for the hero typography
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 50, damping: 20 });
  const sy = useSpring(my, { stiffness: 50, damping: 20 });
  const titleX = useTransform(sx, (v) => v * 24);
  const titleY = useTransform(sy, (v) => v * 14);
  const bgX = useTransform(sx, (v) => v * -28);
  const bgY = useTransform(sy, (v) => v * -18);

  useEffect(() => {
    const t = setTimeout(() => setReady(true), 1700);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (!fine) return;
    const onMove = (e) => {
      mx.set((e.clientX / window.innerWidth - 0.5) * 2);
      my.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("mousemove", onMove);
    return () => window.removeEventListener("mousemove", onMove);
  }, [mx, my]);

  const enter = () => navigate(isAuthenticated ? "/home" : "/login");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-ink text-bone">
      <motion.div style={{ x: bgX, y: bgY }} className="absolute inset-0">
        <KineticBackground variant="ink" />
      </motion.div>

      {/* top bar */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.6, ease: EASE }}
        className="absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-5 sm:px-8 py-5"
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
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1, duration: 0.8, ease: EASE }}
        className="vert-text tech-label absolute left-5 sm:left-8 top-1/2 -translate-y-1/2 text-bone/45 z-20 hidden md:block"
      >SECONDARY ／ COMMUNITY</motion.span>
      <motion.span
        initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1, duration: 0.8, ease: EASE }}
        className="vert-text tech-label absolute right-5 sm:right-8 top-1/2 -translate-y-1/2 text-bone/45 z-20 hidden md:block"
      >N° 2026 ／ EDITION</motion.span>

      {/* crosshair decorations */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="pointer-events-none absolute inset-5 sm:inset-8 corner-bracket z-20" />
      <Plus className="absolute top-1/3 right-1/4 h-2.5 w-2.5 text-primary/60 z-20" />

      {/* center stage with pointer parallax */}
      <div className="relative z-10 flex min-h-screen flex-col items-start sm:items-center justify-center px-5 sm:px-8">
        {/* giant cropped background word */}
        <motion.span
          initial={{ opacity: 0 }} animate={{ opacity: 0.05 }} transition={{ delay: 0.4, duration: 1.2 }}
          className="pointer-events-none absolute top-[14%] left-1/2 -translate-x-1/2 font-display font-thin tracking-ultra text-bone leading-none select-none whitespace-nowrap huge-crop"
        >
          MABIS
        </motion.span>

        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.6 }}
          className="tech-label text-primary mb-6 flex items-center gap-3"
        >
          <motion.span initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 0.55, duration: 0.6, ease: EASE }} className="block h-px w-8 bg-primary origin-left" />
          ／ 01 — SECONDARY COMMUNITY MEETING APP
        </motion.div>

        <motion.div style={{ x: titleX, y: titleY }} className="will-change-transform">
          <h1 className="text-left sm:text-center font-display font-extralight tracking-ultra leading-[0.88] text-6xl sm:text-8xl md:text-9xl lg:text-[11rem]">
            <span className="block">
              <SplitChars text="COMMUNITY" stagger={0.05} delay={0.6} />
            </span>
            <span className="block mt-2 sm:mt-3 text-stroke-bone">
              <SplitChars text="MEETING" stagger={0.05} delay={1.0} />
            </span>
          </h1>
        </motion.div>

        <motion.div
          initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ delay: 1.6, duration: 0.8, ease: EASE }}
          className="h-px w-40 bg-bone/40 my-8 sm:my-10 origin-left sm:origin-center"
        />

        <motion.p
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.7, duration: 0.7 }}
          className="max-w-md text-left sm:text-center text-sm sm:text-base text-bone/65 leading-relaxed"
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
                  className="liquid-btn liquid-ink group relative flex items-center gap-4 border border-bone/40 bg-bone/5 px-8 py-4 text-bone backdrop-blur-sm"
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

        {/* scroll cue */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: ready ? 1 : 0 }} transition={{ delay: 0.4, duration: 0.6 }}
          className="absolute bottom-16 right-5 sm:right-10 flex flex-col items-center gap-2"
        >
          <span className="tech-label vert-text text-bone/45">SCROLL</span>
          <motion.span
            animate={{ y: [0, 8, 0] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown className="h-4 w-4 text-bone/50" />
          </motion.span>
        </motion.div>
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