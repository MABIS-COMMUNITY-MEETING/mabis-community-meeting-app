import React from "react";
import { motion, useScroll, useTransform } from "framer-motion";

/**
 * Quiet typographic interlude. The band moves slowly with page progress instead
 * of splitting into RGB ghost layers, so it reads as editorial punctuation.
 */
function Sequence({ items }) {
  return (
    <span className="inline-flex items-center select-none">
      {items.map((item, index) => (
        <React.Fragment key={`${item}-${index}`}>
          {index > 0 && (
            <span aria-hidden className="mx-[0.42em] inline-flex h-[0.72em] w-[0.72em] items-center justify-center shrink-0">
              <span className="block h-px w-full rotate-[-48deg] bg-current opacity-70" />
            </span>
          )}
          <span>{item}</span>
        </React.Fragment>
      ))}
    </span>
  );
}

export default function ScrollVelocity({ items = [], className = "" }) {
  const { scrollYProgress } = useScroll();
  const x = useTransform(scrollYProgress, [0, 1], ["1%", "-10%"]);
  const sequence = items.length > 0 ? items : ["MABIS", "COMMUNITY", "FRIDAY", "BANGKOK"];

  return (
    <div className={`relative overflow-hidden whitespace-nowrap ${className}`}>
      <motion.div style={{ x }} className="inline-flex items-center will-change-transform">
        <Sequence items={sequence} />
        <span aria-hidden className="ml-[0.84em] inline-flex items-center">
          <span className="mr-[0.42em] inline-flex h-[0.72em] w-[0.72em] items-center justify-center shrink-0">
            <span className="block h-px w-full rotate-[-48deg] bg-current opacity-70" />
          </span>
          <Sequence items={sequence} />
        </span>
      </motion.div>
    </div>
  );
}
