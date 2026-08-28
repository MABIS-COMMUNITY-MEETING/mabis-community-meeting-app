/**
 * Frame-pacing contract (src/lib/physics/refresh-rate.js, performance-tier.js).
 *
 * These two modules decide whether a visitor keeps the glass, the cursor
 * physics and the motion, so when they are wrong the symptom is never "the
 * estimator is wrong" — it is "the site looks plain on my machine" or "it
 * stutters and the monitor says everything is fine". Neither is attributable
 * by eye, and neither fails a build. Hence the pinning.
 *
 * The bug this file exists to prevent: judging frames against a hardcoded
 * 1000/60. That constant is wrong in both directions at once.
 *
 *   - A 30 Hz panel delivers 33 ms frames and keeps perfect time. Absolute
 *     thresholds called every one of them slow and demoted the device on
 *     sight, taking effects away from hardware that was coping.
 *   - A 144 Hz panel collapsing to a stuttering 70 Hz is a 3.5x regression
 *     the user can see. Absolute thresholds never fired, because 14 ms is
 *     comfortably inside a 60 Hz budget.
 *
 * So the property under test is not "are frames fast" but "are frames late
 * FOR THIS DISPLAY", and stable-but-slow must keep its effects while
 * unstable loses them.
 *
 * Time is injected: rAF is a fake driven by a synthetic timeline, so these
 * assertions hold identically on a fast machine, a slow one, and in a
 * 1-vCPU sandbox with no display at all.
 *
 * Run: node scripts/check-frame-pacing.mjs
 */
import { readFileSync } from "node:fs";

