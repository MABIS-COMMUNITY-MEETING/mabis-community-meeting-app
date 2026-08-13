let progress = 0;
let rafId = 0;
let listening = false;
const subscribers = new Set();

function readProgress() {
  const root = document.documentElement;
  const max = Math.max(1, root.scrollHeight - window.innerHeight);
  return Math.min(1, Math.max(0, window.scrollY / max));
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

function start() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  progress = readProgress();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", schedule, { passive: true });
  document.addEventListener("visibilitychange", schedule);
}

function stop() {
  if (!listening || subscribers.size > 0) return;
  listening = false;
  window.removeEventListener("scroll", schedule);
  window.removeEventListener("resize", schedule);
  document.removeEventListener("visibilitychange", schedule);
  if (rafId) window.cancelAnimationFrame(rafId);
  rafId = 0;
}

/**
 * One passive, requestAnimationFrame-throttled scroll signal shared by decorative
 * progress UI. Subscribers write directly to isolated DOM nodes, avoiding a
 * React render for every scroll frame.
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
