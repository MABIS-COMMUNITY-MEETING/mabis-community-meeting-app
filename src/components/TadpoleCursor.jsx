import { useEffect, useRef } from "react";
import { subscribe } from "@/lib/physics/scheduler";
import { pointer } from "@/lib/physics/pointer";
import Tadpole from "@/lib/tadpole/simulation";
import { outlinePath } from "@/lib/tadpole/geometry";

/**
 * Renders the simulated organism. The geometry is generated from the physical
 * centreline r(s) ± w(s)n̂(s) every frame — nothing here decides where the
 * animal is; the simulation does.
 */
export default function TadpoleCursor() {
  const bodyRef = useRef(null);
  const finRef = useRef(null);
  const eyeRef = useRef(null);
  const dbgRef = useRef(null);

  useEffect(() => {
    const sim = new Tadpole();
    const debug = new URLSearchParams(window.location.search).get("tadpole") === "debug";
    const rod = sim.rod;
    const N = rod.N;
    const finW = new Float32Array(N);

    const step = (dt) => sim.step(dt);

    const render = () => {
      if (!sim.ready) return;
      const b = bodyRef.current, f = finRef.current;
      if (f) {
        for (let i = 0; i < N; i++) finW[i] = sim.finW[i];
        f.setAttribute("d", outlinePath(rod.x, rod.y, finW, sim.finOff));
        f.style.opacity = pointer.inside ? "0.30" : "0";
      }
      if (b) {
        b.setAttribute("d", outlinePath(rod.x, rod.y, sim.coreW, null));
        b.style.opacity = pointer.inside ? (pointer.down ? "0.72" : "1") : "0";
      }
      const e = eyeRef.current;
      if (e) {
        const th = rod.headTheta();
        const ex = rod.x[1] + Math.cos(th) * 2.2 - Math.sin(th) * 2.0;
        const ey = rod.y[1] + Math.sin(th) * 2.2 + Math.cos(th) * 2.0;
        e.setAttribute("cx", ex.toFixed(2));
        e.setAttribute("cy", ey.toFixed(2));
        e.style.opacity = pointer.inside ? "0.85" : "0";
      }
      if (debug && dbgRef.current && sim.stats) {
        dbgRef.current.textContent = Object.entries(sim.stats)
          .map(([k, v]) => `${k.padEnd(9)} ${v}`).join("\n");
      }
    };

    const unsubscribe = subscribe({ step, render, settled: () => false });
    return unsubscribe;
  }, []);

  return (
    <>
      <svg
        className="fixed inset-0 pointer-events-none tadpole-layer"
        style={{ zIndex: 9999, width: "100vw", height: "100vh", mixBlendMode: "difference" }}
        aria-hidden
      >
        <path ref={finRef} fill="#fff" style={{ opacity: 0 }} />
        <path ref={bodyRef} fill="#fff" style={{ opacity: 0 }} />
        <circle ref={eyeRef} r="0.9" fill="#000" style={{ opacity: 0 }} />
      </svg>
      {new URLSearchParams(window.location.search).get("tadpole") === "debug" && (
        <pre
          ref={dbgRef}
          className="fixed left-3 bottom-3 text-[10px] leading-[1.35] text-foreground/70 bg-background/80 border border-border p-2 pointer-events-none"
          style={{ zIndex: 10000, fontFamily: "Iosevka, monospace" }}
        />
      )}
    </>
  );
}