const failures = [];
let count = 0;
function check(name, condition, detail = "") {
  count += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const src = (rel) => readFileSync(new URL(rel, import.meta.url), "utf8");

const refresh = await import("../src/lib/physics/refresh-rate.js");
const { sampleFrame, resetFrameChain, resetForTest, refreshIntervalMs, refreshHz } = refresh;

/*
 * performance-tier.js imports through the "@/" alias, which only Vite
 * resolves. Rewriting the specifier to an absolute file URL and importing the
 * result gives Node the same module graph — and because the rewritten
 * specifier resolves to the very same file URL imported above, both halves of
 * this test drive ONE estimator instance rather than two that silently
 * disagree.
 */
const tierSource = src("../src/lib/performance-tier.js");
const tierResolved = tierSource.replace(
  /(["'])@\/lib\/(.+?)\1/g,
  (_match, _quote, sub) => JSON.stringify(new URL(`../src/lib/${sub}.js`, import.meta.url).href)
);
const { monitorFrameBudget } = await import(
  `data:text/javascript;charset=utf-8,${encodeURIComponent(tierResolved)}`
);

/* A capable machine, so detectLowPowerDevice() never short-circuits the
   decision before a single frame has been measured. */
Object.defineProperty(globalThis, "navigator", {
  value: { hardwareConcurrency: 8, deviceMemory: 8 },
  configurable: true,
  writable: true,
});

const ms = (hz) => 1000 / hz;

/** Feed the estimator `n` frames whose spacing comes from `deltaFor`. */
function feed(n, deltaFor, from = 0) {
  let now = from;
  for (let i = 0; i < n; i++) {
    now += deltaFor(i);
    sampleFrame(now);
  }
  return now;
}

/**
 * Run monitorFrameBudget against a synthetic display until it decides.
 * Returns true if the device was demoted to the lite tier.
 */
function judge(deltaFor, limitMs = 8000) {
  resetForTest();
  let pending = null;
  globalThis.requestAnimationFrame = (fn) => { pending = fn; return 1; };
  globalThis.cancelAnimationFrame = () => { pending = null; };

  let demoted = false;
  const stop = monitorFrameBudget(() => { demoted = true; });

  let now = 0;
  let i = 0;
  while (pending && now < limitMs) {
    const fn = pending;
    pending = null;
    now += deltaFor(i++);
    fn(now);
  }
  stop();
  return demoted;
}

/* ── 1. The estimate tracks the panel, at every rate anyone ships ────────── */
/* 2 kHz and 10 kHz are deliberately beyond current display hardware. They
   prove the estimator is refresh-independent instead of merely raising an old
   ceiling from 240 Hz to another finite guess. */
for (const hz of [30, 60, 75, 90, 120, 144, 165, 240, 360, 480, 1000, 2000, 10000]) {
  resetForTest();
  feed(40, () => ms(hz));
  const got = refreshIntervalMs();
  check(`${hz} Hz panel is measured as ${hz} Hz`,
    Math.abs(got - ms(hz)) < ms(hz) * 0.05, `got ${got.toFixed(3)}ms`);
}

/* ── 2. The jank tail must not drag the estimate ─────────────────────────── */
/* This is the whole reason the estimator takes a low percentile. If a mean or
   a median were used, the worse the page ran the higher the "budget" would
   drift, and the metric would excuse exactly the stutter it exists to catch. */
{
  resetForTest();
  feed(80, (i) => (i % 5 === 0 ? 45 : ms(60)));
  const got = refreshIntervalMs();
  check("a 20% tail of 45ms frames does not inflate a 60 Hz estimate",
    Math.abs(got - ms(60)) < 1, `got ${got.toFixed(3)}ms`);
}

/* ── 3. Stalls are not refreshes ─────────────────────────────────────────── */
{
  resetForTest();
  feed(40, () => ms(120));
  const before = refreshIntervalMs();
  sampleFrame(100000);          // a tab-switch-sized gap
  sampleFrame(100000 + ms(120));
  check("a 100s gap is discarded rather than recorded as a frame",
    Math.abs(refreshIntervalMs() - before) < 0.01);

  resetForTest();
  feed(40, () => ms(60));
  const paced = refreshIntervalMs();
  resetFrameChain();
  sampleFrame(500000);          // first frame after a park
  sampleFrame(500000 + ms(60));
  check("resetFrameChain stops a parked loop from manufacturing one huge delta",
    Math.abs(refreshIntervalMs() - paced) < 0.01);
}

/* ── 4. Unmeasured falls back, measured does not ─────────────────────────── */
{
  resetForTest();
  check("an unmeasured display falls back to 60 Hz", Math.abs(refreshIntervalMs() - ms(60)) < 1e-9);
  feed(4, () => ms(144));
  check("four frames is not enough evidence to leave the fallback",
    Math.abs(refreshIntervalMs() - ms(60)) < 1e-9);
  feed(40, () => ms(144));
  check("forty frames is", Math.abs(refreshIntervalMs() - ms(144)) < 0.5);
  check("refreshHz agrees with refreshIntervalMs", Math.abs(refreshHz() - 144) < 5,
    `got ${refreshHz().toFixed(1)}Hz`);
}

/* ── 5. Steady panels keep their effects, at every rate ──────────────────── */
/* The 30 Hz row is the regression. Under the old absolute thresholds this
   device was demoted before it had drawn a second of content. */
for (const hz of [30, 50, 60, 75, 120, 144, 240, 360]) {
  check(`a steady ${hz} Hz display is not demoted`, judge(() => ms(hz)) === false);
}

/* ── 6. Small jitter is not jank ─────────────────────────────────────────── */
/* Variable-refresh panels and ordinary timer noise both wobble a little. A
   monitor that demotes on this would demote everyone. */
{
  const wobble = (i) => ms(60) + ((i % 7) - 3) * 0.4;
  check("sub-millisecond jitter around the refresh is tolerated", judge(wobble) === false);
}

/* ── 7. Genuine instability is caught, on displays no constant anticipates ─ */
{
  check("a 144 Hz panel alternating one and three refreshes is demoted",
    judge((i) => (i % 2 ? ms(144) : ms(144) * 3)) === true);

  check("a 60 Hz panel dropping one frame in four is demoted",
    judge((i) => (i % 4 === 3 ? ms(60) * 2 : ms(60))) === true);

  check("a 240 Hz panel stuttering to a third of its rate is demoted",
    judge((i) => (i % 3 ? ms(240) : ms(240) * 4)) === true);

  /* The false-negative half of the original bug: every one of these frames is
     under the old 25ms "slow frame" threshold, so the old monitor saw a
     perfectly healthy machine while the display missed most of its vsyncs. */
  check("a 144 Hz panel stuttering at ~70 Hz is demoted despite every frame being under 25ms",
    judge((i) => (i % 2 ? ms(144) : ms(144) * 2)) === true);
}

/* ── 8. A rare hiccup is not a verdict ───────────────────────────────────── */
{
  check("one dropped frame per second does not cost a device its effects",
    judge((i) => (i % 60 === 0 ? ms(60) * 2 : ms(60))) === false);
}

/* ── 9. The constants are gone from the source, not just from the behaviour ─ */
/* Behavioural tests above would still pass if someone reintroduced a 60 Hz
   constant alongside the measurement, so the source is pinned too. */
{
  const tier = tierSource;
  const monitor = src("../solid/lib/perf-monitor.js");
  const scheduler = src("../src/lib/physics/scheduler.js");
  const burstScheduler = src("../solid/lib/burst-scheduler.js");
  const ritual = src("../solid/components/home/ScrollScaleRitual.jsx");
  const primitives = src("../solid/components/primitives.jsx");
  const splash = src("../solid/pages/Splash.jsx");
  const wheel = src("../solid/components/jobs/SpinWheel.jsx");

  check("performance-tier judges against the measured interval",
    /refreshIntervalMs\(\)/.test(tier));
  check("performance-tier holds no 60 Hz frame budget",
    !/1000\s*\/\s*60/.test(tier));
  check("performance-tier no longer counts a fixed number of frames",
    !/frames\s*>=\s*90/.test(tier));
  check("perf-monitor prices dropped frames against the measured interval",
    /refreshIntervalMs\(\)/.test(monitor));
  check("perf-monitor holds no 60 Hz frame budget",
    !/1000\s*\/\s*60/.test(monitor));
  check("perf-monitor reports the pacing distribution, not just an average",
    /p95Ms/.test(monitor) && /p99Ms/.test(monitor) && /jitterMs/.test(monitor));
  check("the physics loop feeds the estimator, so nothing needs a loop of its own",
    /sampleFrame\(now\)/.test(scheduler));
  check("the physics loop breaks the chain when it parks",
    /resetFrameChain\(\)/.test(scheduler));
  check("one wake never forces already-settled subscribers to animate",
    !/firstWakeFrame|runAll/.test(scheduler)
      && /if \(initial \|\| !s\.settled \|\| !s\.settled\(\)\)/.test(scheduler));
  check("the refresh estimator has no minimum interval / maximum Hz cap",
    !/MIN_INTERVAL_MS/.test(src("../src/lib/physics/refresh-rate.js")));
  check("refresh-estimator work is throttled by time rather than frame count",
    /RECOMPUTE_INTERVAL_MS/.test(src("../src/lib/physics/refresh-rate.js"))
      && !/RECOMPUTE_EVERY/.test(src("../src/lib/physics/refresh-rate.js")));
  check("cooperative warm-up slices have no high-refresh floor",
    !/MIN_SLICE_MS/.test(burstScheduler));
  /* The ritual has no spring to pace. It is static by decision — see
     "Scrolling belongs to the browser" in README.md and the forbid rules in
     check-performance-contract.mjs. This assertion required the scroll-driven
     animation those rules exist to prevent, so it asserted the opposite of the
     contract and kept the gate green while the two disagreed. What is checked
     now is that it stays static. */
  check("the voice-words ritual runs no scroll-driven animation",
    !/render:\s*\(alpha\)/.test(ritual) && !/integrateSpring/.test(ritual),
    "a fixed-step spring is back in ScrollScaleRitual; it must stay static");
  check("magnetic controls interpolate fixed steps at the presentation rate",
    /render:\s*\(alpha\)/.test(primitives) && /previousX/.test(primitives));
  check("splash parallax interpolates fixed steps at the presentation rate",
    /render:\s*\(alpha\)/.test(splash) && /previousX/.test(splash));
  check("the wheel paints its detailed face once and spins with a compositor transform",
    /const drawWheelFace/.test(wheel)
      && /const animate[\s\S]*paintRotation\(rotation\)/.test(wheel)
      && !/const animate[\s\S]*drawWheel\(rotation\)/.test(wheel));
}

if (failures.length) {
  console.error(`\nFrame pacing: ${count - failures.length}/${count} checks passed`);
  for (const failure of failures) console.error(`  - ${failure}`);
  process.exit(1);
}
console.log(`\nFrame pacing: ${count}/${count} checks passed`);
console.log("\nPacing is refresh-independent: steady displays keep their effects, stuttering ones yield, and presentation stays interpolated with no maximum-Hz constant.\n");
