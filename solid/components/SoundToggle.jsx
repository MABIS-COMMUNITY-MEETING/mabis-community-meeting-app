import { createSignal, createEffect, onMount, onCleanup, Index } from "solid-js";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { animationsDisabled, MOTION_EVENT } from "@/lib/motion-preference";
import { PERFORMANCE_TIER_EVENT } from "@/lib/performance-tier";
import { rhythmScale } from "@/lib/sound-rhythm";

const BAR_SCALES = [0.5, 1, 0.72];
const IDLE_SCALE = 0.2;

/**
 * SoundToggle — Solid port of src/components/SoundToggle.jsx.
 *
 * While sound is on, three level bars beat in time with a stored rhythm
 * envelope. Nothing is ever played here: there is no AudioContext, no media
 * element and no recording in this path — the bars are moved by a timer
 * reading numbers.
 *
 * The loop yields to every preference the contract requires: it does not start
 * when sound is off, under prefers-reduced-motion, with animations disabled,
 * in performance-lite, or while the tab is hidden. A visible toggle must not
 * keep a perpetual animation running on a phone.
 *
 * Transforms are written imperatively, exactly as in React — but there the
 * comment reads "so React never fights the animation frame". In Solid there is
 * no render to fight; it is simply the cheapest way to move three nodes.
 */
export default function SoundToggle(props) {
  const [on, setOn] = createSignal(isSoundEnabled());
  const [prefsVersion, setPrefsVersion] = createSignal(0);
  const bars = [];

  onMount(() => {
    const handleChange = (event) => setOn(!!event.detail);
    const bump = () => setPrefsVersion((v) => v + 1);

    window.addEventListener("mabis-sound-changed", handleChange);
    window.addEventListener(MOTION_EVENT, bump);
    window.addEventListener(PERFORMANCE_TIER_EVENT, bump);

    onCleanup(() => {
      window.removeEventListener("mabis-sound-changed", handleChange);
      window.removeEventListener(MOTION_EVENT, bump);
      window.removeEventListener(PERFORMANCE_TIER_EVENT, bump);
    });
  });

  createEffect(() => {
    const isOn = on();
    prefsVersion(); // re-evaluate when motion/performance preferences change

    const nodes = bars.filter(Boolean);
    if (!nodes.length) return;

    const rest = () => nodes.forEach((el, index) => {
      el.style.transition = "";
      el.style.transform = `scaleY(${isOn ? BAR_SCALES[index] : IDLE_SCALE})`;
    });

    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const lite = document.documentElement.classList.contains("performance-lite");
    if (!isOn || reduced || lite || animationsDisabled()) {
      rest();
      return;
    }

    let raf = 0;
    let start = 0;

    // A 300ms CSS transition would smear a ~28fps envelope into mush, so the
    // bars are written directly while beating and handed back to the class
    // transition when they stop.
    nodes.forEach((el) => { el.style.transition = "none"; });

    const tick = (now) => {
      if (!start) start = now;
      const elapsed = (now - start) / 1000;
      for (let index = 0; index < nodes.length; index += 1) {
        nodes[index].style.transform = `scaleY(${rhythmScale(elapsed, index).toFixed(3)})`;
      }
      raf = requestAnimationFrame(tick);
    };

    const stop = () => { if (raf) cancelAnimationFrame(raf); raf = 0; };
    const play = () => { if (!raf) { start = 0; raf = requestAnimationFrame(tick); } };
    const onVisibility = () => (document.hidden ? stop() : play());

    document.addEventListener("visibilitychange", onVisibility);
    play();

    onCleanup(() => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
      rest();
    });
  });

  const toggle = () => {
    const next = !on();
    setSoundEnabled(next);
    setOn(next);
  };

  return (
    <button
      onClick={toggle}
      data-cursor={on() ? "MUTE" : "SND"}
      aria-label={on() ? "Turn sound off" : "Turn sound on"}
      aria-pressed={on()}
      class={`sound-toggle flex h-9 items-center gap-2 border border-foreground/30 bg-background px-2.5 sm:px-3 tech-label text-foreground hover:bg-foreground hover:text-background transition-colors ${props.class || ""}`}
    >
      <span class="flex h-3 items-end gap-[2px]" aria-hidden>
        <Index each={BAR_SCALES}>
          {(scale, index) => (
            <span
              ref={(el) => { bars[index] = el; }}
              class="block h-[10px] w-[2px] origin-bottom bg-current transition-transform duration-300 [transition-timing-function:cubic-bezier(.16,1,.3,1)]"
              style={{ transform: `scaleY(${on() ? scale() : IDLE_SCALE})` }}
            />
          )}
        </Index>
      </span>
      <span class="block w-[52px] tabular-nums" aria-live="polite">
        {on() ? "SND 01" : "SND 00"}
      </span>
    </button>
  );
}
