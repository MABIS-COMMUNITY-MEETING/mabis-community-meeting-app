import { motion } from "framer-motion";

/**
 * Staggered word/character reveal with a masked slide-up.
 * `text` — the string to reveal.
 * `mode` — "word" (default) or "char".
 * `delay`, `stagger`, `duration` — timing controls.
 * `as` — element tag (defaults to span).
 * `className` — applied to the wrapping element.
 */
export default function RevealText({
  text = "",
  mode = "word",
  delay = 0,
  stagger = 0.06,
  duration = 0.6,
  as: Tag = "span",
  className = "",
}) {
  const tokens = mode === "char" ? Array.from(text) : text.split(/(\s+)/);
  const container = {
    hidden: {},
    show: { transition: { staggerChildren: stagger, delayChildren: delay } },
  };
  const child = {
    hidden: { y: "110%", opacity: 0 },
    show: { y: "0%", opacity: 1, transition: { duration, ease: [0.16, 1, 0.3, 1] } },
  };
  return (
    <motion.span
      className={`reveal-mask ${className}`}
      variants={container}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-8% 0px" }}
      style={{ display: "inline-block" }}
    >
      {tokens.map((tok, i) => (
        <span key={i} style={{ display: "inline-block", overflow: "hidden", verticalAlign: "top" }}>
          <motion.span style={{ display: "inline-block" }} variants={child}>
            {tok === " " ? "\u00A0" : tok}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}