import { createSignal, onCleanup } from "solid-js";
import { homeLayout, HOME_LAYOUT_EVENT } from "@/lib/layout-preference";

/**
 * The Home layout choice as a signal.
 *
 * Same shape as useJapaneseText() in lib/motion.js: read the shared
 * preference module once, then follow its change event and cross-tab
 * `storage` updates. The preference itself is framework-agnostic and lives in
 * src/lib/ with the rest of them.
 */
export function useHomeLayout() {
  const [layout, setLayout] = createSignal(homeLayout());
  const sync = () => setLayout(homeLayout());

  window.addEventListener(HOME_LAYOUT_EVENT, sync);
  window.addEventListener("storage", sync);
  onCleanup(() => {
    window.removeEventListener(HOME_LAYOUT_EVENT, sync);
    window.removeEventListener("storage", sync);
  });

  return layout;
}
