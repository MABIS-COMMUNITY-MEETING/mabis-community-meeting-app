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
 *
 * ── I/O is not burst ──────────────────────────────────────────────────────
 * The first version of this file measured every task the same way and was
 * inert as a result. Warm-up work is mostly `queryClient.prefetchQuery(...)`
 * and `import(...)`: calling them is a few microseconds of promise
 * construction, and the expensive part happens off-thread. Timing the call
 * therefore scored every task at zero, every penalty stayed zero, and the sort
 * never reordered anything.
 *
 * So tasks declare which kind they are. `io: true` means "starting this is
 * free, the wait is the network's" — those are all fired at once and never
 * ordered, because sequencing a fetch only delays its response. Everything
 * else is treated as work that lands on the thread, and is sequenced.
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
 * How much synchronous thread time may accumulate before handing back.
 *
 * BORE's slice is a preemption budget; this is a cooperative one. 5ms sits
 * under a 144Hz frame (6.9ms) with room for the browser's own work, so a full
 * slice still cannot drop a frame on the displays this app is tuned for.
 *
 * Note this counts SYNCHRONOUS time only (see below), so a batch of cheap
 * tasks runs back-to-back in one burst rather than yielding between each —
 * which is the entire point of preferring bursty scheduling to fair.
 */
const SLICE_MS = 5;

/* Bounds what gets persisted. Labels are stable, but a rename or a new section
   would otherwise leave the old key in localStorage forever. */
const MAX_TRACKED = 64;

/*
 * BORE's calc_burst_penalty: log2(burst) above the tolerance, scaled, clamped
 * at zero from below. `log2p1` in the original is a fixed-point integer log
 * because the kernel cannot use floats — Math.log2 is the same curve.
 */
