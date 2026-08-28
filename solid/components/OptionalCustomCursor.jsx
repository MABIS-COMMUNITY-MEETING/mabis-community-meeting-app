import { createSignal, onMount, onCleanup, lazy, Suspense, Show } from "solid-js";
import { customCursorEnabled, CURSOR_EVENT } from "@/lib/cursor-preference";

const CustomCursor = lazy(() => import("~/components/CustomCursor"));

function cursorCanRun() {
  if (typeof window === "undefined") return false;
  return customCursorEnabled()
    && window.matchMedia("(hover: hover) and (pointer: fine)").matches
    && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Avoid downloading the cursor physics engine on touch devices and for users
 * who request reduced motion. The explicit cursor preference remains in charge
 * on desktop even if the page enters its lighter visual tier.
 */
export default function OptionalCustomCursor() {
  const [enabled, setEnabled] = createSignal(cursorCanRun());

  onMount(() => {
    const update = () => setEnabled(cursorCanRun());
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    window.addEventListener(CURSOR_EVENT, update);
    finePointer.addEventListener?.("change", update);
    reducedMotion.addEventListener?.("change", update);

    onCleanup(() => {
      window.removeEventListener(CURSOR_EVENT, update);
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
