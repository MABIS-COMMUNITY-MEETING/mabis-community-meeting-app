import assert from "node:assert/strict";
import fs from "node:fs";

const sessionSource = fs.readFileSync("solid/lib/meeting-mode-session.js", "utf8");
const homeSource = fs.readFileSync("solid/pages/Home.jsx", "utf8");
const lazySource = fs.readFileSync("solid/components/home/LazySection.jsx", "utf8");
const meetingCardSource = fs.readFileSync("solid/components/MeetingModeWidget.jsx", "utf8");
const discussionSource = fs.readFileSync("solid/components/DiscussionWidget.jsx", "utf8");
const notesSource = fs.readFileSync("solid/components/MeetingNotesEditor.jsx", "utf8");

assert.match(sessionSource, /if \(!allowed\.includes\(status\(\)\)\) return false/, "meeting transitions must reject duplicate starts/stops");
assert.match(homeSource, /createMeetingModeSession\(\)/, "Home must own the meeting lifecycle");
assert.match(homeSource, /forceMount=\{s\.index === "03" && meetingSession\.isActive\(\)\}/, "an off-screen Discussion section must mount for Meeting Mode");
assert.match(lazySource, /setForcedMount\(true\)/, "forced sections must stay mounted after Meeting Mode closes");
assert.match(meetingCardSource, /props\.onStartMeeting\?\.\(\);[\s\S]*void persistUnlockedMeetingDate/, "Meeting Mode must open before the optional attendance network write");
assert.match(discussionSource, /whenIdle\([\s\S]*setMeetingJobsReady\(true\)/, "the full Jobs widget must be deferred to an idle slice");
assert.match(discussionSource, /setMeetingNotesReady\(true\)/, "the notes editor must mount after the first paint");
assert.match(discussionSource, /lockBodyScroll\(\)/, "Meeting Mode must own a balanced document scroll lock");
assert.match(discussionSource, /<ErrorBoundary/, "meeting sections must not be able to crash the whole overlay");
assert.match(notesSource, /saveQueue = operation\.catch/, "note writes must be serialized");
assert.doesNotMatch(notesSource, /saveMutation\.mutate\(html\)/, "cleanup must not launch a disposed query mutation");

console.log("Meeting Mode lifecycle contract checks passed.");
