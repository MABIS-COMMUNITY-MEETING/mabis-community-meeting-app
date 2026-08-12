import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { KONAMI } from "@/lib/hacker";
import { playClick } from "@/lib/sound";

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
    <div className="mt-8 flex justify-center overflow-hidden h-[126px] sm:h-[168px]">
      <div className="shrink-0 scale-[0.75] origin-top sm:scale-100">
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="relative select-none"
          style={{ width: 396, height: 168 }}
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

          {/* D-pad */}
          <div className="absolute" style={{
            left: 18, top: 51, width: 94, height: 94, background: "#1b1b1b",
            clipPath: "polygon(32px 0, 62px 0, 62px 32px, 94px 32px, 94px 62px, 62px 62px, 62px 94px, 32px 94px, 32px 62px, 0 62px, 0 32px, 32px 32px)"
          }} />
          <div className="absolute" style={{
            left: 20, top: 53, width: 90, height: 90, background: RED,
            clipPath: "polygon(30px 0, 60px 0, 60px 30px, 90px 30px, 90px 60px, 60px 60px, 60px 90px, 30px 90px, 30px 60px, 0 60px, 0 30px, 30px 30px)"
          }} />
          <div className="absolute" style={{ left: 23, top: 56, width: 84, height: 84 }}>
            <div className="absolute" style={{
              left: 0, top: 0, width: 84, height: 84, background: "#1b1b1b",
              clipPath: "polygon(30px 0, 54px 0, 54px 30px, 84px 30px, 84px 54px, 54px 54px, 54px 84px, 30px 84px, 30px 54px, 0 54px, 0 30px, 30px 30px)"
            }} />
            {arm("up", "▲", { left: 30, top: 4, width: 24, height: 22 })}
            {arm("left", "◀", { left: 4, top: 30, width: 22, height: 24 })}
            {arm("right", "▶", { left: 58, top: 30, width: 22, height: 24 })}
            {arm("down", "▼", { left: 30, top: 58, width: 24, height: 22 })}
            <div className="absolute rounded-full" style={{ left: 30, top: 30, width: 24, height: 24, background: "linear-gradient(145deg,#5c5c5c,#2c2c2c)" }} />
          </div>

          {/* SELECT / START */}
          <div className="absolute flex justify-between" style={{ left: 120, top: 76, width: 100 }}>
            <span style={{ fontSize: 8, letterSpacing: "0.06em", color: "#2b2b2b" }}>SELECT</span>
            <span style={{ fontSize: 8, letterSpacing: "0.06em", color: "#2b2b2b" }}>START</span>
          </div>
          <div className="absolute flex items-center justify-center gap-3"
            style={{ left: 118, top: 90, width: 104, height: 30, background: RED, borderRadius: 15, border: "2px solid #1b1b1b", boxSizing: "border-box" }}>
            <button type="button" aria-label="SELECT" onClick={() => playClick()}
              style={{ width: 34, height: 11, background: DARK, borderRadius: 6 }} />
            <button type="button" aria-label="START" onClick={() => playClick()}
              style={{ width: 34, height: 11, background: DARK, borderRadius: 6 }} />
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
    </div>
  );
}