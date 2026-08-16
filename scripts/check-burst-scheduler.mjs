/**
 * Burst scheduler contract (solid/lib/burst-scheduler.js).
 *
 * This module decides the order and the pacing of every warm-up task on Home,
 * so when it is wrong the symptom is never "the scheduler is broken" — it is
 * "the page feels slow", which is unattributable by eye. Hence the pinning.
 *
 * The clock, the yield and the storage are all injected, so nothing here
 * depends on real time or on a real browser: the same assertions hold on a
 * fast machine, a slow one, and in CI.
 *
 * Three properties matter more than the rest, and each killed an earlier
 * version of this file:
 *
 *   1. I/O tasks are FIRED, never awaited or ordered. Sequencing a fetch only
 *      delays its response.
 *   2. Only SYNCHRONOUS time is charged to the slice. Time inside an await is
 *      already yielded, so charging it makes the scheduler yield constantly —
 *      the "fair" behaviour this exists to avoid.
 *   3. The comparator never sees NaN. A NaN comparison makes sort order
 *      arbitrary, so one corrupt stored value would scramble the whole queue.
 *
 * Run: node scripts/check-burst-scheduler.mjs
 */
const { runBurstOrdered, burstPenalty, smoothPenalty, loadPenalties, savePenalties } =
  await import("../solid/lib/burst-scheduler.js");

const failures = [];
let count = 0;
function check(name, condition, detail = "") {
  count += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}
const near = (a, b, tol = 1e-9) => Math.abs(a - b) < tol;

function fakeStorage() {
  const data = new Map();
  return {
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
    removeItem: (key) => data.delete(key),
    data,
  };
}

/* A test harness clock. Tasks move `t` themselves, so "how long did this take"
   is exactly what the test declared it to be. */
function harness() {
  const state = { t: 0, yields: 0, order: [], seen: [] };
  return {
    state,
    now: () => state.t,
    yieldNow: async () => { state.yields += 1; },
    /* Synchronous burn of `sync` ms, then an awaited tail of `tail` ms. */
    task: (label, sync, tail = 0, extra = {}) => ({
      label,
      ...extra,
      run: () => {
        state.order.push(label);
        state.t += sync;
        if (!tail) return undefined;
        return Promise.resolve().then(() => { state.t += tail; });
      },
    }),
  };
}

/* ── 1. BORE's penalty curve ─────────────────────────────────────────────── */
/* Exact values, not approximations: the curve is log2(burst+1) - log2(offset+1)
   scaled by 1.5, with the offset at 1ms. Picking bursts of 3 and 7 makes the
   logs land on integers, which pins the SHAPE and not just the direction. */
check("burst at the tolerance scores zero", burstPenalty(1) === 0);
check("burst below the tolerance scores zero", burstPenalty(0.5) === 0);
check("zero burst scores zero", burstPenalty(0) === 0);
check("negative burst scores zero", burstPenalty(-5) === 0);
check("NaN burst scores zero", burstPenalty(NaN) === 0);
check("Infinity burst is clamped, not NaN", burstPenalty(Infinity) === 40);
check("3ms scores 1.5", near(burstPenalty(3), 1.5), String(burstPenalty(3)));
check("7ms scores 3.0", near(burstPenalty(7), 3), String(burstPenalty(7)));
check("15ms scores 4.5", near(burstPenalty(15), 4.5), String(burstPenalty(15)));
check("the curve is logarithmic, not linear",
  near(burstPenalty(7) - burstPenalty(3), burstPenalty(15) - burstPenalty(7)));
check("doubling a small burst costs less than doubling a large one",
  burstPenalty(2) - burstPenalty(1) < burstPenalty(64) - burstPenalty(32));
check("the penalty is clamped at the worst rank", burstPenalty(2 ** 40) === 40);
check("the penalty is monotonic", burstPenalty(2) < burstPenalty(4) && burstPenalty(4) < burstPenalty(8));