export function burstPenalty(burstMs) {
  /* NaN means "not measured" and scores zero, but Infinity means "unbounded"
   * and must clamp to the WORST rank. Treating the two alike would sort an
   * infinitely expensive task to the front, which is the one outcome an
   * ordering scheduler must never produce. Coerced first so a non-number can
   * never reach the log and poison the result. */
  const burst = Number(burstMs);
  if (Number.isNaN(burst) || burst <= 0) return 0;
  const greed = Math.log2(burst + 1);
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
export function smoothPenalty(next, prev) {
  if (next <= prev) return next;
  const increment = next - prev;
  return prev + increment / (1 << SMOOTHNESS_SHIFT);
}

/*
 * Read a penalty defensively.
 *
 * The comparator MUST NOT be handed a NaN: a NaN comparison makes the sort
 * order arbitrary rather than merely wrong, so one corrupt localStorage value
 * would scramble the whole queue. Anything not a sane number scores zero,
 * which is also the correct default for a task never seen before.
 */
function penaltyOf(memory, label) {
  const value = Number(memory.get(label));
  if (!Number.isFinite(value) || value <= 0) return 0;
  return Math.min(value, MAX_PENALTY);
}

/* scheduler.yield() resumes at the FRONT of the task queue, so yielding does
   not send this work to the back behind unrelated tasks. Chrome 129+. */
const yieldToBrowser = typeof scheduler !== "undefined" && typeof scheduler.yield === "function"
  ? () => scheduler.yield()
  : () => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * Run warm-up tasks bursty-first, learning each task's cost as it goes.
 *
 * `tasks` is [{ label, run, io }]. Penalties persist in `memory` across loads,
 * so a task that proved greedy last time starts behind — that is the whole
 * point of BORE, and it is why this is worth more on the second visit.
 *
 * Two different numbers are measured, because they answer two different
 * questions and conflating them is what made the first version useless:
 *
 *   • TOTAL (kickoff through settle) drives the penalty, because "how long
 *     until this is actually usable" is what you want to sort by — cheap
 *     things first means more of the page is warm sooner.
 *
 *   • SYNCHRONOUS (kickoff until it returns) drives yielding, because only
 *     thread-holding time can delay input. Awaiting already unwinds the stack
 *     and hands the thread back, so time spent inside an await needs no yield.
 *
 * A slow network can inflate a cheap module's total on first load. That is
 * exactly the case BORE's asymmetric smoothing exists for: the inflated score
 * decays instantly the moment a warm cache proves it cheap, while a genuinely
 * greedy task takes several observations to climb.
 *
 * Resolves once every task has settled. Failures are swallowed — a warm-up is
 * an optimisation, and must never be able to break the page it is warming.
 */
export async function runBurstOrdered(tasks, options = {}) {
  const {
    storage,
    memory = loadPenalties(storage),
    now = () => performance.now(),
    yieldNow = yieldToBrowser,
    sliceMs = SLICE_MS,
    persist = true,
    onTask,
  } = options;

  /*
   * Fire every I/O task immediately, in one burst, unordered.
   *
   * Ordering these by cost would be worse than pointless: the cost is the
   * server's, not ours, and every millisecond spent deciding is a millisecond
   * the request is not in flight. Issuing them all at once is what lets them
   * overlap.
   */
  for (const task of tasks) {
    if (!task?.io) continue;
    try {
      void Promise.resolve(task.run()).catch(() => {});
    } catch { /* a warm-up failure must never break the page */ }
  }

  const queue = tasks
    .filter((task) => task && !task.io)
    .sort((a, b) => penaltyOf(memory, a.label) - penaltyOf(memory, b.label));

  let slice = 0;

  for (const task of queue) {
    const started = now();
    let pending;
    try {
      pending = task.run();
    } catch { /* treated as an instantly-failed task, same as a rejection */ }

    /* Everything up to here held the thread. This is the only part that can
       delay a keystroke, so it is the only part charged to the slice. */
    const sync = Math.max(0, now() - started);

    try {
      await pending;
    } catch { /* see above: warm-up failures are not the page's problem */ }

    const total = Math.max(sync, now() - started);
    const penalty = smoothPenalty(burstPenalty(total), penaltyOf(memory, task.label));
    memory.set(task.label, penalty);

    onTask?.({ label: task.label, sync, total, penalty });

    slice += sync;

    /*
     * Yield only once the slice is spent — not after every task.
     *
     * Yielding per task is the "fair" behaviour BORE exists to avoid: with a
     * dozen cheap tasks it spends more time in the scheduler queue than it
     * saves, and the batch finishes measurably later. Letting cheap work run
     * back-to-back and paying a single yield when the budget is gone is the
     * bursty alternative.
     */
    if (slice >= sliceMs) {
      slice = 0; /* BORE's restart_burst: accounting is per-slice. */
      await yieldNow();
    }
  }

  if (persist) savePenalties(memory, storage);
  return memory;
}

/** Persisted across reloads so the ordering is already learned on arrival. */
const STORAGE_KEY = "mabis-burst-penalties-v1";

/* Access itself can throw — Safari's private mode throws on the property, not
   just on the call — so even reaching for it is guarded. */
function defaultStorage() {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadPenalties(storage = defaultStorage()) {
  const memory = new Map();
  try {
    const raw = JSON.parse(storage?.getItem(STORAGE_KEY) || "{}");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return memory;
    for (const [label, value] of Object.entries(raw)) {
      const penalty = Number(value);
      if (label && Number.isFinite(penalty) && penalty > 0) {
        memory.set(label, Math.min(penalty, MAX_PENALTY));
      }
    }
  } catch { /* corrupt or unavailable: relearn from scratch, never throw */ }
  return memory;
}

export function savePenalties(memory, storage = defaultStorage()) {
  try {
    /*
     * Zero-penalty entries are dropped rather than stored. penaltyOf() already
     * returns 0 for anything missing, so persisting them carries no
     * information — and dropping them is what keeps a long-lived install from
     * accumulating a key per label that ever existed.
     */
    const entries = [...memory.entries()]
      .map(([label, value]) => [label, Number(value)])
      .filter(([label, value]) => label && Number.isFinite(value) && value > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_TRACKED);

    if (!entries.length) {
      storage?.removeItem(STORAGE_KEY);
      return;
    }
    storage?.setItem(STORAGE_KEY, JSON.stringify(Object.fromEntries(entries)));
  } catch { /* private mode: the scheduler just relearns each visit */ }
}
