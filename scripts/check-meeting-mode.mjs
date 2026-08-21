import assert from "node:assert/strict";
import fs from "node:fs";

const sessionSource = fs.readFileSync("solid/lib/meeting-mode-session.js", "utf8");
const homeSource = fs.readFileSync("solid/pages/Home.jsx", "utf8");
const lazySource = fs.readFileSync("solid/components/home/LazySection.jsx", "utf8");
const meetingCardSource = fs.readFileSync("solid/components/MeetingModeWidget.jsx", "utf8");
const discussionSource = fs.readFileSync("solid/components/DiscussionWidget.jsx", "utf8");
const notesSource = fs.readFileSync("solid/components/MeetingNotesEditor.jsx", "utf8");
const meetingEditorSource = fs.readFileSync("solid/components/MeetingDocumentEditor.jsx", "utf8");
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
assert.match(notesSource, /saveQueue = operation\.catch/, "note writes must be serialized");
assert.match(notesSource, /MeetingDocumentEditor/, "Meeting Mode must use its lightweight flowing document editor");
assert.doesNotMatch(notesSource, /DiscussionDocumentEditor|DocsEditor|Quill/, "Meeting Mode must never load the heavy Discussion document engine");
assert.doesNotMatch(meetingEditorSource, /from ["\']quill|DocsEditor|DiscussionDocumentEditor/, "the meeting editor must stay independent from Quill");
assert.match(meetingEditorSource, /contentEditable/, "meeting notes must remain one normal editable document");
assert.match(meetingEditorSource, /insertUnorderedList/, "the lightweight toolbar must retain bullet lists");
assert.match(meetingEditorSource, /createLink/, "the lightweight toolbar must retain working links");
assert.doesNotMatch(notesSource, /saveMutation\.mutate\(html\)/, "cleanup must not launch a disposed query mutation");

console.log("Meeting Mode lifecycle contract checks passed.");
