import { useEffect, useState } from "react";
import { MotionGlobalConfig } from "@motion-global-config";
import { animationsDisabled, applyAnimationPreference, MOTION_EVENT } from "@/lib/motion-preference";
import { applyLowPowerMode, detectLowPowerDevice, monitorFrameBudget } from "@/lib/performance-tier";
import { networkState, NETWORK_EVENT } from "@/lib/network-policy";

/* Keep only Motion's tiny global skip switch in the universal path. Individual
   feature chunks still bring their own motion components when they are opened. */
if (typeof window !== "undefined") {
  MotionGlobalConfig.skipAnimations = animationsDisabled()
    || detectLowPowerDevice()
    || networkState().constrained;
}

export default function MotionPreference({ children }) {
  const [disabled, setDisabled] = useState(animationsDisabled);
  const [lowPower, setLowPower] = useState(detectLowPowerDevice);
  const [networkLite, setNetworkLite] = useState(() => networkState().constrained);
  const effectiveDisabled = disabled || lowPower || networkLite;

  useEffect(() => {
    applyLowPowerMode(lowPower);
  }, [lowPower]);

  useEffect(() => monitorFrameBudget(() => setLowPower(true)), []);

  useEffect(() => {
    const update = (event) => setNetworkLite(Boolean(event.detail?.constrained));
    window.addEventListener(NETWORK_EVENT, update);
    return () => window.removeEventListener(NETWORK_EVENT, update);
  }, []);

  useEffect(() => {
    MotionGlobalConfig.skipAnimations = effectiveDisabled;
    applyAnimationPreference(disabled);
    const update = (event) => setDisabled(Boolean(event.detail));
    window.addEventListener(MOTION_EVENT, update);
    return () => window.removeEventListener(MOTION_EVENT, update);
  }, [disabled, effectiveDisabled]);

  return children;
}
