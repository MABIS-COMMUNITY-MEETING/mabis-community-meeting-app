import { useEffect, useState } from "react";
import { isConstrainedNetwork } from "@/lib/performance-tier";

/** Mount non-critical UI after the browser has painted and gone idle. */
export default function IdleMount({ children, timeout = 1400 }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;
    const show = () => { if (!cancelled) setReady(true); };

    let id = 0;
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        id = window.requestIdleCallback(show, { timeout });
      } else {
        id = window.setTimeout(show, Math.min(timeout, 500));
      }
    };
    const events = ["pointerdown", "keydown", "touchstart", "scroll"];
    const beginAfterInteraction = () => {
      events.forEach((event) => window.removeEventListener(event, beginAfterInteraction));
      schedule();
    };

    if (isConstrainedNetwork()) {
      events.forEach((event) => window.addEventListener(event, beginAfterInteraction, { once: true, passive: true }));
    } else {
      schedule();
    }

    return () => {
      cancelled = true;
      events.forEach((event) => window.removeEventListener(event, beginAfterInteraction));
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
      else window.clearTimeout(id);
    };
  }, [timeout]);

  return ready ? children : null;
}
