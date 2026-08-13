import { useEffect, useRef, useState } from "react";
import { networkState } from "@/lib/network-policy";

const LOGO = "/images/mabis-logo-128.webp";

/** Numeric loader with direct DOM writes and CSS-only decorative motion. */
export default function LoadingScreen() {
  const [done, setDone] = useState(false);
  const [loadingFont] = useState(() => {
    if (typeof document === "undefined") return "'GNUFreeMonoUI'";
    return getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'";
  });
  const raf = useRef();
  const countRef = useRef(null);
  const wordmarkRef = useRef(null);
  const lineRef = useRef(null);
  const statusRef = useRef(null);

  useEffect(() => {
    const start = performance.now();
    const dur = networkState().constrained ? 320 : 1100;
    let previous = -1;
    const tick = (time) => {
      const progress = Math.min((time - start) / dur, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const number = Math.round(eased * 100);
      if (number !== previous) {
        previous = number;
        if (countRef.current) countRef.current.textContent = String(number).padStart(3, "0");
        if (wordmarkRef.current) wordmarkRef.current.style.clipPath = `inset(0 ${(100 - number) * 0.6}% 0 0)`;
        if (lineRef.current) lineRef.current.style.transform = `scaleX(${number / 100})`;
        if (statusRef.current) statusRef.current.textContent = `LOADING ASSETS ${number}%`;
      }
      if (progress < 1) raf.current = requestAnimationFrame(tick);
      else setDone(true);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, []);

  return (
    <div className="loading-screen fixed inset-0 overflow-hidden bg-ink text-bone" style={{ "--loading-font": loadingFont }}>
      <div className="loading-grid absolute inset-0 grid-bg opacity-40" />
      <div
        className="absolute left-1/2 top-1/2 h-[60vw] w-[60vw] max-w-[600px] max-h-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl blob-drift"
        style={{ background: "radial-gradient(circle, hsl(var(--primary)/0.28) 0%, transparent 62%)" }}
      />

      <div className="pointer-events-none absolute inset-5 sm:inset-8 corner-bracket" />
      <div className="absolute top-6 left-6 sm:top-8 sm:left-8 tech-label text-bone/50"> INITIALISING</div>
      <div className="absolute top-6 right-6 sm:top-8 sm:right-8 tech-label text-bone/50">MABIS 2026</div>

      <div className="relative z-10 flex h-full flex-col items-center justify-center">
        <div className={`loading-count flex items-baseline ${done ? "is-done" : ""}`}>
          <span ref={countRef} className="font-display font-normal tracking-ultra text-[22vw] sm:text-[16vw] leading-none tabular-nums">000</span>
          <span className="ml-2 tech-label text-primary">％</span>
        </div>

        <span
          ref={wordmarkRef}
          style={{ clipPath: "inset(0 100% 0 0)" }}
          className="absolute font-display font-normal tracking-ultra text-bone/8 text-[18vw] leading-none select-none"
        >
          COMMUNITY
        </span>

        <div className="relative mt-6 h-px w-56 overflow-hidden bg-bone/15">
          <div ref={lineRef} className="absolute inset-y-0 left-0 w-full origin-left bg-primary" style={{ transform: "scaleX(0)" }} />
        </div>

        <div className="loading-status mt-5 flex items-center gap-3 tech-label text-bone/45">
          <span className="loading-spinner inline-block h-2.5 w-2.5 border border-bone/40 border-t-primary" />
          <span ref={statusRef}>LOADING ASSETS 0%</span>
        </div>
      </div>

      <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8 tech-label text-bone/40">
        <img src={LOGO} alt="" width="20" height="20" decoding="async" fetchPriority="high" className="h-5 w-5 object-contain opacity-70 inline-block mr-2 align-middle" />
        SECONDARY COMMUNITY MEETING
      </div>
    </div>
  );
}
