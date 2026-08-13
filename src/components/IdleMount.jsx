import { useEffect, useState } from "react";
import { networkState, NETWORK_EVENT } from "@/lib/network-policy";

/** Mount non-critical UI after the browser has painted and gone idle. */
export default function IdleMount({ children, timeout = 1400, constrainedTimeout = 9000 }) {
  const [ready, setReady] = useState(false);
  const [constrained, setConstrained] = useState(() => networkState().constrained);

  useEffect(() => {
    const update = (event) => setConstrained(Boolean(event.detail?.constrained));
    window.addEventListener(NETWORK_EVENT, update);
    return () => window.removeEventListener(NETWORK_EVENT, update);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || ready) return undefined;
    let cancelled = false;
    let idleId = null;
    const show = () => { if (!cancelled) setReady(true); };
    const scheduleIdle = () => {
      if (cancelled) return;
      if ("requestIdleCallback" in window) {
        idleId = window.requestIdleCallback(show, { timeout });
      } else {
        idleId = window.setTimeout(show, Math.min(timeout, 500));
      }
    };

    const delayId = window.setTimeout(scheduleIdle, constrained ? constrainedTimeout : 0);
    return () => {
      cancelled = true;
      window.clearTimeout(delayId);
      if (idleId !== null) {
        if ("cancelIdleCallback" in window) window.cancelIdleCallback(idleId);
        else window.clearTimeout(idleId);
      }
    };
  }, [constrained, constrainedTimeout, ready, timeout]);

  return ready ? children : null;
}
