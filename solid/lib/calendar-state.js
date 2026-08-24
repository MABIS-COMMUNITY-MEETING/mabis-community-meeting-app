import { createSignal } from "solid-js";

const STORAGE_KEY = "mabis-calendar-state";
const VALID_VIEWS = new Set(["Day", "Month", "Year", "Week"]);

function defaultView() {
  return typeof window !== "undefined"
    && typeof window.matchMedia === "function"
    && window.matchMedia("(max-width: 639px)").matches
    ? "Day"
    : "Month";
}

function readStoredState() {
  const fallback = { date: new Date(), view: defaultView() };
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
    const date = /^\d{4}-\d{2}-\d{2}$/.test(stored?.date || "")
      ? new Date(`${stored.date}T12:00:00`)
      : fallback.date;
    return {
      date: Number.isNaN(date.getTime()) ? fallback.date : date,
      view: VALID_VIEWS.has(stored?.view) ? stored.view : fallback.view,
    };
  } catch {
    return fallback;
  }
}

const initial = readStoredState();
const [viewDate, setViewDateSignal] = createSignal(initial.date);
const [view, setViewSignal] = createSignal(initial.view);

function persist(date = viewDate(), selectedView = view()) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      date: [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0"),
      ].join("-"),
      view: selectedView,
    }));
  } catch {
    // Storage can be unavailable in privacy mode; module state still syncs layouts.
  }
}

function setViewDate(next) {
  const date = typeof next === "function" ? next(viewDate()) : next;
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return;
  setViewDateSignal(date);
  persist(date, view());
}

function setView(next) {
  const selectedView = typeof next === "function" ? next(view()) : next;
  if (!VALID_VIEWS.has(selectedView)) return;
  setViewSignal(selectedView);
  persist(viewDate(), selectedView);
}

/*
 * Summer and Boss mount the same CalendarWidget through different Home shells.
 * These module-level signals are the one shared navigation state, so changing
 * layout never resets the visible month or view. Storage keeps that exact state
 * across reloads as well.
 */
export function useSharedCalendarState() {
  return { viewDate, setViewDate, view, setView };
}
