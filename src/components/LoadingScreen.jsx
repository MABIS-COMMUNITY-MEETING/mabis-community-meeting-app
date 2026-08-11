import React from "react";
import { motion } from "framer-motion";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";
const DOTS = Array.from({ length: 8 });

export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-white">
      <div className="relative z-10 flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 14 }}
          className="mb-8"
        >
          <div className="w-24 h-24 rounded-3xl bg-white shadow-xl ring-1 ring-gray-100 overflow-hidden flex items-center justify-center">
            <img src={LOGO} alt="MABIS" className="w-20 h-20 object-contain" />
          </div>
        </motion.div>

        {/* Spinner dots — maroon to match brand */}
        <div className="relative w-12 h-12">
          {DOTS.map((_, i) => {
            const angle = (i / DOTS.length) * Math.PI * 2;
            const x = Math.cos(angle) * 18;
            const y = Math.sin(angle) * 18;
            return (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{ left: "50%", top: "50%", width: 8, height: 8, marginLeft: -4, marginTop: -4, x, y, background: "#951E3A" }}
                animate={{ opacity: [0.15, 1, 0.15], scale: [0.55, 1, 0.55] }}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut", delay: (i / DOTS.length) * 1.2 }}
              />
            );
          })}
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="mt-6 text-gray-400 text-[11px] font-semibold tracking-[0.28em] uppercase"
        >
          Loading
        </motion.p>
      </div>
    </div>
  );
}