/* ── 2. binary_smooth: gradual up, instant down ──────────────────────────── */
check("a rise closes half the gap", smoothPenalty(3, 1) === 2);
check("a second rise closes half of what is left", smoothPenalty(3, 2) === 2.5);
check("a fall applies immediately", smoothPenalty(1, 3) === 1);
check("a fall to zero applies immediately", smoothPenalty(0, 9) === 0);
check("an unchanged penalty stays put", smoothPenalty(2, 2) === 2);
check("rising never overshoots the target", smoothPenalty(3, 1) < 3);
/* The reason the asymmetry is here at all: one slow network response must not
   pin a cheap module at the back of the queue for the rest of the session. */
let settling = 0;
for (let i = 0; i < 6; i += 1) settling = smoothPenalty(4, settling);
check("a repeatedly-slow task does converge upward", settling > 3.9);
check("...and one cheap observation undoes all of it", smoothPenalty(0.1, settling) === 0.1);

/* ── 3. Ordering ─────────────────────────────────────────────────────────── */
{
  const h = harness();
  const memory = new Map([["slow", 9], ["quick", 0.2], ["mid", 3]]);
  const tasks = [h.task("slow", 0), h.task("mid", 0), h.task("quick", 0)];
  await runBurstOrdered(tasks, { memory, now: h.now, yieldNow: h.yieldNow, persist: false });
  check("cheapest-first ordering", h.state.order.join(",") === "quick,mid,slow", h.state.order.join(","));
  check("the caller's array is not reordered under it",
    tasks.map((t) => t.label).join(",") === "slow,mid,quick");
}

/* A corrupt stored value must not be able to scramble the queue. */
{
  const h = harness();
  const memory = new Map([["poison", NaN], ["heavy", 5], ["light", 1]]);
  await runBurstOrdered([h.task("poison", 0), h.task("heavy", 0), h.task("light", 0)],
    { memory, now: h.now, yieldNow: h.yieldNow, persist: false });
  check("a NaN penalty sorts as zero rather than scrambling the order",
    h.state.order.join(",") === "poison,light,heavy", h.state.order.join(","));
}
{
  const h = harness();
  const memory = new Map([["negative", -100], ["normal", 2], ["huge", 1e9]]);
  await runBurstOrdered([h.task("huge", 0), h.task("negative", 0), h.task("normal", 0)],
    { memory, now: h.now, yieldNow: h.yieldNow, persist: false });
  check("out-of-range penalties are clamped into the ordering",
    h.state.order.join(",") === "negative,normal,huge", h.state.order.join(","));
}

/* ── 4. Bursty, not fair ─────────────────────────────────────────────────── */
{
  const h = harness();
  await runBurstOrdered(
    Array.from({ length: 12 }, (_, i) => h.task(`cheap${i}`, 0)),
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, sliceMs: 5, persist: false },
  );
  check("twelve free tasks run in one burst with no yields", h.state.yields === 0, `yields=${h.state.yields}`);
  check("...and all of them still ran", h.state.order.length === 12);
}
{
  const h = harness();
  /* 2ms each against a 5ms slice: the budget is crossed on the third task. */
  await runBurstOrdered(
    Array.from({ length: 6 }, (_, i) => h.task(`work${i}`, 2)),
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, sliceMs: 5, persist: false },
  );
  check("the thread is handed back once per exhausted slice", h.state.yields === 2, `yields=${h.state.yields}`);
}
{
  const h = harness();
  await runBurstOrdered([h.task("hog", 50)],
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, sliceMs: 5, persist: false });
  check("a single over-budget task yields exactly once", h.state.yields === 1);
}
{
  /* The slice must RESET after yielding (BORE's restart_burst). Without the
     reset, everything after the first yield would yield too. */
  const h = harness();
  await runBurstOrdered(
    [h.task("big", 10), h.task("a", 1), h.task("b", 1), h.task("c", 1)],
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, sliceMs: 5, persist: false },
  );
  check("the slice resets after a yield instead of staying over budget",
    h.state.yields === 1, `yields=${h.state.yields}`);
}

