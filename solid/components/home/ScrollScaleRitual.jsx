import { JapaneseText } from "~/components/primitives";

/*
 * "VOICE YOUR WORDS" — the editorial interlude between the section index and
 * the widgets. Static, deliberately.
 *
 * WHY THERE IS NO ANIMATION HERE
 *
 * This line used to scale 0.82 → 1.28 and fade as it travelled up the viewport:
 * a passive scroll listener marking geometry stale, a getBoundingClientRect()
 * in the scheduler's sample phase, a spring integrated at a fixed timestep, and
 * transform + opacity written every frame. Novesce asked for that to go — see
 * "Scrolling belongs to the browser" in README.md, which is the standing rule:
 * nothing may subscribe to scroll position in order to move, scale, fade or
 * redraw anything.
 *
 * It also cost frames in the one gesture where they are most visible. The glass
 * header is fixed over the scrolling page, so every scroll frame already has to
 * re-raster it; adding a rect read and two style writes to the same frames is
 * how a smooth scroll turns into a stuttering one. `html.is-scrolling` exists
 * precisely to take work OUT of those frames.
 *
 * The type, spacing and colour are unchanged, so the section reads as it did
 * mid-travel — the state it held for most of its journey anyway.
 *
 * If this comes back, it will come back with the scroll listener, and the rule
 * above is the thing being broken. check-performance-contract.mjs fails the
 * build on it.
 */
export default function ScrollScaleRitual() {
  return (
    <div class="voice-words-ritual relative py-24 sm:py-36 overflow-hidden flex justify-center">
      <p class="voice-words-ritual__line font-display font-thin tracking-[0.08em] text-foreground/80 text-[6vw] sm:text-[3.6vw] leading-none whitespace-nowrap origin-center">
        <JapaneseText ja="あなたの言葉を届けよう">VOICE YOUR WORDS</JapaneseText>
      </p>
    </div>
  );
}
