import { useEffect, useState } from "react";
import { motion } from "framer-motion";
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
  const [energy, setEnergy] = useState(0);

  useEffect(() => {
    const sync = () => setTheme(PRIDE_THEMES[getStoredTheme()] || null);
    window.addEventListener("themeChanged", sync);
    return () => window.removeEventListener("themeChanged", sync);
  }, []);

  useEffect(() => {
    if (!theme) return;
    let t;
    const pulse = () => {
      setEnergy(1);
      clearTimeout(t);
      t = setTimeout(() => setEnergy(0), 900);
    };
    window.addEventListener("pointerdown", pulse);
    return () => { window.removeEventListener("pointerdown", pulse); clearTimeout(t); };
  }, [theme]);

  if (!theme) return null;
  const spec = theme.pride;

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
      {spec.field.map((f, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${f.x}%`,
            top: `${f.y}%`,
            width: `${f.r}vmax`,
            height: `${f.r}vmax`,
            marginLeft: `-${f.r / 2}vmax`,
            marginTop: `-${f.r / 2}vmax`,
            background: `radial-gradient(circle, ${spec.flag[f.c]} 0%, transparent 68%)`,
            filter: "blur(24px)",
          }}
          animate={{
            x: [0, `${f.d}%`, `-${f.d * 0.6}%`, 0],
            y: [0, `-${f.d * 0.8}%`, `${f.d * 0.5}%`, 0],
            opacity: f.a * (1 + energy * 0.45),
          }}
          transition={{
            x: { duration: f.s, repeat: Infinity, ease: "easeInOut" },
            y: { duration: f.s * 1.31, repeat: Infinity, ease: "easeInOut" },
            opacity: { duration: energy ? 0.35 : 1.2, ease: "easeOut" },
          }}
        />
      ))}

      {/* Intersex: orbital geometry, referencing the flag's language without drawing it */}
      {spec.ring && (
        <motion.div
          className="absolute left-1/2 top-1/2 rounded-full"
          style={{
            width: "58vmax", height: "58vmax", marginLeft: "-29vmax", marginTop: "-29vmax",
            border: `1px solid ${spec.flag[1]}`, opacity: 0.22,
          }}
          animate={{ scale: [1, 1.035, 1], rotate: [0, 360] }}
          transition={{ scale: { duration: 26, repeat: Infinity, ease: "easeInOut" }, rotate: { duration: 260, repeat: Infinity, ease: "linear" } }}
        />
      )}

      {/* Progress: directional chevron light, layered and masked rather than flagged */}
      {spec.chevron && (
        <motion.div
          className="absolute inset-y-0 left-0 w-[46vmax]"
          style={{
            background: `linear-gradient(105deg, ${spec.flag[5]}22 0%, ${spec.flag[1]}18 42%, transparent 72%)`,
            clipPath: "polygon(0 0, 62% 0, 100% 50%, 62% 100%, 0 100%, 34% 50%)",
          }}
          animate={{ x: ["-6%", "2%", "-6%"], opacity: [0.5, 0.75, 0.5] }}
          transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
}