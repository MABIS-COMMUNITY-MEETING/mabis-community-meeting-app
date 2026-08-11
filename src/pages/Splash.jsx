import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const MAROON = "#951E3A";
const GOLD = "#EACE54";

const DOTS = Array.from({ length: 216 }, (_, i) => ({
  id: i,
  left: Math.random() * 100,
  top: Math.random() * 100,
  size: 3 + Math.random() * 10,
  duration: 4 + Math.random() * 5,
  delay: Math.random() * 3,
  drift: 30 + Math.random() * 70,
  gold: Math.random() > 0.4,
}));

export default function Splash() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 200);
    const t2 = setTimeout(() => setPhase(2), 500);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, []);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ background: `linear-gradient(150deg, ${MAROON}, #6e1729)` }}>

      {DOTS.map(d => (
        <motion.div
          key={d.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            left: `${d.left}%`, top: `${d.top}%`,
            width: d.size, height: d.size,
            background: d.gold ? GOLD : "rgba(255,255,255,0.9)",
            boxShadow: d.gold ? `0 0 ${d.size * 1.8}px ${GOLD}88` : `0 0 ${d.size}px rgba(255,255,255,0.6)`,
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={{
            opacity: [0, 0.9, 0],
            scale: [0, 1, 0.5],
            y: [0, -d.drift],
            x: [0, (d.id % 2 ? 1 : -1) * d.drift * 0.4],
          }}
          transition={{ duration: d.duration, delay: d.delay, repeat: Infinity, ease: "easeOut" }}
        />
      ))}

      {/* Glow */}
      <motion.div
        className="absolute rounded-full pointer-events-none"
        style={{ width: 480, height: 480, background: "radial-gradient(circle, rgba(234,206,84,0.18) 0%, transparent 65%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative z-10 flex flex-col items-center text-center px-8 max-w-2xl w-full">
        {/* Logo — bouncy */}
        <motion.div
          initial={{ scale: 0, rotate: -30, opacity: 0 }}
          animate={{ scale: 1, rotate: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 260, damping: 12 }}
          className="mb-6"
        >
          <div
            className="w-32 h-32 rounded-3xl bg-white shadow-2xl overflow-hidden flex items-center justify-center"
            style={{ boxShadow: "0 16px 50px rgba(0,0,0,0.3), 0 0 40px rgba(234,206,84,0.4)" }}
          >
            <img src="https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png"
              alt="MABIS" className="w-28 h-28 object-contain rounded-3xl" />
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 16, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.4, type: "spring", stiffness: 200 }}
          className="font-display font-black text-white text-2xl sm:text-4xl md:text-5xl leading-tight mb-3 tracking-tight"
        >
          <span className="block whitespace-nowrap">SECONDARY COMMUNITY</span>
          <span className="block whitespace-nowrap">MEETING APP</span>
        </motion.h1>

        <motion.div
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ delay: 0.3, duration: 0.3, ease: "easeOut" }}
          className="w-20 h-[3px] rounded-full mb-6"
          style={{ background: GOLD }}
        />

        <AnimatePresence>
          {phase >= 2 && (
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.85 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 220, damping: 14 }}
              className="w-full flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.08, rotate: -1 }}
                whileTap={{ scale: 0.92 }}
                animate={{ boxShadow: ["0 0 0px rgba(234,206,84,0.4)", "0 0 25px rgba(234,206,84,0.7)", "0 0 0px rgba(234,206,84,0.4)"] }}
                transition={{ boxShadow: { duration: 2, repeat: Infinity } }}
                onClick={() => navigate(isAuthenticated ? "/home" : "/login")}
                className="flex items-center justify-center gap-3 font-display font-bold text-xl px-16 py-5 rounded-2xl"
                style={{ background: "#ffffff", color: MAROON, border: `4px solid ${GOLD}` }}
              >
                <span>{isAuthenticated ? "Start" : "Log in"}</span>
                <ArrowRight className="w-6 h-6" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}