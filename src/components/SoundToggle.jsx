import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";

/**
 * Minimal persistent audio control — "SND 01" / "SND 00" with an animated
 * state roll and a tiny 3-bar level indicator. Persists via lib/sound.
 */
export default function SoundToggle({ className = "" }) {
  const [on, setOn] = useState(isSoundEnabled());

  useEffect(() => {
    const h = (e) => setOn(!!e.detail);
    window.addEventListener("mabis-sound-changed", h);
    return () => window.removeEventListener("mabis-sound-changed", h);
  }, []);

  const toggle = () => {
    const next = !on;
    setSoundEnabled(next);
    setOn(next);
  };

  return (
    <button
      onClick={toggle}
      data-cursor={on ? "MUTE" : "SND"}
      aria-label={on ? "Turn sound off" : "Turn sound on"}
      aria-pressed={on}
      className={`flex h-9 items-center gap-2 border border-foreground/30 bg-background px-2.5 sm:px-3 tech-label text-foreground hover:bg-foreground hover:text-background transition-colors ${className}`}
    >
      <span className="flex items-end gap-[2px] h-3" aria-hidden>
        {[0.5, 1, 0.7].map((h, i) => (
          <motion.span
            key={i}
            className="w-[2px] bg-current"
            animate={on ? { height: [3, 10 * h + 2, 3] } : { height: 2 }}
            transition={on ? { duration: 0.9 + i * 0.18, repeat: Infinity, ease: "easeInOut" } : { duration: 0.25 }}
          />
        ))}
      </span>
      <span className="relative block h-3 overflow-hidden w-[52px]">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={on ? "on" : "off"}
            initial={{ y: 12 }}
            animate={{ y: 0 }}
            exit={{ y: -12 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 tabular-nums"
          >
            {on ? "SND 01" : "SND 00"}
          </motion.span>
        </AnimatePresence>
      </span>
    </button>
  );
}