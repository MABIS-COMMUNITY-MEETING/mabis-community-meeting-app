import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { KONAMI } from "@/lib/hacker";

const KEY_MAP = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  b: "b", B: "b", a: "a", A: "a",
};

const RED = "#cf3441";
const CREAM = "#ece2cd";
const DARK = "#3b3b3b";

/** Famicom-style controller (flat illustration). Konami code (pad or keyboard) unlocks. */
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
      className={`absolute rounded-[2px] transition-colors ${cls}`}
      style={{ background: flash === dir ? RED : DARK }} />
  );

  const round = (label, left) => (
    <button type="button" aria-label={label.toUpperCase()} onClick={() => push(label)}
      className="absolute bottom-[16px] h-[46px] w-[46px] rounded-full transition-transform active:scale-95"
      style={{ left, background: RED, padding: "5px" }}>
      <span className="block h-full w-full rounded-full transition-colors"
        style={{ background: flash === label ? "#111" : DARK }} />
    </button>
  );

  return (
    <div className="mt-8 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative"
        style={{ width: 340, height: 150, background: RED, borderRadius: 10, boxShadow: "8px 8px 0 rgba(0,0,0,0.35)" }}
      >
        {/* cream inner panel — notched top-left step */}
        <div className="absolute" style={{
          left: 12, top: 10, right: 12, bottom: 10, background: CREAM, borderRadius: 8,
          clipPath: "polygon(0 0, 44% 0, 44% 34%, 100% 34%, 100% 100%, 0 100%)"
        }} />

        {/* horizontal black bar */}
        <div className="absolute" style={{ left: 0, right: 0, top: 96, height: 4, background: "#1e1e1e" }} />

        {/* D-pad */}
        <div className="absolute" style={{ left: 26, top: 46, width: 72, height: 72 }}>
          {pad("up", "left-[24px] top-0 w-6 h-6")}
          {pad("left", "left-0 top-[24px] w-6 h-6")}
          <div className="absolute left-[24px] top-[24px] w-6 h-6" style={{ background: DARK }} />
          {pad("right", "left-[48px] top-[24px] w-6 h-6")}
          {pad("down", "left-[24px] top-[48px] w-6 h-6")}
        </div>

        {/* select / start pill */}
        <div className="absolute flex items-center justify-center gap-2"
          style={{ left: 122, top: 82, width: 76, height: 32, background: RED, borderRadius: 8 }}>
          <span style={{ width: 22, height: 8, background: DARK, borderRadius: 3 }} />
          <span style={{ width: 22, height: 8, background: DARK, borderRadius: 3 }} />
        </div>

        {/* A / B buttons */}
        {round("b", 212)}
        {round("a", 264)}
      </motion.div>
    </div>
  );
}