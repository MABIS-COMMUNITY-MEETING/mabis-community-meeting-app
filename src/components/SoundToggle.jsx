import React, { useEffect, useState } from "react";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";

const BAR_SCALES = [0.5, 1, 0.72];

/**
 * Minimal persistent audio control. The level bars move only when state changes
 * so a visible toggle does not keep a perpetual animation running on phones.
 */
export default function SoundToggle({ className = "" }) {
  const [on, setOn] = useState(isSoundEnabled());

  useEffect(() => {
    const handleChange = (event) => setOn(!!event.detail);
    window.addEventListener("mabis-sound-changed", handleChange);
    return () => window.removeEventListener("mabis-sound-changed", handleChange);
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
      className={`sound-toggle flex h-9 items-center gap-2 border border-foreground/30 bg-background px-2.5 sm:px-3 tech-label text-foreground hover:bg-foreground hover:text-background transition-colors ${className}`}
    >
      <span className="flex h-3 items-end gap-[2px]" aria-hidden>
        {BAR_SCALES.map((scale, index) => (
          <span
            key={index}
            className="block h-[10px] w-[2px] origin-bottom bg-current transition-transform duration-300 [transition-timing-function:cubic-bezier(.16,1,.3,1)]"
            style={{ transform: `scaleY(${on ? scale : 0.2})` }}
          />
        ))}
      </span>
      <span className="block w-[52px] tabular-nums" aria-live="polite">
        {on ? "SND 01" : "SND 00"}
      </span>
    </button>
  );
}