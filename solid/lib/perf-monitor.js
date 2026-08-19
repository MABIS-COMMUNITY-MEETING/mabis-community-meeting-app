/*
 * Field performance monitor.
 *
 * Local profiling tells you how the site runs on YOUR machine. This tells you
 * how it runs on the machine that is actually struggling — which is the only
 * measurement that matters for "must be smooth on a slow PC".
 *
 * It is opt-in and self-disabling: nothing is observed unless the page is
 * loaded with ?perf=1 (or localStorage mabis-perf=1), so the monitor can never
 * become the thing that costs performance.
 *
 * WHAT IT WATCHES, and why each one:
 *
 *   long-animation-frame (LoAF)  — the important one. A "long task" only tells
 *     you the main thread was busy; a LoAF tells you the browser missed a
 *     frame AND attributes it: which script, and how much went to style vs
 *     layout vs paint. That distinction is the difference between "our JS is
 *     slow" and "our CSS is forcing relayout". Chrome 123+.
 *   event / INP                  — worst interaction latency. This is what a
 *     user means by "it feels laggy".
 *   longtask                     — fallback attribution for non-Chromium.
 *   dropped frames               — rAF delta vs the display's frame budget,
 *     sampled only while scrolling, which is where smoothness is judged.
 *   layout-shift                 — CLS, catches content jumping during lazy
 *     mount (the classic content-visibility regression).
 *
 * Read results at any time with:  __perf.report()
 */

const FLAG = "mabis-perf";

export function perfEnabled() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(location.search).has("perf")) {
      localStorage.setItem(FLAG, "1");
      return true;
    }
    return localStorage.getItem(FLAG) === "1";
  } catch {
    return false;
  }
}

export function startPerfMonitor() {
  if (!perfEnabled()) return () => {};

  const state = {
    device: deviceProfile(),
    loaf: [],
    longTasks: [],
    inp: 0,
    inpTarget: "",
    cls: 0,
    lcp: 0,
    frames: { sampled: 0, dropped: 0, worstMs: 0 },
  };

  const observers = [];
  const observe = (type, cb, extra = {}) => {
    try {
      const po = new PerformanceObserver((list) => cb(list.getEntries()));
      po.observe({ type, buffered: true, ...extra });
      observers.push(po);
      return true;
    } catch {
      return false; // unsupported entry type in this browser
    }
  };

  // ── Long Animation Frames: the attributed jank signal ────────────────────
  const hasLoAF = observe("long-animation-frame", (entries) => {
    for (const e of entries) {
      const scripts = (e.scripts || []).map((s) => ({
        source: s.sourceURL ? s.sourceURL.split("/").pop() : s.name,
        invoker: s.invoker,
        durationMs: Math.round(s.duration),
      }));
      state.loaf.push({
        durationMs: Math.round(e.duration),
        blockingMs: Math.round(e.blockingDuration),
        // renderStart→end is style+layout+paint; a big number here with small
        // script time means the CSS is the problem, not the JS.
        renderMs: Math.round(Math.max(0, e.startTime + e.duration - e.renderStart)),
        styleAndLayoutMs: Math.round(Math.max(0, e.startTime + e.duration - e.styleAndLayoutStart)),
        scripts,
      });
      if (state.loaf.length > 60) state.loaf.shift();
    }
  });

  if (!hasLoAF) {
    observe("longtask", (entries) => {
      for (const e of entries) {
        state.longTasks.push({ durationMs: Math.round(e.duration), attribution: e.attribution?.[0]?.name });
        if (state.longTasks.length > 60) state.longTasks.shift();
      }
    });
  }

  // ── INP ─────────────────────────────────────────────────────────────────
  observe("event", (entries) => {
    for (const e of entries) {
      const latency = e.processingEnd - e.startTime;
      if (latency > state.inp) {
        state.inp = Math.round(latency);
        state.inpTarget = e.name;
      }
    }
  }, { durationThreshold: 40 });

  observe("layout-shift", (entries) => {
    for (const e of entries) if (!e.hadRecentInput) state.cls += e.value;
  });

  observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) state.lcp = Math.round(last.startTime);
  });

  // ── Dropped frames, sampled only during scroll ──────────────────────────
  // Running a rAF loop permanently would itself keep the CPU awake, so it is
  // armed by scroll and parks 200ms after the gesture ends.
  let rafId = 0;
  let last = 0;
  let idle = 0;
  const budget = 1000 / 60;

  const tick = (now) => {
    if (last) {
      const delta = now - last;
      state.frames.sampled++;
      if (delta > budget * 1.5) state.frames.dropped++;
      if (delta > state.frames.worstMs) state.frames.worstMs = Math.round(delta);
    }
    last = now;
    rafId = requestAnimationFrame(tick);
  };

  const onScroll = () => {
    if (!rafId) { last = 0; rafId = requestAnimationFrame(tick); }
    clearTimeout(idle);
    idle = setTimeout(() => { cancelAnimationFrame(rafId); rafId = 0; }, 200);
  };
  window.addEventListener("scroll", onScroll, { passive: true });

  window.__perf = {
    raw: state,
    report: () => report(state),
    reset: () => { state.loaf.length = 0; state.longTasks.length = 0; state.inp = 0; state.frames = { sampled: 0, dropped: 0, worstMs: 0 }; },
    off: () => { try { localStorage.removeItem(FLAG); } catch {} },
  };

  // One automatic summary once the page has settled.
  setTimeout(() => report(state), 6000);

  return () => {
    observers.forEach((o) => o.disconnect());
    window.removeEventListener("scroll", onScroll);
    cancelAnimationFrame(rafId);
    clearTimeout(idle);
  };
}

