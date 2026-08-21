import { createSignal } from "solid-js";

/**
 * One Home-owned meeting lifecycle.
 *
 * Start can be triggered while Discussion is still outside LazySection's
 * viewport. Keeping the request in a signal means it cannot be lost like the
 * old fire-and-forget window event, and every transition is idempotent so
 * double-clicks cannot mount or tear down Meeting Mode twice.
 */
export function createMeetingModeSession(initialStatus = "idle") {
  const [status, setStatus] = createSignal(initialStatus);

  const transition = (allowed, next) => {
    if (!allowed.includes(status())) return false;
    setStatus(next);
    return true;
  };

  return {
    status,
    isActive: () => status() === "active",
    start: () => transition(["idle", "paused"], "active"),
    pause: () => transition(["active"], "paused"),
    end: () => transition(["active", "paused"], "ended"),
    clear: () => {
      if (status() === "idle") return false;
      setStatus("idle");
      return true;
    },
  };
}
