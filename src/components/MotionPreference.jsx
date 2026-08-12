import { useEffect, useState } from "react";
import { MotionConfig } from "framer-motion";
import { animationsDisabled, applyAnimationPreference, MOTION_EVENT } from "@/lib/motion-preference";

export default function MotionPreference({ children }) {
  const [disabled, setDisabled] = useState(animationsDisabled);

  useEffect(() => {
    applyAnimationPreference(disabled);
    const update = (event) => setDisabled(event.detail);
    window.addEventListener(MOTION_EVENT, update);
    return () => window.removeEventListener(MOTION_EVENT, update);
  }, [disabled]);

  return <MotionConfig reducedMotion={disabled ? "always" : "user"}>{children}</MotionConfig>;
}