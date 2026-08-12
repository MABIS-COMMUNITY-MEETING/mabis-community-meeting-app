/**
 * One global animation clock for all custom physics.
 *
 * Contract per subscriber:
 *   step(dt)  — called with a FIXED dt (seconds) 0..N times per frame
 *   render()  — called once per frame after stepping
 *   settled() — optional; when every subscriber returns true the loop sleeps
 *
 * A fixed timestep with an accumulator keeps behaviour identical at 60/120/240Hz.
 * The accumulator is clamped so a stalled tab can never trigger a burst of
 * catch-up steps (the classic "spiral of death").
 */

const FIXED_DT = 1 / 120;
const MAX_FRAME = 0.1; // never simulate more than 100ms of catch-up in one frame

const subs = new Set();
let raf = null;
let last = 0;
let acc = 0;

function frame(now) {
  const t = now / 1000;
  let elapsed = t - last;
  last = t;
  if (!(elapsed > 0)) elapsed = FIXED_DT;
  if (elapsed > MAX_FRAME) elapsed = MAX_FRAME;

  acc += elapsed;
  let steps = 0;
  while (acc >= FIXED_DT && steps < 12) {
    for (const s of subs) s.step(FIXED_DT);
    acc -= FIXED_DT;
    steps++;
  }
  if (steps === 12) acc = 0; // drop the backlog rather than chase it

  let allSettled = true;
  for (const s of subs) {
    s.render();
    if (!s.settled || !s.settled()) allSettled = false;
  }

  if (allSettled || subs.size === 0 || document.hidden) {
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
    } else {
      wake();
    }
  });
}