/* ── 5. Awaited time is not charged to the slice ─────────────────────────── */
{
  const h = harness();
  await runBurstOrdered(
    Array.from({ length: 8 }, (_, i) => h.task(`net${i}`, 0, 250)),
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, sliceMs: 5, persist: false },
  );
  check("waiting on the network never triggers a yield", h.state.yields === 0, `yields=${h.state.yields}`);
  check("the awaited tail really did advance the clock", h.state.t === 2000, String(h.state.t));
}
{
  /* ...but it IS what the penalty is learned from, because the penalty ranks
     "time until usable" while the slice protects "time holding the thread". */
  const h = harness();
  const memory = await runBurstOrdered([h.task("slowNet", 0, 15)],
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false });
  check("the penalty is learned from total time, not synchronous time",
    near(memory.get("slowNet"), smoothPenalty(burstPenalty(15), 0)), String(memory.get("slowNet")));
  check("...and a task that waited is penalised at all", memory.get("slowNet") > 0);
}
{
  const h = harness();
  const memory = await runBurstOrdered([h.task("free", 0)],
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false });
  check("an instant task earns no penalty", memory.get("free") === 0);
}
{
  /* Learning across visits: the penalty must climb on repeated slow runs. */
  let memory = new Map();
  for (let visit = 0; visit < 4; visit += 1) {
    const h = harness();
    memory = await runBurstOrdered([h.task("greedy", 30)],
      { memory, now: h.now, yieldNow: h.yieldNow, persist: false });
  }
  check("a repeatedly greedy task climbs toward its true cost",
    memory.get("greedy") > burstPenalty(30) * 0.9, String(memory.get("greedy")));
  check("...and never past it", memory.get("greedy") <= burstPenalty(30));
}

/* ── 6. I/O tasks are fired, not sequenced ───────────────────────────────── */
{
  const h = harness();
  const started = [];
  const io = (label) => ({
    label,
    io: true,
    /* Never settles. If the scheduler awaits this, the run hangs and the test
       times out — which is the assertion. */
    run: () => { started.push(label); return new Promise(() => {}); },
  });
  const done = await Promise.race([
    runBurstOrdered([io("net1"), io("net2"), h.task("cpu", 1)],
      { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false }).then(() => "resolved"),
    new Promise((r) => setTimeout(() => r("hung"), 300)),
  ]);
  check("an unresolved I/O task does not stall the scheduler", done === "resolved", String(done));
  check("every I/O task was started", started.join(",") === "net1,net2");
  check("I/O is issued before sequenced work begins",
    started.length === 2 && h.state.order.join(",") === "cpu");
  check("I/O costs no slice time", h.state.yields === 0);
}
{
  /* I/O is deliberately NOT reordered: the cost is the server's, and time
     spent deciding is time the request is not in flight. */
  const h = harness();
  const started = [];
  const io = (label) => ({ label, io: true, run: () => { started.push(label); return Promise.resolve(); } });
  await runBurstOrdered([io("expensive"), io("cheap")],
    { memory: new Map([["expensive", 30], ["cheap", 0]]), now: h.now, yieldNow: h.yieldNow, persist: false });
  check("I/O keeps its declared order regardless of penalty", started.join(",") === "expensive,cheap");
}

/* ── 7. A warm-up may never break the page ───────────────────────────────── */
{
  const h = harness();
  const boom = { label: "throws", run: () => { throw new Error("sync"); } };
  const reject = { label: "rejects", run: () => Promise.reject(new Error("async")) };
  const ioBoom = { label: "ioThrows", io: true, run: () => { throw new Error("io sync"); } };
  const ioReject = { label: "ioRejects", io: true, run: () => Promise.reject(new Error("io async")) };
  let ok = true;
  try {
    await runBurstOrdered([ioBoom, ioReject, boom, reject, h.task("after", 0)],
      { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false });
  } catch { ok = false; }
  check("a throwing task does not reject the run", ok);
  check("work queued after a failure still runs", h.state.order.includes("after"));
}

