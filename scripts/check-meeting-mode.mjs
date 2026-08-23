import assert from "node:assert/strict";
import fs from "node:fs";

const sessionSource = fs.readFileSync("solid/lib/meeting-mode-session.js", "utf8");
const homeSource = fs.readFileSync("solid/pages/Home.jsx", "utf8");
const lazySource = fs.readFileSync("solid/components/home/LazySection.jsx", "utf8");
const meetingCardSource = fs.readFileSync("solid/components/MeetingModeWidget.jsx", "utf8");
const discussionSource = fs.readFileSync("solid/components/DiscussionWidget.jsx", "utf8");
const minutesSource = fs.readFileSync("solid/components/MeetingMinutes.jsx", "utf8");
const docsEditorSource = fs.readFileSync("solid/components/DocsEditor.jsx", "utf8");
const { createRoot } = await import("solid-js");
const { createMeetingModeSession } = await import("../solid/lib/meeting-mode-session.js");

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

assert.match(sessionSource, /if \(!allowed\.includes\(status\(\)\)\) return false/, "meeting transitions must reject duplicate starts/stops");
assert.match(homeSource, /createMeetingModeSession\(\)/, "Home must own the meeting lifecycle");
assert.match(homeSource, /forceMount=\{s\.index === "03" && meetingSession\.isActive\(\)\}/, "an off-screen Discussion section must mount for Meeting Mode");
assert.match(lazySource, /setForcedMount\(true\)/, "forced sections must stay mounted after Meeting Mode closes");
assert.match(meetingCardSource, /props\.onStartMeeting\?\.\(\);[\s\S]*void persistUnlockedMeetingDate/, "Meeting Mode must open before the optional attendance network write");
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
