import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { KONAMI } from "@/lib/hacker";

const KEY_MAP = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  b: "b", B: "b", a: "a", A: "a",
};

/** Famicom-style controller. Enter the Konami code (pad or keyboard) to unlock. */
export default function FamicomController({ onUnlock }) {
  const seq = useRef([]);
  const [flash, setFlash] = useState(null);

  const push = (input) => {
    setFlash(input);
    setTimeout(() => setFlash(null), 140);
    const next = [...seq.current, input].slice(-KONAMI.length);
    seq.current = next;
    if (next.length === KONAMI.length && next.every((v, i) => v === KONAMI[i])) {
      seq.current = [];
      onUnlock();
    }
  };

  useEffect(() => {
    const onKey = (e) => {
      const input = KEY_MAP[e.key];
      if (input) push(input);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const pad = (dir, cls) => (
    <button type="button" aria-label={dir} onClick={() => push(dir)}
      className={`absolute bg-[#2b2b2b] hover:bg-[#3d3d3d] active:bg-primary transition-colors ${cls} ${flash === dir ? "!bg-primary" : ""}`} />
  );

  const round = (label) => (
    <button type="button" aria-label={label.toUpperCase()} onClick={() => push(label)}
      className={`w-10 h-10 rounded-full bg-[#8b1220] hover:bg-primary active:scale-95 transition-all text-bone tech-label flex items-center justify-center border-2 border-[#5e0b16] ${flash === label ? "!bg-primary" : ""}`}>
      {label.toUpperCase()}
    </button>
  );

  return (
    <div className="mt-8 flex flex-col items-center gap-3">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative w-full max-w-[320px] border-2 border-foreground/25 bg-[#e6ded0] px-5 py-4 shadow-ink"
      >
        <div className="flex items-center justify-between gap-4">
          {/* D-pad */}
          <div className="relative w-[84px] h-[84px]">
            {pad("up", "left-[28px] top-0 w-7 h-7")}
            {pad("left", "left-0 top-[28px] w-7 h-7")}
            <div className="absolute left-[28px] top-[28px] w-7 h-7 bg-[#2b2b2b]" />
            {pad("right", "left-[56px] top-[28px] w-7 h-7")}
            {pad("down", "left-[28px] top-[56px] w-7 h-7")}
          </div>

          <div className="flex-1 flex flex-col items-center gap-1">
            <div className="h-2 w-16 bg-[#8b1220]/70" />
            <div className="h-2 w-16 bg-[#8b1220]/70" />
            <span className="tech-label text-[9px] text-[#2b2b2b]/60">FAMICOM</span>
          </div>

          <div className="flex items-end gap-2 -rotate-12">
            {round("b")}
            {round("a")}
          </div>
        </div>

      </motion.div>
    </div>
  );
}