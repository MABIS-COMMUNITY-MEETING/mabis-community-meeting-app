import { useEffect, useRef } from "react";
import { subscribeScrollProgress } from "@/lib/scroll-progress";

/** Thin 2px scroll-progress bar pinned to the top of the viewport. */
export default function ScrollProgress() {
  const barRef = useRef(null);

  useEffect(() => subscribeScrollProgress((progress) => {
    if (barRef.current) barRef.current.style.transform = `scaleX(${progress})`;
  }), []);

  return (
    <div
      ref={barRef}
      style={{ transform: "scaleX(0)", backgroundImage: "var(--palette-gradient, none)" }}
      aria-hidden
      className="pointer-events-none fixed left-0 top-[3px] z-[60] h-[2px] w-full origin-left bg-primary will-change-transform"
    />
  );
}