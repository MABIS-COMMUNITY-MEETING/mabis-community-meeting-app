import { useEffect, useState } from "react";
import { PRIDE_THEMES } from "@/lib/pride";
import { getStoredTheme } from "@/lib/themes";

/**
 * The Pride collection's lighting layer.
 *
 * Each palette carries its own lighting geometry (see lib/pride.js): where the
 * coloured light sits, how far it drifts and how slowly. Motion is deliberately
 * near-subconscious — a minute-long cycle, never a moving gradient you notice.
 * On interaction the field briefly gains a little energy, then settles back to
 * restraint so the page is never permanently oversaturated.
 */
export default function PrideAmbience() {
  const [theme, setTheme] = useState(() => PRIDE_THEMES[getStoredTheme()] || null);

  useEffect(() => {
    const sync = () => setTheme(PRIDE_THEMES[getStoredTheme()] || null);
    window.addEventListener("themeChanged", sync);
    return () => window.removeEventListener("themeChanged", sync);
  }, []);

  if (!theme) return null;
  const spec = theme.pride;

  return (
    <div className="pride-ambience fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {spec.field.map((f, i) => (
        <div key={i} className="pride-field-x absolute" style={{
          left: `${f.x}%`, top: `${f.y}%`, width: `${f.r}vmax`, height: `${f.r}vmax`,
          marginLeft: `-${f.r / 2}vmax`, marginTop: `-${f.r / 2}vmax`,
          "--field-x-positive": `${f.d}%`, "--field-x-negative": `${-f.d * 0.6}%`,
          "--field-y-negative": `${-f.d * 0.8}%`, "--field-y-positive": `${f.d * 0.5}%`,
          "--field-speed": `${f.s}s`, "--field-y-speed": `${f.s * 1.31}s`,
        }}>
          <div className="pride-field-y h-full w-full">
            <div className="pride-field-light h-full w-full rounded-full" style={{
              "--field-alpha": f.a,
              background: `radial-gradient(circle, ${spec.flag[f.c]} 0%, transparent 68%)`,
            }} />
          </div>
        </div>
      ))}

      {spec.ring && <div className="pride-orbit absolute left-1/2 top-1/2 rounded-full" style={{
        width: "58vmax", height: "58vmax", marginLeft: "-29vmax", marginTop: "-29vmax",
        border: `1px solid ${spec.flag[1]}`, opacity: 0.22,
      }} />}

      {spec.chevron && <div className="pride-chevron absolute inset-y-0 left-0 w-[46vmax]" style={{
        background: `linear-gradient(105deg, ${spec.flag[5]}22 0%, ${spec.flag[1]}18 42%, transparent 72%)`,
        clipPath: "polygon(0 0, 62% 0, 100% 50%, 62% 100%, 0 100%, 34% 50%)",
      }} />}
    </div>
  );
}