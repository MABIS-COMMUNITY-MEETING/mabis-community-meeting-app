import { createSignal, onMount, onCleanup, lazy, Suspense, Show } from "solid-js";
import { customCursorEnabled, CURSOR_EVENT } from "@/lib/cursor-preference";
import { lowPowerMode, PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";

const CustomCursor = lazy(() => import("~/components/CustomCursor"));

function cursorCanRun() {
  if (typeof window === "undefined") return false;
  return customCursorEnabled()
    && !lowPowerMode()
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Avoid downloading the cursor physics engine on touch and low-power devices.
 *
 * This gate matters more than it looks: the chunk pulls in the spring solver,
 * the pointer engine and the fixed-timestep scheduler, none of which a phone
 * will ever use — there is no hover pointer to track.
 */
export default function OptionalCustomCursor() {
  const [enabled, setEnabled] = createSignal(cursorCanRun());

  onMount(() => {
    const update = () => setEnabled(cursorCanRun());
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    window.addEventListener(CURSOR_EVENT, update);
    window.addEventListener(PERFORMANCE_TIER_EVENT, update);
    finePointer.addEventListener?.("change", update);
    reducedMotion.addEventListener?.("change", update);

    onCleanup(() => {
      window.removeEventListener(CURSOR_EVENT, update);
      window.removeEventListener(PERFORMANCE_TIER_EVENT, update);
      finePointer.removeEventListener?.("change", update);
      reducedMotion.removeEventListener?.("change", update);
    });
  });

  return (
    <Show when={enabled()}>
      <Suspense fallback={null}>
        <CustomCursor />
      </Suspense>
    </Show>
  );
}
