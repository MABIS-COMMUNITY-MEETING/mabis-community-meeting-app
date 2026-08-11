import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { KONAMI } from "@/lib/hacker";

const KEY_MAP = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  b: "b", B: "b", a: "a", A: "a",
};

const BODY = "#8f1a1f";
const BODY_EDGE = "#6d1116";
const RED = "#c02a2f";
const CREAM = "linear-gradient(180deg,#e2dccb 0%,#cdc5b2 55%,#ded8c7 100%)";
const CREAM_FLAT = "#d5cebc";
const DARK = "#2f2f2f";
const DARK_2 = "#4d4d4d";

/**
 * Famicom controller illustration. Body 360x160, panel inset 12px.
 * Control row centerline y=105.
 */
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

  const arm = (dir, glyph, style) => (
    <button type="button" aria-label={dir} onClick={() => push(dir)}
      className="absolute flex items-center justify-center transition-colors"
      style={{ background: flash === dir ? RED : "transparent", color: "#9a9a9a", fontSize: 12, lineHeight: 1, ...style }}>
      {glyph}
    </button>
  );

  const roundBtn = (label, cx) => (
    <button type="button" aria-label={label.toUpperCase()} onClick={() => push(label)}
      className="absolute rounded-full transition-transform active:scale-95"
      style={{ left: cx - 24, top: 81, width: 48, height: 48, background: RED, padding: 4, border: "2px solid #1b1b1b", boxSizing: "border-box" }}>
      <span className="block h-full w-full rounded-full transition-colors"
        style={{ background: flash === label ? "#111" : "linear-gradient(145deg,#5a5a5a,#2a2a2a)" }} />
    </button>
  );

  return (
    <div className="mt-8 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative select-none" style={{ width: 396, height: 168 }}
      >
        {/* cable */}
        <div className="absolute" style={{ left: 0, top: 58, width: 40, height: 9, background: "#3a3a3a", borderRadius: 5 }} />

        <div className="absolute" style={{
          left: 30, top: 0, width: 366, height: 168, background: BODY, borderRadius: 18,
          border: `4px solid ${BODY_EDGE}`, boxSizing: "border-box", boxShadow: "6px 8px 0 rgba(0,0,0,0.28)"
        }}>
          {/* inner rim */}
          <div className="absolute" style={{ inset: 5, border: `2px solid ${RED}`, borderRadius: 13 }} />

          {/* cream panel with top-right red step */}
          <div className="absolute" style={{
            left: 12, top: 12, width: 334, height: 134, background: CREAM, backgroundColor: CREAM_FLAT, borderRadius: 3,
            clipPath: "polygon(0 0, 142px 0, 142px 50px, 334px 50px, 334px 134px, 0 134px)"
          }} />

          {/* player badge */}
          <div className="absolute flex items-center justify-center"
            style={{ left: 22, top: 20, width: 28, height: 28, background: "#111", color: "#e6e0d0", fontSize: 14 }}>I</div>

          {/* twin black lines through the control row */}
          <div className="absolute" style={{ left: 12, right: 12, top: 99, height: 3, background: "#1c1c1c" }} />
          <div className="absolute" style={{ left: 12, right: 12, top: 109, height: 3, background: "#1c1c1c" }} />

          {/* D-pad: red square recess 92x92 at (22,59) with black cross plate */}
          <div className="absolute" style={{ left: 22, top: 54, width: 92, height: 92, background: RED, border: "3px solid #1b1b1b", borderRadius: 4, boxSizing: "border-box" }}>
            {/* black cross plate — arms 30px, 86x86 inner area */}
            <div className="absolute" style={{
              left: 0, top: 0, width: 86, height: 86, background: "#1b1b1b",
              clipPath: "polygon(29px 0, 57px 0, 57px 29px, 86px 29px, 86px 57px, 57px 57px, 57px 86px, 29px 86px, 29px 57px, 0 57px, 0 29px, 29px 29px)"
            }} />
            {arm("up", "▲", { left: 33, top: 4, width: 20, height: 22 })}
            {arm("left", "◀", { left: 4, top: 33, width: 22, height: 20 })}
            {arm("right", "▶", { left: 60, top: 33, width: 22, height: 20 })}
            {arm("down", "▼", { left: 33, top: 60, width: 20, height: 22 })}
            <div className="absolute rounded-full" style={{ left: 30, top: 30, width: 26, height: 26, background: "linear-gradient(145deg,#5c5c5c,#2c2c2c)" }} />
          </div>

          {/* SELECT / START */}
          <div className="absolute flex justify-between" style={{ left: 120, top: 76, width: 100 }}>
            <span style={{ fontSize: 8, letterSpacing: "0.06em", color: "#2b2b2b" }}>SELECT</span>
            <span style={{ fontSize: 8, letterSpacing: "0.06em", color: "#2b2b2b" }}>START</span>
          </div>
          <div className="absolute flex items-center justify-center gap-3"
            style={{ left: 118, top: 90, width: 104, height: 30, background: RED, borderRadius: 15, border: "2px solid #1b1b1b", boxSizing: "border-box" }}>
            <span style={{ width: 34, height: 11, background: DARK, borderRadius: 6 }} />
            <span style={{ width: 34, height: 11, background: DARK, borderRadius: 6 }} />
          </div>

          {/* B / A */}
          <div className="absolute flex items-center justify-center"
            style={{ left: 240, top: 62, width: 26, height: 15, background: "#111", color: "#e6e0d0", fontSize: 9, borderRadius: 8 }}>B</div>
          <div className="absolute flex items-center justify-center"
            style={{ left: 296, top: 62, width: 26, height: 15, background: "#111", color: "#e6e0d0", fontSize: 9, borderRadius: 8 }}>A</div>
          {roundBtn("b", 253)}
          {roundBtn("a", 309)}
        </div>
      </motion.div>
    </div>
  );
}