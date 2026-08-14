import assert from "node:assert/strict";
import {
  assignmentIsCurrent,
  formatMonthLabel,
  getCurrentWeekLabel,
  getMonthLabel,
  getNextMonthLabel,
  getScheduledDatesForMonth,
  getVisibleWeekDates,
  normalizeJobTitle,
  scheduledDaysFor,
  timeKeeperKeysForYear,
} from "../src/lib/jobsRotation.js";

const august = new Date(2026, 7, 14, 12);
assert.equal(getMonthLabel(august), "2026-08");
assert.equal(formatMonthLabel("2026-08"), "August 2026");
assert.equal(getNextMonthLabel("2026-12"), "2027-01");
assert.equal(getCurrentWeekLabel(august), "2026-W33");

assert.deepEqual(scheduledDaysFor("Time Keeper (1)"), ["Monday", "Wednesday", "Friday"]);
assert.deepEqual(scheduledDaysFor({ schedule_days: ["Tuesday", "Thursday"] }), ["Tuesday", "Thursday"]);
assert.equal(getScheduledDatesForMonth("Time Keeper (1)", "2026-08").length, 13);
assert.equal(getScheduledDatesForMonth("Time Keeper (2)", "2026-08").length, 8);
assert.deepEqual(
  getVisibleWeekDates("2026-08", august).map((entry) => entry.key),
  ["2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14"],
);

const served = timeKeeperKeysForYear([
  { job_title: "Time Taker (1)", assigned_to_email: "a@example.com", week_label: "2026-W02" },
  { job_title: "Time Keeper (2)", assigned_to_email: "b@example.com", month_label: "2025-12" },
  { job_title: "Water Plants (1)", assigned_to_email: "c@example.com", month_label: "2026-08" },
], "2026");
assert.deepEqual([...served], ["a@example.com"]);
assert.equal(normalizeJobTitle("Time Taker (2)"), "Time Keeper (2)");
assert.equal(assignmentIsCurrent({ job_title: "Water Plants (1)", week_label: "2026-W33" }, "2026-W33", "2026-08"), true);
assert.equal(assignmentIsCurrent({ job_title: "Time Keeper (1)", month_label: "2026-08" }, "2026-W33", "2026-08"), true);
assert.equal(assignmentIsCurrent({ job_title: "Time Taker (2)", week_label: "2026-W33" }, "2026-W33", "2026-08"), true);
assert.equal(assignmentIsCurrent({ job_title: "Clean Lounge (1)", week_label: "2026-W32" }, "2026-W33", "2026-08"), false);

console.log("Jobs contract: weekly defaults, configurable periods, monthly Time Keepers, dated tracking, legacy compatibility, and annual exclusion passed.");
