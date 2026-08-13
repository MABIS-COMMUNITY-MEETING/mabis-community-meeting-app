import { lazy, Suspense, useEffect, useState } from "react";
import { customCursorEnabled, CURSOR_EVENT } from "@/lib/cursor-preference";
import { lowPowerMode, PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";

const CustomCursor = lazy(() => import("@/components/CustomCursor"));

function cursorCanRun() {
  if (typeof window === "undefined") return false;
  return customCursorEnabled()
    && !lowPowerMode()
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Avoid downloading the cursor physics engine on touch and low-power devices. */
export default function OptionalCustomCursor() {
  const [enabled, setEnabled] = useState(cursorCanRun);

  useEffect(() => {
    const update = () => setEnabled(cursorCanRun());
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    window.addEventListener(CURSOR_EVENT, update);
    window.addEventListener(PERFORMANCE_TIER_EVENT, update);
    finePointer.addEventListener?.("change", update);
    reducedMotion.addEventListener?.("change", update);

    return () => {
      window.removeEventListener(CURSOR_EVENT, update);
      window.removeEventListener(PERFORMANCE_TIER_EVENT, update);
      finePointer.removeEventListener?.("change", update);
      reducedMotion.removeEventListener?.("change", update);
    };
  }, []);

  if (!enabled) return null;
  return <Suspense fallback={null}><CustomCursor /></Suspense>;
}
