/**
 * The display's refresh interval, measured rather than assumed.
 *
 * No browser API reports the refresh rate, so every "is this frame late?"
 * question in this codebase used to be answered against a hardcoded 1000/60.
 * That is wrong in both directions. On a 30 Hz panel every frame is 33 ms and
 * looks catastrophic; on a 144 Hz panel a collapse from 6.9 ms to 24 ms — a
 * 3.5x stutter the user can plainly see — looks fine, because 24 is under the
 * 60 Hz budget. A constant cannot answer the question. The delivered frames
 * can.
 *
 * ESTIMATOR: a low percentile of recent rAF deltas.
 *
 * This works because the error is one-sided. The compositor can never present
 * frames closer together than the panel refreshes, but it presents them
 * further apart whenever a frame is missed. Jank, GC pauses and throttling
 * therefore only ever push deltas UP, so the bottom of the distribution is the
 * refresh interval and the whole tail is the jank we want to measure against.
 * A mean or a median would be dragged upward by exactly the stutter being
 * measured, and the metric would flatter the app the worse it ran.
 *
 * KNOWN AMBIGUITY, stated rather than hidden: a device pinned at exactly half
 * its panel rate forever (a 60 Hz screen delivering 33.3 ms every single time)
 * is indistinguishable by spacing alone from a genuine 30 Hz screen. Real
 * struggling devices mix intervals — 16.7, 33.3, 50, 16.7 — and the low
 * percentile finds the 16.7s, so this resolves in practice. In the pinned case
 * the delivery is at least perfectly paced, which is the property that
 * actually governs how motion feels, so treating it as a slow-but-steady panel
 * is the right failure mode.
 *
 * COST: feeding is one compare and one array store, no allocation, safe to
 * call from any frame callback. The percentile is only computed when somebody
 * asks, which is at most once a second.
 */

const RING = 64;

/* Low enough to sit under the jank tail, high enough that a couple of freak
 * short deltas from timer noise cannot drag the estimate below the panel. */
const PERCENTILE = 0.2;

/* Under this many samples the estimate is noise, and callers get the fallback. */
const MIN_SAMPLES = 12;

/* There is deliberately no lower interval bound. Any positive rAF delta is
 * valid evidence, so a future 2 kHz, 10 kHz or faster display does not hit a
 * ceiling hidden in today's hardware assumptions. Repeated calls from several
 * rAF subscribers in the same refresh share a timestamp and produce dt=0,
 * which the positive-delta check rejects naturally.
 *
 * 50 ms is the opposite guard: a longer gap is a stall, background tab or
 * debugger pause, and says nothing about the display's refresh. */
const MAX_INTERVAL_MS = 50;

/* Re-estimation is throttled by elapsed time, not frame count. Sorting every
 * N frames makes the measurement cost grow with refresh rate—the exact
 * opposite of future-proof. Four small 64-value sorts per second keep monitor
 * changes responsive while costing the same at 30 Hz and at any future rate. */
const RECOMPUTE_INTERVAL_MS = 250;

const deltas = new Float64Array(RING);
const scratch = new Float64Array(RING);
let count = 0;
let head = 0;
let previous = 0;
let cached = 0;
let computedAt = -Infinity;

/**
 * Record one presented frame. Call from any rAF callback that is already
 * running; this deliberately owns no loop of its own, because a loop kept
 * alive purely to measure would be the thing costing the frames.
 */
export function sampleFrame(now) {
  const dt = now - previous;
  /* A delta outside the plausible band is a stall, not a refresh. It is
   * dropped, but `previous` still advances, so the gap is never smeared into
   * the next sample either. */
  if (previous && dt > 0 && dt <= MAX_INTERVAL_MS) {
    deltas[head] = dt;
    head = (head + 1) % RING;
    if (count < RING) count++;
  }
  previous = now;
}

/**
 * Break the timestamp chain. Call whenever a frame loop parks or the tab is
 * hidden, so the first delta after it resumes is not measured against a
 * timestamp from minutes ago.
 */
export function resetFrameChain() {
  previous = 0;
}

/** True once enough frames have been seen for the estimate to mean anything. */
export function refreshMeasured() {
  return count >= MIN_SAMPLES;
}

/**
 * Milliseconds between refreshes. Falls back to a 60 Hz assumption only while
 * genuinely unmeasured — callers get a usable number from the first frame, and
 * a correct one within about a dozen.
 */
export function refreshIntervalMs(fallback = 1000 / 60) {
  if (count < MIN_SAMPLES) return fallback;
  if (cached && previous - computedAt < RECOMPUTE_INTERVAL_MS) return cached;

  /* Ring order is irrelevant to a percentile, so this copies into a scratch
   * view and sorts in place rather than allocating. */
  const view = scratch.subarray(0, count);
  view.set(deltas.subarray(0, count));
  view.sort();
  cached = view[Math.floor((count - 1) * PERCENTILE)];
  computedAt = previous;
  return cached;
}

/** The same figure as a rate, for reporting. */
export function refreshHz(fallback = 60) {
  return 1000 / refreshIntervalMs(1000 / fallback);
}

/**
 * How late a frame delta is, as a multiple of one refresh. 1 is on time, 2
 * means one whole missed vsync, and the number is directly comparable across
 * every panel — which is the entire point of measuring rather than assuming.
 */
export function framesLate(deltaMs) {
  return deltaMs / refreshIntervalMs();
}

/* Testing seam. The guard script drives this module with synthetic frame
 * timings for panels no sandbox has; nothing in the app calls it. */
export function resetForTest() {
  count = 0;
  head = 0;
  previous = 0;
  cached = 0;
  computedAt = -Infinity;
}
