import React, { useEffect, useRef, useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { animationsDisabled, MOTION_EVENT } from "@/lib/motion-preference";
import { PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";
import { rhythmScale } from "@/lib/sound-rhythm";

const BAR_SCALES = [0.5, 1, 0.72];
const IDLE_SCALE = 0.2;

/**
 * Minimal persistent audio control. While sound is on, the level bars beat in
 * time with a stored rhythm envelope (@/lib/sound-rhythm) — low, mid and high
 * bands driving the three bars.
 *
 * Nothing is ever played. There is no AudioContext, no media element and no
 * recording in this path; the bars are moved by a timer reading numbers.
 *
 * The loop stays cheap and yields to every preference the contract requires: it
 * does not start when sound is off, under prefers-reduced-motion, with
 * animations disabled, in performance-lite, or while the tab is hidden. That
 * preserves this component's original intent — a visible toggle must not keep a
 * perpetual animation running on a phone.
 */
export default function SoundToggle({ className = "" }) {
  const [on, setOn] = useState(isSoundEnabled());
  const [prefsVersion, setPrefsVersion] = useState(0);
  const barsRef = useRef([]);

  useEffect(() => {
    const handleChange = (event) => setOn(!!event.detail);
    window.addEventListener("mabis-sound-changed", handleChange);
    return () => window.removeEventListener("mabis-sound-changed", handleChange);
  }, []);

  // Re-evaluate the loop when motion or performance preferences change.
  useEffect(() => {
    const bump = () => setPrefsVersion((v) => v + 1);
    window.addEventListener(MOTION_EVENT, bump);
    window.addEventListener(PERFORMANCE_TIER_EVENT, bump);
    return () => {
      window.removeEventListener(MOTION_EVENT, bump);
      window.removeEventListener(PERFORMANCE_TIER_EVENT, bump);
    };
  }, []);

  useEffect(() => {
    const bars = barsRef.current.filter(Boolean);
    if (!bars.length) return undefined;

    // Transform is written imperatively in both states so React never fights
    // the animation frame, and no render happens per frame.
    const rest = () => bars.forEach((el, index) => {
      el.style.transition = "";
      el.style.transform = `scaleY(${on ? BAR_SCALES[index] : IDLE_SCALE})`;
    });

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const lite = document.documentElement.classList.contains("performance-lite");
    if (!on || reduced || lite || animationsDisabled()) {
      rest();
      return undefined;
    }

    let raf = 0;
    let start = 0;
    // A 300ms CSS transition would smear a ~28fps envelope into mush, so the
    // bars are written directly while beating and handed back to the class
    // transition when they stop.
    bars.forEach((el) => { el.style.transition = "none"; });

    const tick = (now) => {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      for (let index = 0; index < bars.length; index += 1) {
        bars[index].style.transform = `scaleY(${rhythmScale(elapsed, index).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const play = () => { if (!raf) { start = 0; raf = requestAnimationFrame(tick); } };
    const onVisibility = () => (document.hidden ? stop() : play());

    document.addEventListener("visibilitychange", onVisibility);
    play();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      rest();
    };
  }, [on, prefsVersion]);

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
      className={`sound-toggle flex h-9 items-center gap-2 border border-foreground/30 bg-background px-2.5 sm:px-3 tech-label text-foreground hover:bg-foreground hover:text-background transition-colors ${className}`}
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {BAR_SCALES.map((scale, index) => (
          <span
            key={index}
            ref={(el) => { barsRef.current[index] = el; }}
            className="block h-[10px] w-[2px] origin-bottom bg-current transition-transform duration-300 [transition-timing-function:cubic-bezier(.16,1,.3,1)]"
            style={{ transform: `scaleY(${on ? scale : IDLE_SCALE})` }}
          />
        ))}
      </span>
      <span className="block w-[52px] tabular-nums" aria-live="polite">
        {on ? "SND 01" : "SND 00"}
      </span>
    </button>
  );
}