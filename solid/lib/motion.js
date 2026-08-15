import { createSignal, onCleanup } from "solid-js";
import { japaneseTextEnabled, JAPANESE_TEXT_EVENT } from "@/lib/japanese-text-preference";

/**
 * Framer-motion spring params → this app's physics kernel.
 *
 * lib/physics/math.js solves x'' + 2ζω x' + ω²x = 0 analytically, so it needs
 * (ω, ζ) where framer-motion is configured with (stiffness, damping, mass):
 *
 *   ω = √(k/m)              natural frequency
 *   ζ = c / (2√(k·m))       damping ratio
 *
 * Converting rather than eyeballing is what makes the ported motion identical
 * instead of merely similar. Two conversions are used in the Splash port:
 *
 *   hero parallax   k=50,  c=20, m=1    → ω=7.071,  ζ=1.414  (overdamped)
 *   magnetic button k=200, c=15, m=0.2  → ω=31.623, ζ=1.186  (overdamped)
 *
 * Both are overdamped, which is why the original never overshoots — a detail
 * a hand-tuned lerp would have lost.
 */
export function springFromFramer(stiffness, damping, mass = 1) {
  return {
    omega: Math.sqrt(stiffness / mass),
    zeta: damping / (2 * Math.sqrt(stiffness * mass)),
  };
}

/** Solid equivalent of the React useJapaneseText() hook. */
export function useJapaneseText() {
  const [enabled, setEnabled] = createSignal(japaneseTextEnabled());
  const sync = () => setEnabled(japaneseTextEnabled());

  window.addEventListener(JAPANESE_TEXT_EVENT, sync);
  window.addEventListener("storage", sync);
  onCleanup(() => {
    window.removeEventListener(JAPANESE_TEXT_EVENT, sync);
    window.removeEventListener("storage", sync);
  });

  return enabled;
}

/** True when the device wants full motion — mirrors the React guards. */
export function finePointer() {
  return typeof window !== "undefined"
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
