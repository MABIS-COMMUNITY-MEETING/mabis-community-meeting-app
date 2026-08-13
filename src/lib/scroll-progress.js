let progress = 0;
let maxScroll = 1;
let rafId = 0;
let scrollEndTimer = 0;
let listening = false;
let scrolling = false;
let metricsDirty = true;
let resizeObserver = null;
const subscribers = new Set();

function updateMetrics() {
  const root = document.documentElement;
  maxScroll = Math.max(1, root.scrollHeight - window.innerHeight);
  metricsDirty = false;
}

function readProgress() {
  if (metricsDirty) updateMetrics();
  return Math.min(1, Math.max(0, window.scrollY / maxScroll));
}

function setScrolling(active) {
  if (scrolling === active) return;
  scrolling = active;
  document.documentElement.classList.toggle("is-scrolling", active);
}

function endScrolling() {
  if (scrollEndTimer) window.clearTimeout(scrollEndTimer);
  scrollEndTimer = 0;
  setScrolling(false);
}

function markScrolling() {
  setScrolling(true);
  if (scrollEndTimer) window.clearTimeout(scrollEndTimer);
  scrollEndTimer = window.setTimeout(endScrolling, 120);
}

function publish() {
  rafId = 0;
  const next = readProgress();
  if (Math.abs(next - progress) < 0.0001) return;
  progress = next;
  subscribers.forEach((subscriber) => subscriber(progress));
}

function schedule() {
  if (rafId || document.hidden) return;
  rafId = window.requestAnimationFrame(publish);
}

function onScroll() {
  markScrolling();
  schedule();
}

function scheduleMetrics() {
  metricsDirty = true;
  schedule();
}

function onVisibilityChange() {
  if (document.hidden) endScrolling();
  else scheduleMetrics();
}

function start() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  updateMetrics();
  progress = readProgress();

  window.addEventListener("scroll", onScroll, { passive: true });
  window.addEventListener("resize", scheduleMetrics, { passive: true });
  document.addEventListener("visibilitychange", onVisibilityChange);
  if ("onscrollend" in window) {
    window.addEventListener("scrollend", endScrolling, { passive: true });
  }
  if ("ResizeObserver" in window && document.body) {
    resizeObserver = new ResizeObserver(scheduleMetrics);
    resizeObserver.observe(document.body);
  }
}

function stop() {
  if (!listening || subscribers.size > 0) return;
  listening = false;
  window.removeEventListener("scroll", onScroll);
  window.removeEventListener("resize", scheduleMetrics);
  document.removeEventListener("visibilitychange", onVisibilityChange);
  if ("onscrollend" in window) window.removeEventListener("scrollend", endScrolling);
  resizeObserver?.disconnect();
  resizeObserver = null;
  endScrolling();
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = 0;
}

/**
 * One passive scroll signal drives isolated progress transforms and the
 * short-lived active-scroll fast path. Document height is cached between
 * ResizeObserver notifications, so scroll frames never force layout.
 */
export function subscribeScrollProgress(subscriber) {
  subscribers.add(subscriber);
  start();
  subscriber(progress);
  return () => {
    subscribers.delete(subscriber);
    stop();
  };
}
