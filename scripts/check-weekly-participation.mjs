import assert from "node:assert/strict";
import { createRoot } from "solid-js";
import { format } from "date-fns";
import { participatesInJobs, jobParticipationUpdate } from "../src/lib/job-participation.js";
import { parseMeetingDate, resolveMeetingDate } from "../src/lib/meeting-date.js";
import { getCurrentWeekLabel, getNextWeekLabel } from "../src/lib/jobsRotation.js";
import { getWeekLabel, weekLabelToDate } from "../solid/lib/weeks.js";
import { createMeetingModeSession } from "../solid/lib/meeting-mode-session.js";

const thursday = new Date(2026, 8, 17, 12);
const friday = new Date(2026, 8, 18, 12);
const nextSaturday = new Date(2026, 8, 19, 12);
const week = getWeekLabel(thursday);
const student = { id: "test-student", role: "student", name: "Test Student" };
const excluded = { ...student, ...jobParticipationUpdate(false, week) };
assert.equal(participatesInJobs(student, week), true);
assert.equal(participatesInJobs(excluded, week), false, "remove excludes this week");
assert.equal(participatesInJobs(JSON.parse(JSON.stringify(excluded)), week), false, "reload retains exclusion");
assert.equal(participatesInJobs(excluded, getWeekLabel(nextSaturday)), false, "a removed student stays removed across weeks until re-added");
assert.equal(participatesInJobs({ ...excluded, ...jobParticipationUpdate(true, week) }, week), true, "Add restores immediately");
assert.equal(participatesInJobs({ ...student, job_rotation_enabled: false }, week), false, "undated legacy opt-outs are not silently erased");
assert.deepEqual([excluded].filter((m) => participatesInJobs(m, week)), [], "last removal must leave an empty wheel");

const dateKey = (date) => format(date, "yyyy-MM-dd");
assert.equal(dateKey(parseMeetingDate("2026-09-17")), "2026-09-17", "date-only values must remain local days");
assert.equal(parseMeetingDate("2026-02-30"), null);
assert.equal(parseMeetingDate("bad"), null);
assert.equal(parseMeetingDate("2026-09-17T00:00:00Z"), null);
assert.equal(dateKey(resolveMeetingDate("2026-08-13", thursday)), "2026-09-18", "stale stored meeting dates expire");
assert.equal(dateKey(resolveMeetingDate("bad", thursday)), "2026-09-18");
assert.equal(dateKey(resolveMeetingDate("2026-09-17", friday)), "2026-09-17", "same-week unlocked date remains valid");
assert.equal(dateKey(resolveMeetingDate("2026-09-17", nextSaturday)), "2026-09-25");
for (const date of [new Date(2026, 11, 31), new Date(2027, 0, 1)]) {
  assert.equal(getWeekLabel(date), "2026-W53");
  assert.equal(getCurrentWeekLabel(date), "2026-W53");
  assert.equal(dateKey(weekLabelToDate(getWeekLabel(date))), "2027-01-01");
}
assert.equal(getNextWeekLabel("2026-W53"), "2027-W01");

createRoot((dispose) => {
  let now = thursday;
  const session = createMeetingModeSession("idle", () => now);
  assert.equal(session.start("2026-09-17"), true);
  assert.equal(dateKey(session.date()), "2026-09-17");
  assert.equal(session.weekLabel(), week);
  assert.equal(session.start("2026-09-18"), false);
  assert.equal(dateKey(session.date()), "2026-09-17", "double start cannot replace the active date");
  session.pause();
  now = nextSaturday;
  session.start("2026-09-25");
  assert.equal(session.weekLabel(), week, "resume pins the original meeting and document week");
  session.end();
  assert.equal(session.weekLabel(), week, "end archives the session week, not today's week");
  session.clear();
  session.start();
  assert.equal(dateKey(session.date()), "2026-09-25", "a new session uses the new week");
  dispose();
});
console.log("Weekly participation and meeting date lifecycle passed in " + (process.env.TZ || "system timezone"));