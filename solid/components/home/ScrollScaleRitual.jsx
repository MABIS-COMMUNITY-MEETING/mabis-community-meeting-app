import { JapaneseText } from "~/components/primitives";
import { createReveal } from "~/lib/perf";

/*
 * "VOICE YOUR WORDS" — the editorial interlude between the section index and
 * the widgets.
 *
 * The motion is compositor-only. Browsers with CSS view timelines scale and
 * fade the line with its actual scroll progress; the shared IntersectionObserver
 * supplies a one-shot entrance fallback elsewhere. No scroll handler, layout
 * read, physics loop or Solid signal runs on every frame.
 */
export default function ScrollScaleRitual() {
  const [ref, revealed] = createReveal();

  return (
    <div
      ref={ref}
      class="voice-words-ritual relative py-24 sm:py-36 overflow-hidden flex justify-center"
      classList={{ "is-visible": revealed() }}
    >
      <p class="voice-words-ritual__line font-display font-thin tracking-[0.08em] text-foreground/80 text-[6vw] sm:text-[3.6vw] leading-none whitespace-nowrap">
        <JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
      </p>
    </div>
  );
}
