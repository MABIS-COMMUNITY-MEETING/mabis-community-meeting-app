import { format, isValid, parseISO } from "date-fns";
import { getCurrentWeekLabel, weekLabelToDate } from "./jobsRotation.js";

// Date-only meeting values describe local calendar days, not UTC instants.
export function parseMeetingDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = parseISO(value);
  return isValid(date) && format(date, "yyyy-MM-dd") === value ? date : null;
}

/**
 * A chosen meeting date is honoured only while it still belongs to the current
 * meeting week; otherwise that week's own Friday wins.
 *
 * This is the whole rule, and it takes a Date rather than a string so it can be
 * re-applied to a date the app is already holding. That matters: the meeting
 * date used to be resolved exactly once, when Meeting Mode started, and never
 * looked at again. A meeting left open or paused across a week boundary kept
 * the date it opened with, so the header went on announcing a day from weeks
 * earlier — the clock advanced underneath a value that nothing re-checked.
 */
export function meetingDateForWeek(date, today = new Date()) {
  const week = getCurrentWeekLabel(today);
  return date && getCurrentWeekLabel(date) === week ? date : weekLabelToDate(week);
}

export function resolveMeetingDate(savedDate, today = new Date()) {
  return meetingDateForWeek(parseMeetingDate(savedDate), today);
}

/**
 * The saved custom date, and only while it is still this week's.
 *
 * Self-cleaning on purpose. resolveMeetingDate already refuses a stale value,
 * so a wrong date could not reach the meeting header through it — but the raw
 * string was also read straight into the date picker, which then went on
 * offering a day from a previous month indefinitely, because nothing ever
 * cleared the key. Dropping it on read fixes the picker, and means one expired
 * meeting date cannot haunt a browser forever.
 */
export function readSavedMeetingDate(today = new Date()) {
  try {
    const saved = localStorage.getItem("mabis_meeting_date") || "";
    const parsed = parseMeetingDate(saved);
    if (parsed && getCurrentWeekLabel(parsed) === getCurrentWeekLabel(today)) return saved;
    if (saved) localStorage.removeItem("mabis_meeting_date");
    return "";
  } catch {
    return "";
  }
}
