/*
 * Burst-oriented task scheduler, adapted from BORE (Masahito Suzuki's
 * Burst-Oriented Response Enhancer for the Linux CFS/EEVDF scheduler).
 *
 * ── What BORE does, and what carries over ─────────────────────────────────
 * BORE scores a task by how long it runs *without yielding* — its burst time.
 * Long bursts earn a penalty; the penalty lowers effective priority; tasks that
 * yield quickly stay near the front. Crucially the penalty is smoothed on the
 * way up and reset when a task sleeps, so a task is judged by its habit rather
 * than by one bad run.
 *
 * That maps onto a browser main thread almost directly. Here a "task" is a unit
 * of warm-up work, a "burst" is the synchronous time it holds the thread, and
 * the thing being protected is input latency rather than desktop interactivity.
 *
 * Four mechanics are carried over deliberately:
 *
 *   1. LOGARITHMIC PENALTY. BORE uses log2(burst_time) above a tolerance
 *      offset, not raw time. A task running 2x longer is not 2x worse — the
 *      difference between 1ms and 2ms barely matters, between 4ms and 64ms it
 *      matters enormously. log2 compresses that correctly.
 *
 *   2. TOLERANCE OFFSET. Bursts below the offset score zero. Most work is
 *      short and should not be ranked at all; only genuinely greedy tasks
 *      should sort late.
 *
 *   3. SMOOTHING ON THE WAY UP, INSTANT ON THE WAY DOWN (binary_smooth).
 *      A task that suddenly runs long is demoted gradually; one that becomes
 *      cheap is promoted immediately. This stops a single slow response from
 *      pinning a task at the back of the queue forever.
 *
 *   4. RESET ON YIELD (restart_burst). Burst accounting is per-slice, not
 *      cumulative for all time.
 *
 * ── What does NOT carry over, and why ─────────────────────────────────────
 * BORE preempts. A browser cannot: once a JS task starts it runs to
 * completion, so there is no way to interrupt a long function mid-flight.
 * This therefore reorders *future* work rather than interrupting current work,
 * and yields cooperatively between slices. It reduces the chance of a long
 * task landing in front of the user; it cannot cut one short.
 *
 * Inheritance across a process tree, futex handling and the deadline rescaling
 * are all meaningless here and are omitted rather than faked.
 */

/* BORE: sched_burst_penalty_offset = 24, against a nanosecond log2 scale.
   Rebased to milliseconds: bursts under ~1ms score nothing. That is roughly
   the point below which a task cannot cause a dropped frame on its own. */
const PENALTY_OFFSET_MS = 1;

/* BORE: sched_burst_penalty_scale = 1536, applied as (penalty * scale) >> 10,
   i.e. x1.5. Kept, so the curve's shape matches the original. */
const PENALTY_SCALE = 1.5;

/* BORE: sched_burst_smoothness = 1, used as a right-shift — each round closes
   half the remaining gap. Kept exactly. */
const SMOOTHNESS_SHIFT = 1;

/* BORE clamps to (40 << 8) - 1 over a 40-step priority range. The equivalent
   here is simply "worst rank", and the value only has to order the queue. */
const MAX_PENALTY = 40;

/*
 * BORE's calc_burst_penalty: log2(burst) above the tolerance, scaled, clamped
 * at zero from below. `log2p1` in the original is a fixed-point integer log
 * because the kernel cannot use floats — Math.log2 is the same curve.
 */
function burstPenalty(burstMs) {
  if (!(burstMs > 0)) return 0;
  const greed = Math.log2(burstMs + 1);
  const tolerance = Math.log2(PENALTY_OFFSET_MS + 1);
  const raw = greed - tolerance;
  if (raw <= 0) return 0;
  return Math.min(raw * PENALTY_SCALE, MAX_PENALTY);
}

/*
 * BORE's binary_smooth: rises gradually, falls instantly.
 *
 * The kernel writes this branchlessly with masks because a branch in the
 * scheduler hot path is expensive. Here clarity wins — the behaviour is
 * identical, and this runs a handful of times per page load.
 */
function smoothPenalty(next, prev) {
  if (next <= prev) return next;
  const increment = next - prev;
  return prev + increment / (1 << SMOOTHNESS_SHIFT);
}

/* scheduler.yield() resumes at the FRONT of the task queue, so yielding does
   not send this work to the back behind unrelated tasks. Chrome 129+. */
const yieldToBrowser = typeof scheduler !== "undefined" && typeof scheduler.yield === "function"
  ? () => scheduler.yield()
  : () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Run tasks shortest-burst-first, learning each task's cost as it goes.
 *
 * `tasks` is [{ label, run }]. Penalties persist in `memory` across calls, so a
 * task that proved greedy last time starts behind — that is the whole point of
 * BORE, and it is why this is worth more on the second page load than the first.
 *
 * Returns once every task has been STARTED. Tasks that return promises are not
 * awaited: their async tail is the browser's problem, not the thread's. Only
 * synchronous burn is measured, because only synchronous burn blocks input.
 */
export async function runBurstOrdered(tasks, memory = new Map(), onTask) {
  const queue = tasks.slice().sort((a, b) =>
    (memory.get(a.label) ?? 0) - (memory.get(b.label) ?? 0));

  for (const task of queue) {
    const started = performance.now();
    try {
      void Promise.resolve(task.run()).catch(() => {});
    } catch { /* a warm-up failure must never break the page */ }

    /* Only the synchronous portion is the burst — the part that actually held
       the thread. Awaiting here would measure network latency instead, which
       is not this scheduler's business. */
    const burst = performance.now() - started;
    const prev = memory.get(task.label) ?? 0;
    memory.set(task.label, smoothPenalty(burstPenalty(burst), prev));

    onTask?.(task.label, burst);

    /* Yield only after a burst that actually cost something. Yielding after
       every trivial task is the "fair" behaviour BORE exists to avoid: it
       spends more time in the queue than it saves. */
    if (burst > PENALTY_OFFSET_MS) await yieldToBrowser();
  }

  return memory;
}

/** Persisted across reloads so the ordering is already learned on arrival. */
const STORAGE_KEY = "mabis-burst-penalties-v1";

export function loadPenalties() {
  try {
    return new Map(Object.entries(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")));
  } catch {
    return new Map();
  }
}

export function savePenalties(memory) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(memory)));
  } catch { /* private mode: the scheduler just relearns each visit */ }
}
