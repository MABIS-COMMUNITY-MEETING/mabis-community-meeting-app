import {
  addDays,
  addMonths,
  endOfMonth,
  format,
  getDay,
  getISOWeek,
  getYear,
  isFriday,
  nextFriday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function normalizeJobTitle(title = "") {
  return title.replace(/^Time Taker\b/i, "Time Keeper");
}

export function isTimeKeeperJob(title = "") {
  return /^Time (?:Keeper|Taker)(?:\s*\([12]\))?$/i.test(title.trim());
}

export function scheduledDaysFor(jobOrTitle) {
  if (Array.isArray(jobOrTitle?.schedule_days) && jobOrTitle.schedule_days.length > 0) {
    return WEEKDAYS.filter((day) => jobOrTitle.schedule_days.includes(day));
  }

  const title = typeof jobOrTitle === "string"
    ? jobOrTitle
    : jobOrTitle?.job_title || jobOrTitle?.label || "";
  if (title.includes("(1)")) return ["Monday", "Wednesday", "Friday"];
  if (title.includes("(2)")) return ["Tuesday", "Thursday"];
  return [...WEEKDAYS];
}

export function getMonthLabel(date = new Date()) {
  return format(date, "yyyy-MM");
}

export function monthLabelToDate(label) {
  return parseISO(`${label}-01`);
}

export function formatMonthLabel(label) {
  try {
    return format(monthLabelToDate(label), "MMMM yyyy");
  } catch {
    return label;
  }
}

export function getNextMonthLabel(label) {
  return format(addMonths(monthLabelToDate(label), 1), "yyyy-MM");
}

export function getCurrentWeekLabel(date = new Date()) {
  const friday = isFriday(date) ? date : nextFriday(date);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

export function getVisibleWeekDates(monthLabel, referenceDate = new Date()) {
  const monday = startOfWeek(referenceDate, { weekStartsOn: 1 });
  return WEEKDAYS.map((day, index) => {
    const date = addDays(monday, index);
    return {
      day,
      key: format(date, "yyyy-MM-dd"),
      shortLabel: format(date, "EEE d"),
      inMonth: getMonthLabel(date) === monthLabel,
    };
  }).filter((entry) => entry.inMonth);
}

export function getScheduledDatesForMonth(jobOrTitle, monthLabel) {
  const scheduledDays = scheduledDaysFor(jobOrTitle);
  const first = startOfMonth(monthLabelToDate(monthLabel));
  const last = endOfMonth(first);
  const dates = [];

  for (let date = first; date <= last; date = addDays(date, 1)) {
    const weekday = WEEKDAYS[(getDay(date) + 6) % 7];
    if (scheduledDays.includes(weekday)) dates.push(format(date, "yyyy-MM-dd"));
  }

  return dates;
}

export function memberRotationKey(member) {
  return String(member?.email || member?.name || "").trim().toLocaleLowerCase();
}

export function assignmentRotationKey(assignment) {
  return String(assignment?.assigned_to_email || assignment?.assigned_to_name || "").trim().toLocaleLowerCase();
}

export function assignmentYear(assignment) {
  return String(assignment?.month_label || assignment?.week_label || "").slice(0, 4);
}

export function timeKeeperKeysForYear(assignments, year) {
  return new Set(
    assignments
      .filter((assignment) => (
        isTimeKeeperJob(assignment.job_title)
        && assignmentYear(assignment) === String(year)
      ))
      .map(assignmentRotationKey)
      .filter(Boolean),
  );
}

export function assignmentBelongsToMonth(assignment, monthLabel, currentWeekLabel) {
  if (assignment?.month_label) return assignment.month_label === monthLabel;
  return assignment?.week_label === currentWeekLabel;
}
