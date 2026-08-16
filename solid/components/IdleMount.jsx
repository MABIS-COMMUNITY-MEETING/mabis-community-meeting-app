import { createSignal, onMount, onCleanup, Show } from "solid-js";
import { isConstrainedNetwork } from "@/lib/performance-tier";

/**
 * Mount non-critical UI after the browser has painted and gone idle.
 * 1:1 port of src/components/IdleMount.jsx.
 *
 * On a constrained connection nothing is even scheduled until the user first
 * interacts, so a slow device spends its initial budget on the page itself.
 *
 * `props.children` is only read inside <Show>, which matters: Solid's compiler
 * wraps a component's JSX children in a getter, so leaving it untouched means
 * the subtree is never created. Rendering it unconditionally and hiding it with
 * CSS would defeat the entire point of this component.
 */
export default function IdleMount(props) {
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    if (typeof window === "undefined") return;
    const timeout = props.timeout ?? 1400;
    let cancelled = false;
    const show = () => { if (!cancelled) setReady(true); };

    let id = 0;
    const schedule = () => {
      if ("requestIdleCallback" in window) {
        id = window.requestIdleCallback(show, { timeout });
      } else {
        id = setTimeout(show, Math.min(timeout, 500));
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

    onCleanup(() => {
      cancelled = true;
      events.forEach((event) => window.removeEventListener(event, beginAfterInteraction));
      if ("cancelIdleCallback" in window) window.cancelIdleCallback(id);
      else clearTimeout(id);
    });
  });

  return <Show when={ready()}>{props.children}</Show>;
}