function deviceProfile() {
  const c = navigator.connection || {};
  return {
    cores: navigator.hardwareConcurrency ?? "unknown",
    memoryGB: navigator.deviceMemory ?? "unknown",
    network: c.effectiveType ?? "unknown",
    saveData: !!c.saveData,
    dpr: window.devicePixelRatio,
    reducedMotion: window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  };
}

function report(state) {
  const f = state.frames;
  const dropPct = f.sampled ? ((f.dropped / f.sampled) * 100).toFixed(1) : "0.0";

  console.groupCollapsed(
    `%cMABIS perf%c  INP ${state.inp}ms · dropped ${dropPct}% · worst frame ${f.worstMs}ms`,
    "background:#951E3A;color:#fff;padding:2px 6px;border-radius:3px",
    "color:inherit"
  );

  console.table(state.device);
  console.log(`LCP ${state.lcp}ms · CLS ${state.cls.toFixed(3)} · INP ${state.inp}ms (${state.inpTarget || "n/a"})`);
  console.log(`Frames sampled during scroll: ${f.sampled}, dropped: ${f.dropped} (${dropPct}%), worst: ${f.worstMs}ms`);

  if (state.loaf.length) {
    const worst = [...state.loaf].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8);
    console.log("%cWorst long animation frames (cause attribution)", "font-weight:bold");
    console.table(worst.map((l) => ({
      frameMs: l.durationMs,
      blockingMs: l.blockingMs,
      styleAndLayoutMs: l.styleAndLayoutMs,
      topScript: l.scripts[0]?.source ?? "—",
      scriptMs: l.scripts[0]?.durationMs ?? 0,
    })));
    console.log("Read it this way: high styleAndLayoutMs with low scriptMs means CSS/layout is the cost, not JS.");
  } else if (state.longTasks.length) {
    console.log("Long tasks (LoAF unavailable in this browser):");
    console.table([...state.longTasks].sort((a, b) => b.durationMs - a.durationMs).slice(0, 8));
  } else {
    console.log("No long frames recorded — nothing blocked rendering long enough to measure.");
  }

  console.log("Commands: __perf.report() · __perf.reset() · __perf.off()");
  console.groupEnd();
}
