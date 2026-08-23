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
const {
  runBurstOrdered, burstPenalty, smoothPenalty, cooperativeSliceMs,
  loadPenalties, savePenalties,
} = await import("../solid/lib/burst-scheduler.js");

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

/* ── 1. BORE 6.8.0's penalty curve ───────────────────────────────────────── */
/* The supplied kernel patch uses log2p1(ns) with offset 24 and scale 1536/1024.
   Its zero boundary is 2^23 ns; each doubling above it adds exactly 1.5 score. */
const toleranceMs = (2 ** 23) / 1_000_000;
check("burst at the kernel tolerance scores zero", burstPenalty(toleranceMs) === 0);
check("burst below the kernel tolerance scores zero", burstPenalty(toleranceMs / 2) === 0);
check("zero burst scores zero", burstPenalty(0) === 0);
check("negative burst scores zero", burstPenalty(-5) === 0);
check("NaN burst scores zero", burstPenalty(NaN) === 0);
check("Infinity burst is clamped, not NaN", burstPenalty(Infinity) === 40);
check("2^24ns scores 1.5", near(burstPenalty((2 ** 24) / 1_000_000), 1.5));
check("2^25ns scores 3.0", near(burstPenalty((2 ** 25) / 1_000_000), 3));
check("2^26ns scores 4.5", near(burstPenalty((2 ** 26) / 1_000_000), 4.5));
check("each doubling adds the same logarithmic penalty",
  near(
    burstPenalty((2 ** 26) / 1_000_000) - burstPenalty((2 ** 25) / 1_000_000),
    burstPenalty((2 ** 25) / 1_000_000) - burstPenalty((2 ** 24) / 1_000_000),
  ));
check("the penalty is clamped at the worst rank", burstPenalty(2 ** 40) === 40);
check("the penalty is monotonic", burstPenalty(10) < burstPenalty(20) && burstPenalty(20) < burstPenalty(40));

/* ── 2. binary_smooth: gradual up, instant down ──────────────────────────── */
check("a rise closes half the gap", smoothPenalty(3, 1) === 2);
check("a second rise closes half of what is left", smoothPenalty(3, 2) === 2.5);
check("a fall applies immediately", smoothPenalty(1, 3) === 1);
check("a fall to zero applies immediately", smoothPenalty(0, 9) === 0);
check("an unchanged penalty stays put", smoothPenalty(2, 2) === 2);
check("rising never overshoots the target", smoothPenalty(3, 1) < 3);
/* The reason the asymmetry is here at all: one long CPU burst should not pin
   a task at the back after a later run proves it became cheap. */
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

/* ── 5. Refresh-paced slices and wake-up protection ─────────────────────── */
check("30 Hz uses the throughput cap", near(cooperativeSliceMs(1000 / 30), 5));
check("60 Hz uses the throughput cap", near(cooperativeSliceMs(1000 / 60), 5));
check("120 Hz reserves 70% of the frame for rendering", near(cooperativeSliceMs(1000 / 120), 2.5));
check("144 Hz receives a display-relative slice", near(cooperativeSliceMs(1000 / 144), (1000 / 144) * 0.30));
check("240 Hz receives a display-relative slice", near(cooperativeSliceMs(1000 / 240), 1.25));
check("extreme refresh rates keep a 1ms scheduling floor", near(cooperativeSliceMs(1000 / 1000), 1));
check("invalid refresh evidence uses the conservative 120 Hz fallback", near(cooperativeSliceMs(NaN), 2.5));

{
  const h = harness();
  await runBurstOrdered(
    [h.task("a", 0), h.task("b", 0), h.task("c", 0)],
    {
      memory: new Map(), now: h.now, yieldNow: h.yieldNow,
      inputPending: () => true, sliceMs: 5, persist: false,
    },
  );
  check("pending input bypasses slice protection at every task boundary",
    h.state.yields === 3, `yields=${h.state.yields}`);
}

/* ── 6. Awaited time is neither CPU burst nor slice time ─────────────────── */
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
  const h = harness();
  const memory = await runBurstOrdered([h.task("slowNet", 0, 500)],
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false });
  check("time asleep or waiting on I/O never becomes BORE CPU penalty",
    memory.get("slowNet") === 0, String(memory.get("slowNet")));
}
{
  const h = harness();
  const burst = (2 ** 24) / 1_000_000;
  const memory = await runBurstOrdered([h.task("cpuThenWait", burst, 500)],
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false });
  check("penalty follows synchronous burst even when the awaited tail is much longer",
    near(memory.get("cpuThenWait"), smoothPenalty(burstPenalty(burst), 0)),
    String(memory.get("cpuThenWait")));
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

/* ── 7. BORE family inheritance ─────────────────────────────────────────── */
{
  const h = harness();
  const memory = new Map([
    ["@bore-group:editors", 6],
    ["known-cheap", 1],
  ]);
  await runBurstOrdered(
    [
      h.task("new-editor", 0, 0, { group: "editors" }),
      h.task("known-cheap", 0),
    ],
    { memory, now: h.now, yieldNow: h.yieldNow, persist: false },
  );
  check("new work inherits its BORE family history instead of escaping to the front",
    h.state.order.join(",") === "known-cheap,new-editor", h.state.order.join(","));
  check("a newly inherited task is promoted immediately after a cheap burst",
    memory.get("new-editor") === 0);
}
{
  const h = harness();
  const memory = await runBurstOrdered(
    [h.task("editor-a", 40, 0, { group: "editors" })],
    { memory: new Map(), now: h.now, yieldNow: h.yieldNow, persist: false },
  );
  check("observed family burst history is cached for future siblings",
    memory.get("@bore-group:editors") > 0);
}

/* ── 8. I/O tasks are fired, not sequenced ───────────────────────────────── */
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

/* ── 9. A warm-up may never break the page ───────────────────────────────── */
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

/* ── 10. Persistence ─────────────────────────────────────────────────────── */
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

/* ── 11. Degenerate input ────────────────────────────────────────────────── */
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
