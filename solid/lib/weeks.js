import { getISOWeek, getYear, nextFriday, isFriday, format } from "date-fns";

/*
 * Week-label helpers, ported verbatim from DiscussionWidget.
 *
 * Extracted to their own module because DiscussionWidget, History, JobsWidget,
 * LunchMenuWidget and the attendance code all derive the same "YYYY-Www"
 * Friday-anchored key. In the React build these are duplicated across files,
 * which is how they drifted (formatWeekFull exists in three places). One copy
 * here means the Solid port cannot repeat that.
 */

export function getWeekLabel(date) {
  const friday = isFriday(date) ? date : nextFriday(date);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

export function weekLabelToDate(label) {
  const [year, weekPart] = label.split("-W");
  const week = parseInt(weekPart);
  const jan4 = new Date(parseInt(year), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const result = new Date(startOfWeek1);
  result.setDate(startOfWeek1.getDate() + (week - 1) * 7 + 4);
  return result;
}

export function formatWeekLabel(label) {
  try { return format(weekLabelToDate(label), "d MMMM yyyy"); }
  catch { const [year, week] = label.split("-W"); return `Week ${week}, ${year}`; }
}

export function formatWeekFull(label) {
  try { return format(weekLabelToDate(label), "MMMM do, yyyy"); }
  catch { return formatWeekLabel(label); }
}

export function getNextWeekLabelFrom(weekLabel) {
  const d = weekLabelToDate(weekLabel);
  d.setDate(d.getDate() + 7);
  return `${getYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
}

/** Japanese rendering of a week label, for the companion text. */
export function formatWeekLabelJa(label) {
  try {
    const d = weekLabelToDate(label);
    return `${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(d)}の週`;
  } catch {
    return "";
  }
}

// Priority reads as intensity of the active theme's own colour, never a fixed red.
export const PRIORITY_COLORS = {
  1: "bg-primary text-primary-foreground",
  2: "bg-primary/80 text-primary-foreground",
  3: "bg-primary/60 text-primary-foreground",
  4: "bg-primary/35 text-foreground",
  5: "bg-primary/20 text-foreground",
};

export const PRIORITY_LABELS = { 1: "Urgent", 2: "High", 3: "Medium", 4: "Low", 5: "Minor" };
export const PRIORITY_LABELS_JA = { 1: "緊急", 2: "高", 3: "中", 4: "低", 5: "軽微" };

export const PRIORITY_DOT = {
  1: "bg-primary",
  2: "bg-primary/80",
  3: "bg-primary/60",
  4: "bg-primary/35",
  5: "bg-primary/20",
};
