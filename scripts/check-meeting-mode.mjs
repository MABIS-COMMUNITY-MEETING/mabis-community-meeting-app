import assert from "node:assert/strict";
import fs from "node:fs";

const sessionSource = fs.readFileSync("solid/lib/meeting-mode-session.js", "utf8");
const homeSource = fs.readFileSync("solid/pages/Home.jsx", "utf8");
const lazySource = fs.readFileSync("solid/components/home/LazySection.jsx", "utf8");
const meetingCardSource = fs.readFileSync("solid/components/MeetingModeWidget.jsx", "utf8");
const discussionSource = fs.readFileSync("solid/components/DiscussionWidget.jsx", "utf8");
const minutesSource = fs.readFileSync("solid/components/MeetingMinutes.jsx", "utf8");
const docsEditorSource = fs.readFileSync("solid/components/DocsEditor.jsx", "utf8");
const { createRoot, createSignal } = await import("solid-js");
const { createMeetingModeSession } = await import("../solid/lib/meeting-mode-session.js");
const { meetingDateForWeek, resolveMeetingDate } = await import("../src/lib/meeting-date.js");
const { getCurrentWeekLabel } = await import("../src/lib/jobsRotation.js");
const { format } = await import("date-fns");

createRoot((dispose) => {
  const session = createMeetingModeSession();
  assert.equal(session.start(), true, "first start must open Meeting Mode");
  assert.equal(session.start(), false, "repeat start must be ignored");
  assert.equal(session.isActive(), true);
  assert.equal(session.pause(), true);
  assert.equal(session.pause(), false, "repeat pause must be ignored");
  assert.equal(session.start(), true, "paused meetings must resume");
  assert.equal(session.end(), true);
  assert.equal(session.end(), false, "repeat end must be ignored");
  dispose();
});

/*
 * The meeting date must follow the calendar, not the moment the meeting opened.
 *
 * The header showed "Tuesday, 25 August 2026" in mid-September because the date
 * was resolved once inside start() and stored. Every check in this file was a
 * source-text match, so nothing noticed that the value went stale the moment
 * the week turned over. This drives a real clock across a week boundary with
 * the session open, which is the only way to see it.
 */
createRoot((dispose) => {
  const [now, setNow] = createSignal(new Date(2026, 7, 25)); // Tuesday, 25 Aug
  const session = createMeetingModeSession("idle", now);

  session.start("2026-08-25");
  assert.equal(
    format(session.date(), "yyyy-MM-dd"), "2026-08-25",
    "a custom date inside the current week must be honoured",
  );

  // Three weeks pass with the meeting still open.
  setNow(new Date(2026, 8, 18)); // Friday, 18 Sep
  assert.equal(
    format(session.date(), "yyyy-MM-dd"), "2026-09-18",
    "an open meeting must re-date itself to the current week, not keep August",
  );
  assert.equal(session.weekLabel(), getCurrentWeekLabel(new Date(2026, 8, 18)));

  // Paused is the same story — that is how a meeting most often spans a week.
  session.pause();
  setNow(new Date(2026, 8, 25)); // Friday, 25 Sep
  assert.equal(
    format(session.date(), "yyyy-MM-dd"), "2026-09-25",
    "a paused meeting must re-date itself too",
  );
  dispose();
});

/* A date chosen for the week in view is still honoured — the fix must not
   flatten every meeting onto Friday. Thursday meetings are a real thing here;
   the Attendance rows for 2026-W33 and 2026-W35 are both Thursdays. */
assert.equal(
  format(meetingDateForWeek(new Date(2026, 7, 27), new Date(2026, 7, 25)), "yyyy-MM-dd"),
  "2026-08-27",
  "a same-week Thursday meeting must survive",
);
assert.equal(
  format(resolveMeetingDate("2026-08-25", new Date(2026, 8, 18)), "yyyy-MM-dd"),
  "2026-09-18",
  "a stale saved date must fall back to the current week's Friday",
);

assert.match(sessionSource, /if \(!allowed\.includes\(status\(\)\)\) return false/, "meeting transitions must reject duplicate starts/stops");
assert.match(
  sessionSource, /meetingDateForWeek\(pinned, today\(\)\)/,
  "the meeting date must be re-derived from the current week on read, never stored as a snapshot",
);
assert.match(homeSource, /createMeetingModeSession\(\)/, "Home must own the meeting lifecycle");
assert.match(homeSource, /forceMount=\{s\.index === "03" && meetingSession\.isActive\(\)\}/, "an off-screen Discussion section must mount for Meeting Mode");
assert.match(lazySource, /setForcedMount\(true\)/, "forced sections must stay mounted after Meeting Mode closes");
assert.match(meetingCardSource, /props\.onStartMeeting\?\.\(date\);[\s\S]*void persistUnlockedMeetingDate/, "Meeting Mode must open before the optional attendance network write");
assert.match(discussionSource, /whenIdle\([\s\S]*setMeetingJobsReady\(true\)/, "the full Jobs widget must be deferred to an idle slice");
assert.match(discussionSource, /setMeetingNotesReady\(true\)/, "the notes editor must mount after the first paint");
assert.match(discussionSource, /whenIdle\(\(\) => setNormalContentReady\(true\)/, "pause/end must not remount the normal editor and jobs table in the same click");
assert.match(discussionSource, /lockBodyScroll\(\)/, "Meeting Mode must own a balanced document scroll lock");
assert.match(discussionSource, /<ErrorBoundary/, "meeting sections must not be able to crash the whole overlay");
assert.equal(
  (discussionSource.match(/<MeetingMinutes\b/g) || []).length,
  2,
  "Home and Meeting Mode must render the same MeetingMinutes component",
);
assert.doesNotMatch(discussionSource, /MeetingNotesEditor/, "Meeting Mode must not drift into a separate document implementation");
assert.match(minutesSource, /lazy\(\(\) => import\("~\/components\/DocsEditor"\)\)/, "shared minutes must use Home's real DocsEditor");
assert.match(minutesSource, /<IdleMount timeout=\{1200\}>/, "the shared Home editor must remain deferred so Meeting Mode stays responsive");
assert.match(minutesSource, /stickyTop=\{props\.stickyTop\}/, "the shared minutes component must forward its sticky toolbar offset");
assert.match(discussionSource, /stickyTop="0px"/, "Meeting Mode must pin the toolbar directly below its header with no scroll gap");
assert.match(discussionSource, /shadow-sm overflow-clip/, "Home's document shell must clip without becoming a scroll container, so sticky toolbars follow the viewport");
assert.doesNotMatch(discussionSource, /shadow-sm overflow-hidden/, "overflow-hidden would trap the sticky document toolbar inside the card again");
assert.match(minutesSource, /queryKey: \["topics", props\.weekLabel\]/, "the shared document must reuse the same cached week query");
assert.match(minutesSource, /const createdIds = new Map\(\)/, "quick saves must not create duplicate minutes records");
assert.match(docsEditorSource, /toggleList\("bullet"\)/, "bullet controls must apply Quill's bullet format, not ordered numbering");
assert.match(docsEditorSource, /toggleList\("ordered"\)/, "numbered lists must remain a separate explicit control");

console.log("Meeting Mode lifecycle contract checks passed.");
