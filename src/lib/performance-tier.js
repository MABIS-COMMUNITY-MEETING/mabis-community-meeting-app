export const PERFORMANCE_TIER_EVENT = "mabis-performance-tier";

let lowPower = false;

export function isConstrainedNetwork() {
  if (typeof navigator === "undefined") return false;
  const connection = navigator.connection;
  return connection?.saveData === true || ["slow-2g", "2g"].includes(connection?.effectiveType);
}

export function detectLowPowerDevice() {
  if (typeof navigator === "undefined") return false;
  const memory = navigator.deviceMemory;
  const cores = navigator.hardwareConcurrency;
  return navigator.connection?.saveData === true ||
    (typeof memory === "number" && memory <= 2) ||
    (typeof cores === "number" && cores <= 2);
}

export function lowPowerMode() {
  return lowPower || (typeof document !== "undefined" && document.documentElement.classList.contains("performance-lite"));
}

export function applyLowPowerMode(enabled) {
  lowPower = enabled;
  document.documentElement.classList.toggle("performance-lite", enabled);
  document.body.classList.toggle("performance-lite", enabled);
  window.dispatchEvent(new CustomEvent(PERFORMANCE_TIER_EVENT, { detail: enabled }));
}

export function monitorFrameBudget(onLowPower) {
  if (detectLowPowerDevice()) {
    onLowPower();
    return () => {};
  }

  let raf = 0;
  let previous = 0;
  let frames = 0;
  let slowFrames = 0;
  let elapsed = 0;

  const sample = (now) => {
    if (!previous) previous = now;
    else {
      const dt = now - previous;
      previous = now;
      // Ignore tab switches and debugging pauses; count sustained missed frames.
      if (dt < 100) {
        frames += 1;
        elapsed += dt;
        if (dt > 25) slowFrames += 1;
      }
    }

    if (frames >= 90) {
      if (elapsed / frames > 20 || slowFrames / frames > 0.2) onLowPower();
      return;
    }
    raf = requestAnimationFrame(sample);
  };

  raf = requestAnimationFrame(sample);
  return () => cancelAnimationFrame(raf);
}