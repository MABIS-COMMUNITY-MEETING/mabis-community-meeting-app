import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  getLoadingState,
  getServerLoadingState,
  subscribeToLoadingState,
} from "@/lib/loading-state";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";
const clampProgress = (value) => Math.max(0, Math.min(100, Number(value) || 0));

/**
 * Numeric loader. The selected UI font is captured for its full lifetime.
 * Progress comes from real route/module/data preparation; the visual counter
 * follows those milestones on one requestAnimationFrame loop without delaying
 * the route or asking React/Framer to reconcile every intermediate frame.
 */
export default function LoadingScreen() {
  const loading = useSyncExternalStore(
    subscribeToLoadingState,
    getLoadingState,
    getServerLoadingState,
  );
  const [loadingFont] = useState(() => {
    if (typeof document === "undefined") return "'GNUFreeMonoUI'";
    return getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'";
  });

  const progress = clampProgress(loading.progress);
  const visualProgressRef = useRef(progress);
  const numberRef = useRef(null);
  const barRef = useRef(null);

  useEffect(() => {
    const root = document.documentElement;
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
      || root.classList.contains("animations-disabled")
      || root.classList.contains("performance-lite");
    const target = progress;
    let frame = 0;
    let previousTime = performance.now();

    const paint = (value) => {
      const rounded = Math.round(value);
      if (numberRef.current && numberRef.current.dataset.value !== String(rounded)) {
        numberRef.current.dataset.value = String(rounded);
        numberRef.current.textContent = String(rounded).padStart(3, "0");
      }
      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${Math.max(0.0001, value / 100)})`;
      }
    };

    if (reduceMotion) {
      visualProgressRef.current = target;
      paint(target);
      return undefined;
    }

    paint(visualProgressRef.current);
    const step = (now) => {
      const elapsed = Math.min(48, Math.max(0, now - previousTime));
      previousTime = now;
      const blend = 1 - Math.exp(-elapsed / 72);
      let next = visualProgressRef.current + (target - visualProgressRef.current) * blend;
      if (Math.abs(target - next) < 0.025) next = target;
      visualProgressRef.current = next;
      paint(next);
      if (next !== target) frame = window.requestAnimationFrame(step);
    };

    if (visualProgressRef.current !== target) {
      frame = window.requestAnimationFrame(step);
    }
    return () => window.cancelAnimationFrame(frame);
  }, [progress]);

  const initialNumber = String(Math.round(visualProgressRef.current)).padStart(3, "0");
  const initialScale = Math.max(0.0001, visualProgressRef.current / 100);

  return (
    <div
      className="loading-screen fixed inset-0 overflow-hidden bg-ink text-bone"
      style={{ "--loading-font": loadingFont }}
      aria-busy="true"
    >
      <div className="loading-grid absolute inset-0 grid-bg" aria-hidden />
      <div className="loading-glow-shell" aria-hidden>
        <div className="loading-glow" />
      </div>
      <div className="loading-frame pointer-events-none corner-bracket" aria-hidden />

      <div className="loading-meta tech-label text-bone/50" aria-hidden>
        <span>INITIALISING</span>
        <span>MABIS 2026</span>
      </div>

      <div className="loading-center relative z-10 flex flex-col items-center justify-center">
        <span className="loading-wordmark font-display font-normal tracking-ultra text-bone/8 leading-none select-none" aria-hidden>
          COMMUNITY
        </span>

        <div className="loading-counter relative flex items-baseline" aria-hidden>
          <span
            ref={numberRef}
            data-value={Math.round(visualProgressRef.current)}
            className="loading-counter-number font-display font-normal tracking-ultra leading-none tabular-nums"
          >
            {initialNumber}
          </span>
          <span className="ml-2 tech-label text-primary">％</span>
        </div>

        <div
          className="loading-progress-track relative mt-6 h-px overflow-hidden bg-bone/15"
          role="progressbar"
          aria-label="Loading application"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress)}
        >
          <span
            ref={barRef}
            className="loading-progress loading-progress-fill absolute inset-y-0 left-0 w-full origin-left bg-primary"
            style={{ transform: `scaleX(${initialScale})` }}
          />
        </div>

        <div
          className="loading-status mt-5 flex items-center gap-3 tech-label text-bone/45"
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          <span className="loading-spinner inline-block h-2.5 w-2.5 shrink-0 border border-bone/40 border-t-primary" aria-hidden />
          <span className="flex min-w-0 flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
            <span className="text-bone/70">CACHING STUFF</span>
            <span className="min-w-0 tabular-nums">{loading.detail}</span>
          </span>
        </div>
      </div>

      <div className="loading-footer tech-label text-bone/40">
        <img src={LOGO} alt="" decoding="async" fetchPriority="low" className="inline-block h-5 w-5 object-contain opacity-70" />
        <span>SECONDARY COMMUNITY MEETING</span>
      </div>
    </div>
  );
}