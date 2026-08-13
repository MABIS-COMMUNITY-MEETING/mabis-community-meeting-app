import { useEffect, useState } from "react";

/** Mount non-critical UI after the browser has painted and gone idle. */
export default function IdleMount({ children, timeout = 1400 }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    let cancelled = false;
    const show = () => { if (!cancelled) setReady(true); };

    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(show, { timeout });
      return () => {
        cancelled = true;
        window.cancelIdleCallback(id);
      };
    }

    const id = window.setTimeout(show, Math.min(timeout, 500));
    return () => {
      cancelled = true;
      window.clearTimeout(id);
    };
  }, [timeout]);

  return ready ? children : null;
}
