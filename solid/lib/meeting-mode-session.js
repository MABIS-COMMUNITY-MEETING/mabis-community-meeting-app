import { createSignal } from "solid-js";
import { createLocalDate } from "./current-date.js";
import { getWeekLabel } from "./weeks.js";
import { meetingDateForWeek, readSavedMeetingDate, resolveMeetingDate } from "../../src/lib/meeting-date.js";

/**
 * One Home-owned meeting lifecycle.
 *
 * Start can be triggered while Discussion is still outside LazySection's
 * viewport. Keeping the request in a signal means it cannot be lost like the
 * old fire-and-forget window event, and every transition is idempotent so
 * double-clicks cannot mount or tear down Meeting Mode twice.
 */
export function createMeetingModeSession(initialStatus = "idle", today = createLocalDate()) {
  const [status, setStatus] = createSignal(initialStatus);
  /*
   * The date the meeting was opened with. Read through `date()` below, never
   * directly — on its own this is a snapshot, and a snapshot is what was wrong.
   */
  const [pinnedDate, setPinnedDate] = createSignal(initialStatus === "idle"
    ? null : resolveMeetingDate(readSavedMeetingDate(today()), today()));

  /*
   * Re-checked on every read rather than stored once.
   *
   * `today` is a signal that refreshes at local midnight and on focus, so
   * reading it here makes the meeting date reactive: when the week rolls over,
   * the header re-renders on the new week's Friday by itself. Previously the
   * date was resolved once at start() and never revisited, so a meeting left
   * running — or merely paused — across a week boundary kept announcing the day
   * it opened on, weeks after the fact.
   *
   * Cheap enough to do per read: two week-label computations, no allocation
   * beyond the returned Date.
   */
  const date = () => {
    const pinned = pinnedDate();
    return pinned ? meetingDateForWeek(pinned, today()) : null;
  };

  const transition = (allowed, next) => {
    if (!allowed.includes(status())) return false;
    setStatus(next);
    return true;
  };

  return {
    status,
    today,
    date,
    weekLabel: () => getWeekLabel(date() || today()),
    isActive: () => status() === "active",
    start: (requestedDate) => {
      if (status() === "idle") {
        setPinnedDate(resolveMeetingDate(
          typeof requestedDate === "string" ? requestedDate : readSavedMeetingDate(today()),
          today(),
        ));
      }
      return transition(["idle", "paused"], "active");
    },
    pause: () => transition(["active"], "paused"),
    end: () => transition(["active", "paused"], "ended"),
    clear: () => {
      if (status() === "idle") return false;
      setPinnedDate(null);
      setStatus("idle");
      return true;
    },
  };
}
