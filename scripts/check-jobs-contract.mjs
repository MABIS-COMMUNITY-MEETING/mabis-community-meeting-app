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
  getWeekStatusKeys,
  normalizeJobTitle,
  scheduledDaysFor,
  timeKeeperKeysForYear,
} from "../src/lib/jobsRotation.js";
import { TAU, normalizeRotation, seededShuffle } from "../solid/lib/wheel-math.js";
import { buildJobListPrintHtml, containsJapanese } from "../solid/lib/job-list-pdf.js";

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
assert.deepEqual(
  getWeekStatusKeys({ assignment_period: "weekly", schedule_days: ["Tuesday", "Thursday"] }),
  ["Tuesday", "Thursday"],
);
assert.deepEqual(
  getWeekStatusKeys(
    { assignment_period: "monthly", schedule_days: ["Monday", "Wednesday", "Friday"] },
    "2026-08",
    august,
  ),
  ["2026-08-10", "2026-08-12", "2026-08-14"],
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

const originalOrder = ["A", "B", "C", "D", "E"];
const firstShuffle = seededShuffle(originalOrder, 1);
assert.deepEqual(originalOrder, ["A", "B", "C", "D", "E"]);
assert.deepEqual(seededShuffle(originalOrder, 1), firstShuffle);
assert.notDeepEqual(seededShuffle(originalOrder, 2), firstShuffle);
assert.deepEqual([...firstShuffle].sort(), [...originalOrder].sort());

const pdfHtml = buildJobListPrintHtml({
  title: "係 MABIS Jobs",
  notes: "担当者向けのメモ",
  period_label: "Week of August 17 今週",
  created_by_name: "Alex 山田",
  created_date: "2026-08-23",
  items: [
    {
      job_title: "植物 Water Plants",
      assigned_to_name: "Sam 佐藤",
      assignment_period: "weekly",
      schedule_days: ["Monday", "水曜日"],
    },
  ],
}, {
  primary: "#123456",
  primaryForeground: "#ffffff",
  secondary: "#fedcba",
  fontFamily: "'MABIS Test UI', system-ui",
});
assert.equal(containsJapanese(pdfHtml), false);
assert.match(pdfHtml, /--pdf-primary: #123456;/);
assert.match(pdfHtml, /--pdf-secondary: #fedcba;/);
assert.match(pdfHtml, /font-family: 'MABIS Test UI', system-ui;/);
assert.doesNotMatch(pdfHtml, /Prepared/);
assert.doesNotMatch(pdfHtml, /Week of August 17/);
assert.doesNotMatch(pdfHtml, />Period</);
assert.doesNotMatch(pdfHtml, /pdf-meta|pdf-period/);
assert.match(pdfHtml, /<h1>MABIS Jobs<\/h1>/);

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
const homeSource = source("solid/pages/Home.jsx");
const discussionSource = source("solid/components/DiscussionWidget.jsx");
const jobsSource = source("solid/components/JobsWidget.jsx");
const jobTablesSource = source("solid/components/jobs/tables.jsx");
const spinWheelSource = source("solid/components/jobs/SpinWheel.jsx");
const wheelSessionSource = source("solid/lib/job-wheel-session.js");
const memberSchemaSource = source("base44/entities/Member.jsonc");
const jobListSchemaSource = source("base44/entities/JobList.jsonc");
const jobListStudioSource = source("solid/components/jobs/JobListStudio.jsx");
const jobListPdfSource = source("solid/lib/job-list-pdf.js");
const docsEditorSource = source("solid/components/DocsEditor.jsx");
const announcementSource = source("solid/components/AnnouncementsWidget.jsx");

assert.match(homeSource, /createJobWheelSession\(\)/);
assert.match(homeSource, /wheelSession=\{wheelSession\}/);
assert.match(discussionSource, /wheelSession=\{props\.wheelSession\}/);
assert.match(jobsSource, /props\.wheelSession\?\.winner/);
assert.match(wheelSessionSource, /shuffleSeed:\s*createSignal\(0\)/);
assert.match(jobsSource, /props\.wheelSession\?\.shuffleSeed/);
assert.match(jobsSource, /seededShuffle\(ordered, seed\)/);
assert.match(jobsSource, /onShuffle=\{handleShuffleWheel\}/);
assert.match(spinWheelSource, /aria-label="Shuffle wheel order"/);
assert.doesNotMatch(jobsSource, /servedTimeKeeperKeys/);
assert.match(jobsSource, /selectingTimeKeeper\(\)\s*\?\s*rotationMembers\(\)/);
assert.match(jobsSource, /isTimeKeeperJob\(w\.jobLabel\) \|\| !assignedMemberKeys\(\)\.has/);
assert.match(jobsSource, /Time Keepers stay on the wheel after being picked and can be picked again/);
assert.match(memberSchemaSource, /"job_rotation_enabled"/);
assert.match(jobsSource, /base44\.entities\.Member\.update\(member\.id, \{ job_rotation_enabled: enabled \}\)/);
assert.match(jobsSource, /studentMembers\(\)\.filter\(\(m\) => m\.job_rotation_enabled !== false\)/);
assert.match(jobsSource, /data-cursor-lite/);
assert.match(jobsSource, /onDelete=\{handleRemoveAssignment\}/);
assert.match(jobsSource, /onWeekStatus=\{handleWeekStatus\}/);
assert.match(jobTablesSource, /Done for this week/);
assert.match(jobTablesSource, /props\.onWeekStatus\(props\.assignment/);
assert.doesNotMatch(jobTablesSource, /DayStatus|onDayStatus|click to cycle/);
assert.match(jobTablesSource, /props\.onDelete\(a\)/);
assert.match(jobTablesSource, /<span>Remove<\/span>/);
assert.match(jobListSchemaSource, /"name": "JobList"/);
assert.match(jobsSource, /lazy\(\(\) => import\("\~\/components\/jobs\/JobListStudio"\)\)/);
assert.match(jobListStudioSource, /base44\.entities\.JobList\.create/);
assert.match(jobListStudioSource, /const initialTitle = \(\) => "MABIS Jobs"/);
assert.equal((jobsSource.match(/Print \/ Save Schedule/g) || []).length, 2);
const publicPrintHandler = 'onClick={() => handlePdf(draftList(), "draft")}';
const publicPrintIndex = jobListStudioSource.indexOf(publicPrintHandler);
assert.ok(publicPrintIndex >= 0, "current schedule PDF action must be available");
const publicPrintButton = jobListStudioSource.slice(
  jobListStudioSource.lastIndexOf("<Button", publicPrintIndex),
  jobListStudioSource.indexOf("</Button>", publicPrintIndex),
);
assert.doesNotMatch(publicPrintButton, /isAdmin/);
assert.match(jobListStudioSource, /printJobList/);
assert.match(jobListPdfSource, /token\("--font-body"\)/);
assert.match(jobListPdfSource, /token\("--primary"\)/);
assert.match(jobListPdfSource, /englishOnly/);
assert.match(jobListPdfSource, /addEventListener\("afterprint", restoreApp/);
assert.match(jobListPdfSource, /popup\.close\(\)/);
assert.doesNotMatch(jobListPdfSource, /class="pdf-meta"|class="pdf-period"/);
assert.equal((discussionSource.match(/<MeetingMinutes\b/g) || []).length, 2);
assert.doesNotMatch(discussionSource, /MeetingNotesEditor/);
assert.match(docsEditorSource, /toggleList\("bullet"\)/);
assert.match(announcementSource, /memberForAuthor\(announcement\.author_name\)\?\.avatar_url/);
assert.doesNotMatch(announcementSource, /avatar_url:\s*auth\.user\(\)\?\.avatar_url\s*\|\|\s*author\?\.avatar_url/);

console.log("Jobs and meeting UI contract: one-click weekly completion, repeat-eligible Time Keepers, persistent job-list membership, exact assignment removal, shared wheel shuffle, saved lists, public schedule printing, simplified cancel-safe MABIS Jobs PDF export, scheduling, mirrored Home state, unlimited bounded spins, bullet formatting, and announcement avatars passed.");
