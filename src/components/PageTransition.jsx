import React, { useEffect } from "react";
import { playTransition } from "@/lib/sound";

/**
 * Route entry choreography implemented with CSS so the universal bundle does
 * not need the full animation runtime. Lite/reduced-motion modes already stop
 * these keyframes through the shared root classes.
 */
export default function PageTransition({ children }) {
  useEffect(() => { playTransition(); }, []);

  return (
    <div className="route-transition relative">
      <div className="route-transition-curtain fixed inset-0 z-[80] overflow-hidden bg-ink text-bone pointer-events-none" aria-hidden>
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute top-6 left-6 tech-label text-bone/40"> TRANSIT</div>
        <div className="absolute bottom-6 right-6 tech-label text-bone/40">MABIS 2026</div>
      </div>
      <div className="route-transition-content">{children}</div>
    </div>
  );
}
