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

import { refreshIntervalMs } from "../../src/lib/physics/refresh-rate.js";

/*
 * BORE 6.8.0 stores burst time in nanoseconds and compares its fixed-point
 * log2p1 value with sched_burst_penalty_offset = 24. log2p1 is approximately
 * log2(ns) + 1, so the zero-penalty tolerance begins at 2^23 ns (8.388608 ms).
 * Keeping the units explicit avoids the old browser port's inaccurate 1 ms
 * reinterpretation of the kernel constant.
 */
const NS_PER_MS = 1_000_000;
const PENALTY_OFFSET_BITS = 24;
const PENALTY_TOLERANCE_MS = (2 ** (PENALTY_OFFSET_BITS - 1)) / NS_PER_MS;

/* BORE: sched_burst_penalty_scale = 1536, applied as (penalty * scale) >> 10,
   i.e. x1.5. Kept, so the curve's shape matches the supplied 6.8.0 patch. */
const PENALTY_SCALE = 1536 / 1024;

/* BORE: sched_burst_smoothness = 1, used as a right-shift — each round closes
   half the remaining gap. Kept exactly. */
const SMOOTHNESS_SHIFT = 1;

/* BORE clamps to (40 << 8) - 1 over a 40-step priority range. The equivalent
   here is simply "worst rank", and the value only has to order the queue. */
const MAX_PENALTY = 40;

/*
 * How much synchronous thread time may accumulate before handing back.
 *
 * BORE's kernel slice is a preemption budget; JavaScript cannot preempt a
 * running function, so this is a cooperative budget between tasks. It tracks
 * the panel instead of assuming 60 or 144 Hz: at most 30% of a measured frame
 * is offered to warm-up work and capped at 5 ms for throughput. There is no
 * fixed floor: a floor becomes a hidden maximum supported refresh rate once
 * the display's entire frame interval is shorter than that constant.
 *
 * Before the refresh estimator has enough evidence, refreshIntervalMs() is
 * given a conservative 120 Hz fallback. This protects 120/144/240 Hz first
 * loads instead of spending a 60 Hz-sized slice before the panel is measured.
 */
const SLICE_SHARE = 0.30;
const MAX_SLICE_MS = 5;

export function cooperativeSliceMs(intervalMs = refreshIntervalMs(1000 / 120)) {
  const interval = Number(intervalMs);
  const safeInterval = Number.isFinite(interval) && interval > 0 ? interval : 1000 / 120;
  return Math.min(MAX_SLICE_MS, safeInterval * SLICE_SHARE);
}

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
  if (burst === Infinity) return MAX_PENALTY;
  if (burst <= PENALTY_TOLERANCE_MS) return 0;

  /* Kernel log2p1_u64_u32fp(ns, 8) is a fixed-point approximation of
   * log2(ns) + 1. Math.log2 gives the same curve without integer quantisation. */
  const greed = Math.log2(burst * NS_PER_MS) + 1;
  const raw = greed - PENALTY_OFFSET_BITS;
  return Math.min(Math.max(raw, 0) * PENALTY_SCALE, MAX_PENALTY);
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

/*
 * The supplied BORE 6.8.0 patch lets a more interactive wake-up bypass a
 * CPU-bound task's protected slice. A page cannot alter CFS/EEVDF weights, but
 * it can submit this continuation at background priority so input, rendering
 * and user-visible tasks stay ahead. scheduler.postTask is feature-detected;
 * scheduler.yield is the next-best cooperative primitive.
 *
 * A bare rAF promise is not enough as a fallback: promise continuations run as
 * microtasks before paint. rAF -> setTimeout guarantees a rendering opportunity
 * before the next burst. Hidden tabs use a timer because rAF is suspended.
 */
function yieldToBrowser() {
  const taskScheduler = globalThis.scheduler;
  if (typeof taskScheduler?.postTask === "function") {
    return taskScheduler.postTask(() => {}, { priority: "background" });
  }
  if (typeof taskScheduler?.yield === "function") return taskScheduler.yield();
  if (typeof document !== "undefined" && !document.hidden
      && typeof requestAnimationFrame === "function") {
    return new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/* Browser equivalent of BORE's wake-up preemption check. It cannot interrupt
 * a function already executing, but it can cancel slice protection at the
 * next task boundary when input is waiting. */
function hasPendingInput() {
  try {
    return globalThis.navigator?.scheduling?.isInputPending?.({ includeContinuous: true }) === true;
  } catch {
    return false;
  }
}

/*
 * BORE's default inheritance type samples an ancestor hub, preventing newly
 * forked work from escaping its family's learned burst penalty. Browser tasks
 * have no process tree, so callers may provide a group; an unseen label starts
 * from that group's persisted average. Known labels retain their own history.
 */
const GROUP_PREFIX = "@bore-group:";
const GROUP_SAMPLE_LIMIT = 63;
function groupKey(task) {
  const group = typeof task?.group === "string" ? task.group.trim() : "";
  return group ? GROUP_PREFIX + group : "";
}
function inheritedPenalty(memory, task) {
  if (memory.has(task.label)) return penaltyOf(memory, task.label);
  const key = groupKey(task);
  return key ? penaltyOf(memory, key) : 0;
}
function updateGroupPenalty(memory, queue, task) {
  const key = groupKey(task);
  if (!key) return;
  const values = [];
  for (const sibling of queue) {
    if (groupKey(sibling) !== key || !memory.has(sibling.label)) continue;
    values.push(penaltyOf(memory, sibling.label));
    if (values.length >= GROUP_SAMPLE_LIMIT) break;
  }
  const positive = values.filter((value) => value > 0);
  if (!positive.length) {
    memory.delete(key);
    return;
  }
  memory.set(key, positive.reduce((sum, value) => sum + value, 0) / positive.length);
}

/**
 * Run warm-up tasks bursty-first, learning each task's cost as it goes.
 *
 * `tasks` is [{ label, run, io }]. Penalties persist in `memory` across loads,
 * so a task that proved greedy last time starts behind — that is the whole
 * point of BORE, and it is why this is worth more on the second visit.
 *
 * Two different numbers are reported, but only CPU burst time changes rank:
 *
 *   • SYNCHRONOUS (kickoff until it returns) drives both BORE penalty and slice
 *     accounting. That matches update_curr_bore(delta_exec): time asleep or
 *     waiting on I/O is not CPU runtime and must not demote an interactive task.
 *
 *   • TOTAL (kickoff through settle) is retained as diagnostics for "time until
 *     usable", but never affects priority.
 *
 * A task that becomes expensive climbs gradually through binary_smooth; one
 * that becomes cheap is promoted immediately, matching restart_burst_bore().
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
    sliceMs = cooperativeSliceMs(),
    inputPending = hasPendingInput,
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
    .sort((a, b) => inheritedPenalty(memory, a) - inheritedPenalty(memory, b));

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
    const currentPenalty = burstPenalty(sync);
    const previousPenalty = inheritedPenalty(memory, task);
    const penalty = smoothPenalty(currentPenalty, previousPenalty);
    memory.set(task.label, penalty);
    updateGroupPenalty(memory, queue, task);

    onTask?.({
      label: task.label,
      group: task.group || null,
      sync,
      total,
      currentPenalty,
      previousPenalty,
      penalty,
    });

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
    if (slice >= sliceMs || inputPending()) {
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
