import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { KONAMI } from "@/lib/hacker";

const KEY_MAP = {
  ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
  b: "b", B: "b", a: "a", A: "a",
};

const RED = "#b81f2a";
const RED_DARK = "#7d1119";
const CREAM = "#d9d2c2";
const DARK = "#333333";
const DARK_2 = "#4a4a4a";

/**
 * Famicom controller illustration. Body 360x160, panel inset 14px.
 * Row centerline sits at y=105; d-pad, pill and A/B all align to it.
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

  // d-pad arm = 22px, cross 66x66 at (25,72)
  const arm = (dir, style) => (
    <button type="button" aria-label={dir} onClick={() => push(dir)}
      className="absolute transition-colors"
      style={{ background: flash === dir ? RED : DARK_2, ...style }} />
  );

  const roundBtn = (label, cx) => (
    <button type="button" aria-label={label.toUpperCase()} onClick={() => push(label)}
      className="absolute rounded-full transition-transform active:scale-95"
      style={{ left: cx - 23, top: 82, width: 46, height: 46, background: RED, padding: 5 }}>
      <span className="block h-full w-full rounded-full transition-colors"
        style={{ background: flash === label ? "#111" : DARK_2 }} />
    </button>
  );

  return (
    <div className="mt-8 flex justify-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="relative select-none"
        style={{ width: 360, height: 160, background: RED, borderRadius: 14, border: `3px solid ${RED_DARK}`, boxShadow: "6px 6px 0 rgba(0,0,0,0.3)" }}
      >
        {/* cream panel with top-right red step */}
        <div className="absolute" style={{
          left: 14, top: 14, width: 332, height: 132, background: CREAM, borderRadius: 4,
          clipPath: "polygon(0 0, 140px 0, 140px 48px, 332px 48px, 332px 132px, 0 132px)"
        }} />

        {/* player badge */}
        <div className="absolute flex items-center justify-center"
          style={{ left: 24, top: 22, width: 26, height: 26, background: "#111", color: CREAM, fontSize: 13 }}>I</div>

        {/* twin black lines through the control row */}
        <div className="absolute" style={{ left: 14, right: 14, top: 100, height: 3, background: "#1c1c1c" }} />
        <div className="absolute" style={{ left: 14, right: 14, top: 110, height: 3, background: "#1c1c1c" }} />

        {/* D-pad: 66x66 at (25,72), arms 22px */}
        <div className="absolute" style={{ left: 28, top: 75, width: 60, height: 60, background: RED, borderRadius: 4,
          clipPath: "polygon(20px 0, 40px 0, 40px 20px, 60px 20px, 60px 40px, 40px 40px, 40px 60px, 20px 60px, 20px 40px, 0 40px, 0 20px, 20px 20px)" }}>
          {arm("up", { left: 24, top: 4, width: 12, height: 16 })}
          {arm("left", { left: 4, top: 24, width: 16, height: 12 })}
          {arm("right", { left: 40, top: 24, width: 16, height: 12 })}
          {arm("down", { left: 24, top: 40, width: 12, height: 16 })}
          <div className="absolute" style={{ left: 20, top: 20, width: 20, height: 20, background: DARK_2 }} />
        </div>

        {/* SELECT / START */}
        <div className="absolute flex gap-3" style={{ left: 122, top: 78, width: 96, justifyContent: "center" }}>
          <span style={{ fontSize: 8, letterSpacing: "0.08em", color: "#333" }}>SELECT</span>
          <span style={{ fontSize: 8, letterSpacing: "0.08em", color: "#333" }}>START</span>
        </div>
        <div className="absolute flex items-center justify-center gap-3"
          style={{ left: 122, top: 90, width: 96, height: 30, background: RED, borderRadius: 15 }}>
          <span style={{ width: 30, height: 10, background: DARK, borderRadius: 5 }} />
          <span style={{ width: 30, height: 10, background: DARK, borderRadius: 5 }} />
        </div>

        {/* B / A labels + buttons, centered at x=256 and x=310 */}
        <div className="absolute flex items-center justify-center"
          style={{ left: 244, top: 66, width: 24, height: 14, background: "#111", color: CREAM, fontSize: 9, borderRadius: 7 }}>B</div>
        <div className="absolute flex items-center justify-center"
          style={{ left: 298, top: 66, width: 24, height: 14, background: "#111", color: CREAM, fontSize: 9, borderRadius: 7 }}>A</div>
        {roundBtn("b", 256)}
        {roundBtn("a", 310)}
      </motion.div>
    </div>
  );
}