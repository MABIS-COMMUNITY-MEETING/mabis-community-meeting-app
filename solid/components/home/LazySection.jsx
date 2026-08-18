import { Show } from "solid-js";
import { createVisibility } from "~/lib/perf";

/* ── LazySection ───────────────────────────────────────────────────────────
 * Same contract as the React version — mount on approach, never unmount — but
 * with two low-level differences:
 *
 *   · it uses the ONE shared IntersectionObserver (lib/perf.js) instead of
 *     allocating a new observer per section;
 *   · the placeholder carries contain-intrinsic-size so the reserved space is
 *     a real layout contract rather than a min-height guess, which keeps the
 *     scrollbar stable when the real content swaps in.
 *
 * Its own file, not part of home/shell.jsx, because both layouts mount their
 * widgets through it while everything else in shell.jsx is boss-layout only.
 * Sharing a module with them would pull the whole editorial shell — masthead,
 * section index, rails — into the default layout's critical path to reach
 * these forty lines.
 */
export function LazySection(props) {
  const [ref, visible] = createVisibility();

  return (
    <div ref={ref}>
      <Show
        when={visible()}
        fallback={
          <div
            class="lazy-section-placeholder"
            style={{
              "--lazy-min-height": `${props.minHeight ?? 480}px`,
              "contain-intrinsic-size": `auto ${props.minHeight ?? 480}px`,
            }}
            aria-hidden
          />
        }
      >
        <div class="widget-rise">{props.children}</div>
      </Show>
    </div>
  );
}
