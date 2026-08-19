import { onMount, onCleanup, Index, Show } from "solid-js";
import { subscribeScrollProgress } from "@/lib/scroll-progress";

const DEFAULT_ITEMS = ["MABIS", "COMMUNITY", "FRIDAY", "BANGKOK"];

/*
 * Quiet typographic interlude — port of src/components/ScrollVelocity.jsx.
 *
 * The band moves slowly with page progress instead of splitting into RGB ghost
 * layers, so it reads as editorial punctuation.
 *
 * framer's useTransform(scrollYProgress, [0,1], ["1%","-10%"]) becomes a direct
 * style.transform write from the app's own scroll subscription. No signal is
 * written per frame — that would push the whole reactive graph through every
 * scroll tick for one translate.
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
  let trackEl;
  const sequence = () => (props.items?.length > 0 ? props.items : DEFAULT_ITEMS);

  onMount(() => {
    const unsubscribe = subscribeScrollProgress((progress) => {
      // 1% → -10% across the page, exactly the framer range.
      if (trackEl) trackEl.style.transform = `translateX(${(1 + progress * -11).toFixed(3)}%)`;
    });
    onCleanup(() => unsubscribe?.());
  });

  return (
    <div class={`relative overflow-hidden whitespace-nowrap ${props.class || ""}`}>
      <div ref={trackEl} style={{ transform: "translateX(1%)" }} class="inline-flex items-center will-change-transform">
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
