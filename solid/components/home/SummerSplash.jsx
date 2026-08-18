import { For } from "solid-js";
import { ArrowRight } from "lucide-solid";
import { JapaneseText } from "~/components/primitives";
import { detectLowPowerDevice } from "@/lib/performance-tier";
import "@/styles/summer-splash.css";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_256,h_256/logo.webp";

/*
 * Summer style's splash — the original maroon field with drifting motes.
 *
 * The design is carried over from the Summer site verbatim. How it runs is
 * not, because the original did not survive contact with a phone:
 *
 *   216 elements, each animated by framer-motion on `repeat: Infinity` over
 *   opacity + scale + x + y, each carrying a blurred box-shadow.
 *
 * That is 216 JS-driven animations that never settle, 216 blur passes per
 * paint, and 216 candidate compositor layers. Every one of those three is a
 * problem on mobile, and together they are why it crawled.
 *
 * Three changes, none of them visible:
 *
 *   1. The motion is one shared CSS keyframe. Per-dot variation rides in
 *      custom properties, so the main thread does no work per frame at all.
 *   2. The glow is a radial-gradient inside the dot instead of a box-shadow
 *      around it — part of the element's own texture rather than a filter
 *      pass on every paint.
 *   3. The count adapts. 216 was chosen on a desktop; a phone gets a
 *      quarter of it, and a device that reports as low-powered gets less
 *      again. summer-splash.css trims further under the lite tier.
 *
 * Nothing here reads the clock or subscribes to the physics scheduler, so
 * this page costs nothing once painted.
 */

/*
 * How many motes this device should carry.
 *
 * Resolved once, when the chunk mounts. deviceMemory/hardwareConcurrency are
 * the same signals performance-tier uses to pick a tier, and a coarse pointer
 * or a narrow viewport is the best proxy available for "phone" before any
 * frame has been measured.
 */
function moteCount() {
  if (typeof window === "undefined") return 0;
  if (detectLowPowerDevice()) return 26;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches;
  if (coarse || window.innerWidth < 768) return 54;
  return 120;
}

function buildMotes(count) {
  return Array.from({ length: count }, (_, i) => {
    const size = 3 + Math.random() * 10;
    const drift = 30 + Math.random() * 70;
    return {
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      /* The box has to be wide enough to hold the gradient's falloff, or the
         glow would be clipped at the dot's edge. */
      box: size * 2.6,
      dx: (i % 2 ? 1 : -1) * drift * 0.4,
      dy: -drift,
      duration: 4 + Math.random() * 5,
      delay: Math.random() * 3,
      gold: Math.random() > 0.4,
    };
  });
}

export default function SummerSplash(props) {
  const motes = buildMotes(moteCount());

  return (
    {/*
      * Normal flow, not `fixed inset-0`.
      *
      * The original was fixed, and on a tall window that looks identical — but
      * a fixed, overflow-hidden panel is exactly as tall as the viewport and
      * never scrolls, so anything that does not fit is simply unreachable. In
      * a short viewport (the Base44 preview iframe, a phone in landscape, a
      * small window) the Start button fell off the bottom with no way to get
      * to it.
      *
      * `min-h-[100dvh]` fills the screen when there is room and grows the
      * document when there is not, so the page scrolls instead of clipping.
      * `relative` keeps providing the positioning context the absolutely
      * placed motes need, which is the only thing `fixed` was really doing
      * for them.
      */}
    <div class="summer-splash relative flex min-h-[100dvh] w-full flex-col items-center justify-center overflow-x-hidden px-4 py-12">
      <For each={motes}>
        {(m) => (
          <span
            class={`summer-splash-dot${m.gold ? " is-gold" : ""}`}
            aria-hidden="true"
            style={{
              left: `${m.left}%`,
              top: `${m.top}%`,
              width: `${m.box}px`,
              height: `${m.box}px`,
              "--dx": `${m.dx}px`,
              "--dy": `${m.dy}px`,
              "animation-duration": `${m.duration}s`,
              "animation-delay": `${m.delay}s`,
            }}
          />
        )}
      </For>

      <span class="summer-splash-glow" aria-hidden="true" />

      <div class="relative z-10 flex w-full max-w-2xl flex-col items-center px-4 text-center sm:px-8">
        <div class="mb-6 flex h-32 w-32 items-center justify-center overflow-hidden rounded-3xl bg-white shadow-2xl">
          <img src={LOGO} alt="MABIS" width="112" height="112" class="h-28 w-28 rounded-3xl object-contain" />
        </div>

        <JapaneseText
          as="h1"
          ja="セカンダリー・コミュニティ・ミーティング・アプリ"
          class="mb-3 block font-display text-2xl font-black leading-tight tracking-tight text-white sm:text-4xl md:text-5xl"
          japaneseClass="mt-2 block text-[0.42em] font-normal tracking-normal opacity-80"
        >
          <span class="block whitespace-nowrap">SECONDARY COMMUNITY</span>
          <span class="block whitespace-nowrap">MEETING APP</span>
        </JapaneseText>

        <span class="mb-6 block h-[3px] w-20 rounded-full" style={{ background: "#EACE54" }} aria-hidden="true" />

        <button
          type="button"
          onClick={props.onEnter}
          data-cursor="ENTER"
          class="summer-splash-cta flex items-center justify-center gap-3 rounded-2xl px-16 py-5 font-display text-xl font-bold transition-transform hover:scale-105 active:scale-95"
          style={{ background: "#ffffff", color: "#951E3A", border: "4px solid #EACE54" }}
        >
          <JapaneseText
            ja={props.authenticated ? "はじめる" : "ログイン"}
            layout="inline"
            japaneseClass="ml-1.5 inline text-[0.75em] font-normal opacity-80"
          >
            {props.authenticated ? "Start" : "Log in"}
          </JapaneseText>
          <ArrowRight class="h-6 w-6" />
        </button>
      </div>
    </div>
  );
}
