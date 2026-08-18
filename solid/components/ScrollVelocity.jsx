import { Index, Show } from "solid-js";

const DEFAULT_ITEMS = ["MABIS", "COMMUNITY", "FRIDAY", "BANGKOK"];

/*
 * Quiet typographic interlude — a static editorial rule.
 *
 * The band used to translate from 1% to -10% across page progress, driven by a
 * style.transform write on every scroll frame. That drift is gone: scrolling is
 * the browser's job and nothing here should move because the page moved. The
 * band keeps its position, type and spacing, so the section reads exactly as it
 * did at rest — which is where a reader saw it most of the time anyway.
 *
 * The second, aria-hidden copy of the sequence stays. It sat off the right edge
 * under overflow-hidden before and still does; it exists so the rule reaches the
 * full width on a wide viewport rather than stopping mid-line.
 */
function Sequence(props) {
  return (
    <span class="inline-flex items-center select-none">
      <Index each={props.items}>
        {(item, index) => (
          <>
            <Show when={index > 0}>
              <span aria-hidden class="mx-[0.42em] inline-flex h-[0.72em] w-[0.72em] items-center justify-center shrink-0">
                <span class="block h-px w-full rotate-[-48deg] bg-current opacity-70" />
              </span>
            </Show>
            <span>{item()}</span>
          </>
        )}
      </Index>
    </span>
  );
}

export default function ScrollVelocity(props) {
  const sequence = () => (props.items?.length > 0 ? props.items : DEFAULT_ITEMS);

  return (
    <div class={`relative overflow-hidden whitespace-nowrap ${props.class || ""}`}>
      {/* No will-change: nothing animates this any more, and the hint alone
          would keep the band on its own compositor layer for the life of the
          page. */}
      <div style={{ transform: "translateX(1%)" }} class="inline-flex items-center">
        <Sequence items={sequence()} />
        <span aria-hidden class="ml-[0.84em] inline-flex items-center">
          <span class="mr-[0.42em] inline-flex h-[0.72em] w-[0.72em] items-center justify-center shrink-0">
            <span class="block h-px w-full rotate-[-48deg] bg-current opacity-70" />
          </span>
          <Sequence items={sequence()} />
        </span>
      </div>
    </div>
  );
}
