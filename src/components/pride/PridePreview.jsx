import { motion } from "framer-motion";

/** A live miniature of a palette's own lighting geometry — not a swatch row. */
export default function PridePreview({ spec, active }) {
  return (
    <div
      className="relative h-10 w-full overflow-hidden"
      style={{ background: spec.mode === "dark" ? "#101012" : "#fbfbfa" }}
    >
      {spec.field.map((f, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${f.x}%`, top: `${f.y}%`,
            width: `${f.r}%`, height: `${f.r * 2.4}%`,
            marginLeft: `-${f.r / 2}%`, marginTop: `-${f.r * 1.2}%`,
            background: `radial-gradient(circle, ${spec.flag[f.c]} 0%, transparent 70%)`,
            filter: "blur(6px)",
          }}
          animate={{
            x: [0, `${f.d * 2}%`, 0],
            opacity: (active ? f.a * 3.4 : f.a * 2.4),
          }}
          transition={{ x: { duration: f.s / 5, repeat: Infinity, ease: "easeInOut" }, opacity: { duration: 0.4 } }}
        />
      ))}
      <div className="absolute inset-x-0 bottom-0 flex h-[3px]">
        {spec.flag.map((c, i) => (
          <div key={i} className="flex-1" style={{ background: c, opacity: active ? 1 : 0.55 }} />
        ))}
      </div>
    </div>
  );
}