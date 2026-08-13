import { useEffect, useState } from "react";
import { MotionConfig, MotionGlobalConfig } from "framer-motion";
import { animationsDisabled, applyAnimationPreference, MOTION_EVENT } from "@/lib/motion-preference";
import { applyLowPowerMode, detectLowPowerDevice, monitorFrameBudget } from "@/lib/performance-tier";

/* Motion off = everything simply exists: framer skips every animation
   (including ones with their own explicit transition, like the section
   reveals), and CSS keyframes/transitions are stopped alongside it. */
if (typeof window !== "undefined") {
  MotionGlobalConfig.skipAnimations = animationsDisabled();
}

export default function MotionPreference({ children }) {
  const [disabled, setDisabled] = useState(animationsDisabled);
  const [lowPower, setLowPower] = useState(detectLowPowerDevice);
  const effectiveDisabled = disabled || lowPower;

  useEffect(() => {
    applyLowPowerMode(lowPower);
  }, [lowPower]);

  useEffect(() => monitorFrameBudget(() => setLowPower(true)), []);

  useEffect(() => {
    MotionGlobalConfig.skipAnimations = effectiveDisabled;
    applyAnimationPreference(disabled);
    const update = (event) => setDisabled(event.detail);
    window.addEventListener(MOTION_EVENT, update);
    return () => window.removeEventListener(MOTION_EVENT, update);
  }, [disabled, effectiveDisabled]);

  return (
    <MotionConfig
      key={effectiveDisabled ? "static" : "motion"}
      reducedMotion={effectiveDisabled ? "always" : "user"}
      transition={effectiveDisabled ? { duration: 0, delay: 0 } : undefined}
    >
      {children}
    </MotionConfig>
  );
}