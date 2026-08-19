import { refreshIntervalMs, resetFrameChain, sampleFrame } from "@/lib/physics/refresh-rate";
import { isSoftwareRendered } from "@/lib/software-rendering";

export const PERFORMANCE_TIER_EVENT = "mabis-performance-tier";

let lowPower = false;

function browserNavigator() {
  return /** @type {Navigator & { connection?: { saveData?: boolean, effectiveType?: string }, deviceMemory?: number }} */ (navigator);
}

export function saveDataEnabled() {
  return typeof navigator !== "undefined" && browserNavigator().connection?.saveData === true;
}

export function isConstrainedNetwork() {
  if (typeof navigator === "undefined") return false;
  const connection = browserNavigator().connection;
  return connection?.saveData === true || ["slow-2g", "2g"].includes(connection?.effectiveType);
}

export function detectLowPowerDevice() {
  if (typeof navigator === "undefined") return false;
  const capabilities = browserNavigator();
  const memory = capabilities.deviceMemory;
  const cores = capabilities.hardwareConcurrency;
  return capabilities.connection?.saveData === true ||
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

/*
 * Thresholds for the demotion decision below. Every one of them is either a
 * ratio against the measured refresh interval or a wall-clock duration. None
 * is a frame count and none is an absolute frame time, because both of those
 * change meaning when the panel changes.
 */

/* Judge nothing during mount. The first frames of a page are the most
 * contended moment of its life — chunks compiling, fonts swapping, widgets
 * mounting — and are the worst possible evidence about the hardware. The
 * warm-up doubles as the estimator's bootstrap: by the time judging starts,
 * enough frames have been fed to know what the panel does. */
const WARMUP_MS = 800;

/* A wall-clock window, not a frame count. The old 90-frame window lasted 1.5 s
 * at 60 Hz but only 0.37 s at 240 Hz, so the faster the display, the less
 * evidence the decision rested on. */
const WINDOW_MS = 2000;

/* A frame is late once it has missed a whole vsync. Half a refresh of slack
 * absorbs timer noise without hiding a genuinely dropped frame. */
const LATE_FACTOR = 1.5;

/* Demote when this share of the window arrived late. */
const LATE_SHARE = 0.2;

/* Below this the window saw a stalled tab, not a running page; decide nothing. */
const MIN_FRAMES = 30;

/* Longer than this is a tab switch or a debugger pause, not a dropped frame. */
const STALL_MS = 200;

/**
 * Watch frame pacing and demote to the lite tier if the page cannot keep up.
 *
 * The question this asks is deliberately NOT "are frames arriving slowly?" but
 * "are frames arriving late for this display?". Those differ, and the
 * difference is the whole bug this replaced:
 *
 *   - A steady 30 Hz panel delivers 33 ms frames forever. Under absolute
 *     thresholds every frame looked slow and the device was demoted on sight,
 *     stripping glass and cursor physics off hardware that was keeping perfect
 *     time. Measured against its own refresh, nothing is late and nothing is
 *     taken away.
 *   - A 144 Hz panel collapsing to a stuttering 70 Hz is a 3.5x regression the
 *     user can see. Under absolute thresholds it never tripped, because 14 ms
 *     is comfortably inside a 60 Hz budget. Measured against its own refresh,
 *     most frames miss a vsync and the tier drops as it should.
 *
 * Stable-but-slow therefore keeps its effects and unstable loses them, which
 * is the right priority: consistent pacing is what makes motion feel smooth,
 * not the size of the frame rate.
 */
export function monitorFrameBudget(onLowPower) {
  /*
   * A software rasteriser is a capability fact, not a symptom, so it is read
   * directly rather than inferred from dropped frames. Without this the page
   * spends WARMUP_MS + WINDOW_MS (2.8 s) stuttering through the full-width
   * header blur before the pacing evidence arrives — and since this monitor
   * judges exactly once, a machine that merely paced badly *during* that one
   * window is the only kind it ever catches.
   *
   * Deliberately grouped with detectLowPowerDevice() rather than added to it:
   * that function answers "is this a weak device?" from memory and core count,
   * which a fast workstation with a blacklisted GPU driver would pass easily
   * while still blurring on the CPU. Different question, same conclusion.
   */
  if (detectLowPowerDevice() || isSoftwareRendered()) {
    onLowPower();
    return () => {};
  }

  let raf = 0;
  let previous = 0;
  let started = 0;
  let frames = 0;
  let lateFrames = 0;

  const sample = (now) => {
    if (!started) started = now;
    sampleFrame(now);

    const dt = now - previous;
    const judging = now - started > WARMUP_MS;
    if (previous && judging && dt < STALL_MS) {
      frames += 1;
      if (dt > refreshIntervalMs() * LATE_FACTOR) lateFrames += 1;
    }
    previous = now;

    if (now - started >= WARMUP_MS + WINDOW_MS) {
      raf = 0;
      if (frames >= MIN_FRAMES && lateFrames / frames > LATE_SHARE) onLowPower();
      return;
    }
    raf = requestAnimationFrame(sample);
  };

  raf = requestAnimationFrame(sample);
  return () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    resetFrameChain();
  };
}