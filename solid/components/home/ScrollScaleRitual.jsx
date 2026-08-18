import { JapaneseText } from "~/components/primitives";

/*
 * "VOICE YOUR WORDS" — the editorial interlude between the section index and
 * the widgets.
 *
 * The line used to grow from 0.82 to 1.28 and fade in and out as it travelled
 * up the viewport: element progress measured from getBoundingClientRect() on
 * every scroll event, run through the app's spring integrator on the shared
 * physics scheduler, writing transform and opacity every frame. It is now
 * static. Scrolling is the browser's business, and a line that resizes itself
 * because the page moved is the clearest possible signal that it is not.
 *
 * The type is unchanged, so the section still reads as it did mid-pass — which
 * is the state it held for most of its travel. What went with the motion: a
 * scroll listener, a resize listener, a subscription to the physics scheduler
 * (which now sleeps on this page unless the cursor or splash wakes it), and the
 * per-frame transform that kept this text on its own compositor layer.
 */
export default function ScrollScaleRitual() {
  return (
    <div class="relative py-24 sm:py-36 overflow-hidden flex justify-center">
      <p class="font-display font-thin tracking-[0.08em] text-foreground/80 text-[6vw] sm:text-[3.6vw] leading-none whitespace-nowrap">
        <JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
      </p>
    </div>
  );
}
