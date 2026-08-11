import React, { motion } from "react";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

/** Editorial loader: framed mark + sweeping scan line + tiny status label. */
export default function LoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-bone">
      <div className="grid-bg absolute inset-0 opacity-50" />
      <div className="relative z-10 flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="mb-8 flex h-20 w-20 items-center justify-center border border-foreground/20 bg-card overflow-hidden"
        >
          <img src={LOGO} alt="MABIS" className="h-14 w-14 object-contain" />
        </motion.div>

        {/* scan line */}
        <div className="relative mb-6 h-px w-40 overflow-hidden bg-foreground/15">
          <motion.div
            className="absolute inset-y-0 left-0 w-1/3 bg-primary"
            animate={{ x: ["-100%", "300%"] }}
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="tech-label text-muted-foreground"
        >
          ／ LOADING
        </motion.p>
      </div>
    </div>
  );
}