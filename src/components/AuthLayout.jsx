import React from "react";
import { motion } from "framer-motion";
import { Plus } from "lucide-react";

/**
 * Editorial auth shell: oversized background numeral, thin technical frame,
 * crosshair decorations, and a glass content card. Preserves the same
 * { logo, title, subtitle, footer, children } contract used by all auth pages.
 */
export default function AuthLayout({ icon: Icon, title, subtitle, footer, logo, children }) {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bone text-foreground">
      <div className="grid-bg absolute inset-0 opacity-60" />

      {/* oversized background word */}
      <span className="pointer-events-none absolute -bottom-6 -right-4 select-none font-display font-thin tracking-ultra text-foreground/5 text-[22vw] leading-none">
        MABIS
      </span>

      {/* frame + crosshairs */}
      <div className="pointer-events-none absolute inset-4 sm:inset-6 border border-foreground/15" />
      <Plus className="absolute top-4 left-4 sm:top-6 sm:left-6 h-3 w-3 text-foreground/30" />
      <Plus className="absolute top-4 right-4 sm:top-6 sm:right-6 h-3 w-3 text-foreground/30" />
      <Plus className="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 h-3 w-3 text-foreground/30" />
      <Plus className="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 h-3 w-3 text-foreground/30" />

      {/* top meta row */}
      <div className="absolute top-6 sm:top-9 left-0 right-0 flex items-center justify-between px-8 sm:px-14">
        <span className="tech-label text-muted-foreground">／ AUTH</span>
        <span className="tech-label text-muted-foreground">N° 00</span>
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-5 py-20">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          <div className="mb-10">
            <div className="tech-label text-primary mb-4">／ IDENTITY</div>
            {logo ? (
              <div className="mb-6 inline-flex h-16 w-16 items-center justify-center border border-foreground/20 bg-card overflow-hidden">
                {logo}
              </div>
            ) : (
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center bg-primary">
                <Icon className="h-7 w-7 text-primary-foreground" aria-hidden="true" />
              </div>
            )}
            <h1 className="font-display font-light tracking-ultra text-4xl sm:text-5xl">
              {title}
            </h1>
            {subtitle && <p className="mt-3 text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          <div className="border border-foreground/15 bg-card/80 p-7 backdrop-blur-sm">
            {children}
          </div>

          {footer && (
            <p className="mt-6 text-center text-xs tech-label text-muted-foreground">{footer}</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}