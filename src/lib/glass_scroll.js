import { integrateSpring, clamp, tanhSat } from "@/lib/physics/math";
import { MATERIAL, SLEEP } from "@/lib/physics/tokens";
import { subscribe, wake } from "@/lib/physics/scheduler";

/*
 * Scroll-driven optical state for Liquid Glass.
 *
 * The existing scroll-progress module owns the app's single passive scroll
 * listener and forwards one position sample per display frame. This module
 * turns that sample into a bounded, critically damped material response.
 * It never owns or modifies scrolling, and it never animates backdrop-filter:
 * blur remains a stable compositor input while cached highlight, rim and
 * shadow layers react to wheel, trackpad, touch and momentum scroll streams.
 */

const energy = { x: 0, v: 0 };
const direction = { x: 0, v: 0 };

let targetEnergy = 0;
let targetDirection = 0;
let lastY = 0;
let lastSampleTime = 0;
let lastInputTime = 0;
let running = false;
let unsubscribe = null;
let reducedMotion = null;

const DEFAULTS = {
  shift: "0px",
  shadow: "0.12",
  specular: "0.82",
  rim: "0.70",
  edge: "0.52",
  tint: "0.10",
};

function materialMotionDisabled() {
  const root = document.documentElement;
  return root.classList.contains("animations-disabled")
    || root.classList.contains("performance-lite")
    || reducedMotion?.matches;
}

function writeDefaults() {
  const root = document.documentElement;
  root.style.setProperty("--glass-scroll-shift", DEFAULTS.shift);
  root.style.setProperty("--glass-scroll-shadow-opacity", DEFAULTS.shadow);
  root.style.setProperty("--glass-scroll-spec-opacity", DEFAULTS.specular);
  root.style.setProperty("--glass-scroll-rim-opacity", DEFAULTS.rim);
  root.style.setProperty("--glass-scroll-edge-opacity", DEFAULTS.edge);
  root.style.setProperty("--glass-scroll-tint-alpha", DEFAULTS.tint);
}

function sampleFrame(now) {
  if (materialMotionDisabled()) {
    targetEnergy = 0;
    targetDirection = 0;
    return;
  }

  // A real momentum stream continues producing scroll samples. Once samples
  // stop, release toward rest; this avoids timer-based "scroll ended" guesses.
  if (lastInputTime && now - lastInputTime > 72) {
    targetEnergy = 0;
    targetDirection = 0;
  }
}

function step(dt) {
  integrateSpring(energy, targetEnergy, MATERIAL.optics.omega, MATERIAL.optics.zeta, dt);
  integrateSpring(direction, targetDirection, MATERIAL.optics.omega, MATERIAL.optics.zeta, dt);
}

function render() {
  const e = clamp(energy.x, 0, 1);
  const d = clamp(direction.x, -1, 1);
  const travel = e * d;
  const root = document.documentElement;

  // Keep per-frame writes on composited opacity/transform channels. The
  // backdrop filter itself is deliberately invariant.
  root.style.setProperty("--glass-scroll-shift", `${(travel * 1.75).toFixed(3)}px`);
  root.style.setProperty("--glass-scroll-shadow-opacity", (0.12 + e * 0.48).toFixed(3));
  root.style.setProperty("--glass-scroll-spec-opacity", (0.82 + e * 0.18).toFixed(3));
  root.style.setProperty("--glass-scroll-rim-opacity", (0.70 + e * 0.22).toFixed(3));
  root.style.setProperty("--glass-scroll-edge-opacity", (0.52 + e * 0.38).toFixed(3));
  root.style.setProperty("--glass-scroll-tint-alpha", (0.10 + e * 0.08).toFixed(3));
}

function settled() {
  return targetEnergy === 0
    && targetDirection === 0
    && Math.abs(energy.x) < SLEEP.pos / 4
    && Math.abs(energy.v) < SLEEP.vel / 2
    && Math.abs(direction.x) < SLEEP.pos / 4
    && Math.abs(direction.v) < SLEEP.vel / 2;
}

function onMotionPreferenceChange() {
  if (reducedMotion?.matches) {
    targetEnergy = 0;
    targetDirection = 0;
  }
  wake();
}

export function startGlassScrollMotion() {
  if (running || typeof window === "undefined") return;
  running = true;
  lastY = window.scrollY;
  lastSampleTime = performance.now();
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.addEventListener?.("change", onMotionPreferenceChange);
  writeDefaults();
  unsubscribe = subscribe({ sample: sampleFrame, step, render, settled });
}

export function sampleGlassScrollMotion(y, now = performance.now()) {
  if (!running) return;

  const elapsed = clamp((now - lastSampleTime) / 1000, 1 / 240, 0.12);
  const delta = y - lastY;
  lastY = y;
  lastSampleTime = now;

  if (Math.abs(delta) < 0.01 || materialMotionDisabled()) return;

  const velocity = delta / elapsed;
  const normalized = Math.abs(tanhSat(velocity / 1800));
  targetEnergy = Math.max(normalized, targetEnergy * 0.35);
  targetDirection = Math.sign(velocity) * normalized;
  lastInputTime = now;
  wake();
}

export function endGlassScrollMotion() {
  targetEnergy = 0;
  targetDirection = 0;
  wake();
}

export function stopGlassScrollMotion() {
  if (!running) return;
  running = false;
  reducedMotion?.removeEventListener?.("change", onMotionPreferenceChange);
  reducedMotion = null;
  unsubscribe?.();
  unsubscribe = null;
  targetEnergy = 0;
  targetDirection = 0;
  energy.x = energy.v = direction.x = direction.v = 0;
  writeDefaults();
}
