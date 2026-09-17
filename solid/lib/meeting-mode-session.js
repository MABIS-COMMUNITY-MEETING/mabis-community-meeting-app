import { createSignal } from "solid-js";
import { createLocalDate } from "./current-date.js";
import { getWeekLabel } from "./weeks.js";
import { readSavedMeetingDate, resolveMeetingDate } from "../../src/lib/meeting-date.js";

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
  const [date, setDate] = createSignal(initialStatus === "idle"
    ? null : resolveMeetingDate(readSavedMeetingDate(), today()));

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
        setDate(resolveMeetingDate(
          typeof requestedDate === "string" ? requestedDate : readSavedMeetingDate(), today(),
        ));
      }
      return transition(["idle", "paused"], "active");
    },
    pause: () => transition(["active"], "paused"),
    end: () => transition(["active", "paused"], "ended"),
    clear: () => {
      if (status() === "idle") return false;
      setDate(null);
      setStatus("idle");
      return true;
    },
  };
}
