import { format, isValid, parseISO } from "date-fns";
import { getCurrentWeekLabel, weekLabelToDate } from "./jobsRotation.js";

// Date-only meeting values describe local calendar days, not UTC instants.
export function parseMeetingDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : null;
}

export function resolveMeetingDate(savedDate, today = new Date()) {
  const date = parseMeetingDate(savedDate);
  const week = getCurrentWeekLabel(today);
  return date && getCurrentWeekLabel(date) === week
    ? date
    : weekLabelToDate(week);
}

export function readSavedMeetingDate() {
  try { return localStorage.getItem("mabis_meeting_date") || ""; }
  catch { return ""; }
}
