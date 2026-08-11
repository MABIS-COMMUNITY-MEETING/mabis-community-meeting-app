import React from "react";

/**
 * Shader-adjacent background built from layered CSS gradients, slow-drifting
 * blurred blobs, a rotating conic ring, and the global grid — an elegant
 * "light field" behind hero / cinematic moments. Pure CSS, GPU-friendly.
 */
export default function KineticBackground({ variant = "ink", className = "" }) {
  const onInk = variant === "ink";
  return (
    <div className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`} aria-hidden>
      <div className="absolute inset-0 grid-bg opacity-40" />

      {/* primary drifting glow */}
      <div
        className="absolute left-1/2 top-1/2 h-[72vw] w-[72vw] max-w-[780px] max-h-[780px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl blob-drift"
        style={{ background: `radial-gradient(circle, hsl(var(--primary)/0.34) 0%, transparent 62%)` }}
      />
      {/* secondary glow */}
      <div
        className="absolute right-[6%] bottom-[4%] h-[42vw] w-[42vw] max-w-[440px] max-h-[440px] rounded-full blur-3xl blob-drift-2"
        style={{ background: `radial-gradient(circle, hsl(var(--secondary)/0.22) 0%, transparent 60%)` }}
      />
      {/* slow rotating conic ring */}
      <div
        className="absolute left-1/2 top-1/2 h-[130vw] w-[130vw] -translate-x-1/2 -translate-y-1/2 spin-slow opacity-[0.06]"
        style={{
          background: `conic-gradient(from 0deg, transparent, hsl(var(--primary)), transparent 38%, hsl(var(--secondary)), transparent 76%)`,
          borderRadius: "999px",
        }}
      />
      {/* faint vignette to seat the type */}
      <div
        className="absolute inset-0"
        style={{ background: onInk
          ? "radial-gradient(120% 80% at 50% 40%, transparent 40%, hsl(var(--ink)/0.55) 100%)"
          : "radial-gradient(120% 80% at 50% 40%, transparent 45%, hsl(var(--background)/0.4) 100%)" }}
      />
    </div>
  );
}