/* ── 8. Persistence ──────────────────────────────────────────────────────── */
{
  const storage = fakeStorage();
  savePenalties(new Map([["kept", 3], ["zero", 0], ["bad", NaN], ["neg", -2], ["", 5]]), storage);
  const back = loadPenalties(storage);
  check("a real penalty round-trips", back.get("kept") === 3);
  check("zero penalties are not stored", !back.has("zero"), "they carry no information");
  check("NaN is not stored", !back.has("bad"));
  check("negative penalties are not stored", !back.has("neg"));
  check("blank labels are not stored", !back.has(""));
  check("nothing else leaks in", back.size === 1, [...back.keys()].join(","));
}
{
  const storage = fakeStorage();
  savePenalties(new Map(Array.from({ length: 200 }, (_, i) => [`t${i}`, i + 1])), storage);
  const back = loadPenalties(storage);
  check("stored penalties are capped", back.size === 64, String(back.size));
  check("the cap keeps the most expensive tasks, which are the ones ordering needs",
    back.has("t199") && !back.has("t0"));
}
{
  const storage = fakeStorage();
  storage.setItem("mabis-burst-penalties-v1", '{"stale":4}');
  savePenalties(new Map([["all", 0]]), storage);
  check("an empty penalty set clears the key rather than leaving stale data",
    loadPenalties(storage).size === 0);
}
for (const [name, raw] of [
  ["malformed JSON", "{not json"],
  ["an array", "[1,2,3]"],
  ["a bare number", "42"],
  ["null", "null"],
  ["a string value", '{"a":"nope"}'],
  ["Infinity as a string", '{"a":"Infinity"}'],
]) {
  const storage = fakeStorage();
  storage.setItem("mabis-burst-penalties-v1", raw);
  let map;
  let threw = false;
  try { map = loadPenalties(storage); } catch { threw = true; }
  check(`${name} in storage is ignored without throwing`, !threw && map.size === 0);
}
{
  const storage = fakeStorage();
  storage.setItem("mabis-burst-penalties-v1", '{"a":1e9}');
  check("an absurd stored penalty is clamped on load", loadPenalties(storage).get("a") === 40);
}
{
  const hostile = {
    getItem: () => { throw new Error("private mode"); },
    setItem: () => { throw new Error("private mode"); },
    removeItem: () => { throw new Error("private mode"); },
  };
  let threw = false;
  try {
    loadPenalties(hostile);
    savePenalties(new Map([["a", 1]]), hostile);
  } catch { threw = true; }
  check("storage that throws on access degrades to relearning", !threw);
}
{
  const h = harness();
  const storage = fakeStorage();
  await runBurstOrdered([h.task("measured", 20)],
    { storage, now: h.now, yieldNow: h.yieldNow });
  check("a run persists what it learned", loadPenalties(storage).get("measured") > 0);
}
{
  const h = harness();
  const storage = fakeStorage();
  await runBurstOrdered([h.task("measured", 20)],
    { storage, now: h.now, yieldNow: h.yieldNow, persist: false });
  check("persist:false leaves storage untouched", storage.data.size === 0);
}
{
  /* The claim the module header makes: ordering is already learned on arrival.
     That is only true if a previous run's penalties come back from storage. */
  const storage = fakeStorage();
  const first = harness();
  await runBurstOrdered([first.task("heavy", 40), first.task("light", 0)],
    { storage, now: first.now, yieldNow: first.yieldNow });
  const second = harness();
  await runBurstOrdered([second.task("heavy", 40), second.task("light", 0)],
    { storage, now: second.now, yieldNow: second.yieldNow });
  check("the second visit runs the cheap task first, without being told",
    second.state.order.join(",") === "light,heavy", second.state.order.join(","));
}

/* ── 9. Degenerate input ─────────────────────────────────────────────────── */
{
  const h = harness();
  let threw = false;
  try {
    await runBurstOrdered([], { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false });
    await runBurstOrdered([null, undefined, h.task("real", 0)],
      { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false });
  } catch { threw = true; }
  check("empty and holey task lists are survivable", !threw && h.state.order.join(",") === "real");
}

if (failures.length) {
  console.error(`Burst scheduler: ${count - failures.length}/${count} checks passed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`Burst scheduler: ${count}/${count} checks passed`);
