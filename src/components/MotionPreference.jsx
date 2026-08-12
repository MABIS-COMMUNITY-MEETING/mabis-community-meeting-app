import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { animationsDisabled, applyAnimationPreference, MOTION_EVENT } from "@/lib/motion-preference";

/* When motion is off we force every framer animation to zero duration (so
   reveals, page transitions and staggers land instantly) on top of the CSS
   rules that stop keyframes and transitions. */
export default function MotionPreference({ children }) {
  const [disabled, setDisabled] = useState(animationsDisabled);

  useEffect(() => {
    applyAnimationPreference(disabled);
    const update = (event) => setDisabled(event.detail);
    window.addEventListener(MOTION_EVENT, update);
    return () => window.removeEventListener(MOTION_EVENT, update);
  }, [disabled]);

  return (
    <MotionConfig
      key={disabled ? "static" : "motion"}
      reducedMotion={disabled ? "always" : "user"}
      transition={disabled ? { duration: 0, delay: 0 } : undefined}
    >
      {children}
    </MotionConfig>
  );
}