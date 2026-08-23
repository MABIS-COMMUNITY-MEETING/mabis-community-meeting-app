import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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
import { TAU, normalizeRotation } from "../solid/lib/wheel-math.js";

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

// A completed spin normalizes its angle, so repeated spins never accumulate a
// huge floating-point value. Exercise far more spins than a real meeting will.
let rotation = 0;
for (let i = 0; i < 250_000; i += 1) {
  rotation = normalizeRotation(rotation + TAU * (5 + (i % 300) / 100));
  assert.ok(rotation >= 0 && rotation < TAU);
}

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const homeSource = source("solid/pages/Home.jsx");
const discussionSource = source("solid/components/DiscussionWidget.jsx");
const jobsSource = source("solid/components/JobsWidget.jsx");
const jobTablesSource = source("solid/components/jobs/tables.jsx");
const spinWheelSource = source("solid/components/jobs/SpinWheel.jsx");
const wheelSessionSource = source("solid/lib/job-wheel-session.js");
const memberSchemaSource = source("base44/entities/Member.jsonc");
const docsEditorSource = source("solid/components/DocsEditor.jsx");
const announcementSource = source("solid/components/AnnouncementsWidget.jsx");

assert.match(homeSource, /createJobWheelSession\(\)/);
assert.match(homeSource, /wheelSession=\{wheelSession\}/);
assert.match(discussionSource, /wheelSession=\{props\.wheelSession\}/);
assert.match(jobsSource, /props\.wheelSession\?\.winner/);
assert.match(wheelSessionSource, /shuffleSeed:\s*createSignal\(0\)/);
assert.match(jobsSource, /props\.wheelSession\?\.shuffleSeed/);
assert.match(jobsSource, /function shuffledMembers\(list, seed\)/);
assert.match(jobsSource, /onShuffle=\{handleShuffleWheel\}/);
assert.match(spinWheelSource, /aria-label="Shuffle wheel order"/);
assert.match(memberSchemaSource, /"job_rotation_enabled"/);
assert.match(jobsSource, /base44\.entities\.Member\.update\(member\.id, \{ job_rotation_enabled: enabled \}\)/);
assert.match(jobsSource, /studentMembers\(\)\.filter\(\(m\) => m\.job_rotation_enabled !== false\)/);
assert.match(jobsSource, /data-cursor-lite/);
assert.match(jobsSource, /onDelete=\{handleRemoveAssignment\}/);
assert.match(jobTablesSource, /props\.onDelete\(a\)/);
assert.match(jobTablesSource, /<span>Remove<\/span>/);
assert.equal((discussionSource.match(/<MeetingMinutes\b/g) || []).length, 2);
assert.doesNotMatch(discussionSource, /MeetingNotesEditor/);
assert.match(docsEditorSource, /toggleList\("bullet"\)/);
assert.match(announcementSource, /memberForAuthor\(announcement\.author_name\)\?\.avatar_url/);
assert.doesNotMatch(announcementSource, /avatar_url:\s*auth\.user\(\)\?\.avatar_url\s*\|\|\s*author\?\.avatar_url/);

console.log("Jobs and meeting UI contract: persistent job-list membership, exact assignment removal, shared wheel shuffle, scheduling, mirrored Home state, unlimited bounded spins, bullet formatting, and announcement avatars passed.");
