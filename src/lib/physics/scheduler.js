/**
 * One global animation clock for all custom physics.
 *
 * Contract per subscriber:
 *   sample(now) — optional input/read phase, once per display frame
 *   step(dt)    — called with a FIXED dt (seconds) 0..N times per frame
 *   render(a)   — write phase, once per frame; a is interpolation alpha
 *   settled()   — optional; when every subscriber returns true the loop sleeps
 *
 * A fixed timestep with an accumulator keeps behaviour identical at 60/120/240Hz.
 * The accumulator is clamped so a stalled tab can never trigger a burst of
 * catch-up steps (the classic "spiral of death").
 *
 * This loop also feeds the shared refresh-rate estimator. It is the one rAF
 * callback that runs whenever anything on the page is moving, so it supplies
 * the measurement for free — no observer needs a loop of its own.
 */
import { sampleFrame, resetFrameChain } from "@/lib/physics/refresh-rate";

const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.1; // never simulate more than 100ms of catch-up in one frame

const subs = new Set();
const primed = new WeakSet();
const activeSubs = [];
let raf = null;
let last = 0;
let acc = 0;

function frame(now) {
  sampleFrame(now);

  const t = now / 1000;
  let elapsed = t - last;
  last = t;
  if (!(elapsed > 0)) elapsed = FIXED_DT;
  if (elapsed > MAX_FRAME) elapsed = MAX_FRAME;

  // All high-frequency input and geometry reads happen before simulation and
  // DOM writes, preventing read/write interleaving from forcing layout.
  // Settled subscribers still sample so input can wake them, but they do not
  // keep integrating or writing DOM while another effect is moving.
  activeSubs.length = 0;
  for (const s of subs) {
    if (s.sample) s.sample(now);
    const initial = !primed.has(s);
    if (initial) primed.add(s);
    if (initial || !s.settled || !s.settled()) activeSubs.push(s);
  }

  acc += elapsed;
  let steps = 0;
  while (acc >= FIXED_DT && steps < 12) {
    for (const s of activeSubs) s.step(FIXED_DT);
    acc -= FIXED_DT;
    steps++;
  }
  if (steps === 12) acc = 0; // drop the backlog rather than chase it

  let allSettled = true;
  const alpha = acc / FIXED_DT;
  for (const s of activeSubs) {
    s.render(alpha);
    if (!s.settled || !s.settled()) allSettled = false;
  }

  if (allSettled || activeSubs.length === 0 || subs.size === 0 || document.hidden) {
    raf = null;
    return;
  }
  raf = requestAnimationFrame(frame);
}

/** Start (or resume) the loop. Safe to call on every input event. */
export function wake() {
  if (raf !== null || document.hidden) return;
  last = performance.now() / 1000;
  acc = 0;
  /* The loop has been parked for an unknown time; the next timestamp is not a
   * frame delta and must not be measured as one. */
  resetFrameChain();
  raf = requestAnimationFrame(frame);
}

export function subscribe(sub) {
  subs.add(sub);
  wake();
  return () => {
    subs.delete(sub);
    if (subs.size === 0 && raf !== null) { cancelAnimationFrame(raf); raf = null; }
  };
}

if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (raf !== null) { cancelAnimationFrame(raf); raf = null; }
      resetFrameChain();
    } else {
      wake();
    }
  });
}