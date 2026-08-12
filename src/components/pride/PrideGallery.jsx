import { useState } from "react";
import { motion } from "framer-motion";
import { PRIDE_SPECS, getPrideMode, setPrideMode } from "@/lib/pride";
import PridePreview from "./PridePreview";

/**
 * The Pride collection's selector — a numbered palette gallery, not a dropdown.
 * Every entry previews its own lighting field live, and each palette can be read
 * in either light or dark art direction: neither mode is an afterthought.
 */
export default function PrideGallery({ current, onSelect }) {
  const [mode, setMode] = useState(getPrideMode);
  const [hover, setHover] = useState(null);

  const chooseMode = (m) => { setMode(m); setPrideMode(m); if (PRIDE_SPECS.some(s => s.key === current)) onSelect(current); };

  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <span className="tech-label text-foreground/70">Pride Collection</span>
        <div className="flex border border-border">
          {["auto", "light", "dark"].map((m) => (
            <button key={m} onClick={() => chooseMode(m)}
              className={`px-2 py-[3px] text-[9px] uppercase tracking-[0.14em] transition-colors ${mode === m ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}>
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-[3px]">
        {PRIDE_SPECS.map((spec) => {
          const active = current === spec.key;
          return (
            <button
              key={spec.key}
              onClick={() => onSelect(spec.key)}
              onMouseEnter={() => setHover(spec.key)}
              onMouseLeave={() => setHover(null)}
              className="group relative w-full text-left border border-border/70 overflow-hidden"
              style={{ borderColor: active ? spec.accent : undefined }}
            >
              <div className="flex items-stretch">
                <div className="flex w-8 shrink-0 items-center justify-center border-r border-border/70">
                  <span className="text-[9px] tabular-nums tracking-[0.1em] text-muted-foreground">{spec.no}</span>
                </div>
                <div className="relative flex-1">
                  <PridePreview spec={spec} active={active || hover === spec.key} />
                  <div className="absolute inset-0 flex items-center justify-between px-2.5">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: spec.mode === "dark" ? "#fff" : "#131315" }}>
                      {spec.name}
                    </span>
                    {active && (
                      <span className="text-[8px] uppercase tracking-[0.18em]"
                        style={{ color: spec.accent }}>active</span>
                    )}
                  </div>
                </div>
              </div>
              <motion.div
                className="absolute bottom-0 left-0 h-[2px]"
                style={{ background: spec.accent }}
                initial={false}
                animate={{ width: active ? "100%" : hover === spec.key ? "38%" : "0%" }}
                transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              />
            </button>
          );
        })}
      </div>

      {hover && (
        <p className="mt-2 text-[9px] leading-relaxed text-muted-foreground">
          {PRIDE_SPECS.find((s) => s.key === hover)?.note}
        </p>
      )}
    </div>
  );
}