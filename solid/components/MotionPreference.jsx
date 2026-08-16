import { createSignal, createEffect, onMount, onCleanup } from "solid-js";
import { animationsDisabled, applyAnimationPreference, MOTION_EVENT } from "@/lib/motion-preference";
import { applyLowPowerMode, detectLowPowerDevice, monitorFrameBudget } from "@/lib/performance-tier";

/*
 * Motion preference — port of src/components/MotionPreference.jsx.
 *
 * React wrapped its children in framer's <MotionConfig> and toggled
 * MotionGlobalConfig.skipAnimations. Neither exists here, and neither is
 * needed: this port has no JS animation runtime at all. Every animation is a
 * CSS keyframe or transition, and solid-motion.css switches the whole lot off
 * under `html.animations-disabled` — the class that applyAnimationPreference
 * writes. So the preference is enforced by the same call, one layer lower.
 *
 * The OS-level reduced-motion preference that MotionConfig honoured is picked
 * up directly by the prefers-reduced-motion media queries in the stylesheets.
 */
export default function MotionPreference(props) {
  const [disabled, setDisabled] = createSignal(animationsDisabled());
  const [lowPower, setLowPower] = createSignal(detectLowPowerDevice());

  createEffect(() => applyLowPowerMode(lowPower()));

  onMount(() => {
    const stop = monitorFrameBudget(() => setLowPower(true));
    onCleanup(() => stop?.());
  });

  // A performance tier may simplify expensive glass/cursor work, but it must
  // never override the user's animation setting.
  createEffect(() => applyAnimationPreference(disabled()));

  onMount(() => {
    const update = (event) => setDisabled(event.detail);
    window.addEventListener(MOTION_EVENT, update);
    onCleanup(() => window.removeEventListener(MOTION_EVENT, update));
  });

  return <>{props.children}</>;
}
