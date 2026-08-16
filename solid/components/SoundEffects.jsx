import { onMount, onCleanup } from "solid-js";
import { playClick, playType, playHover, playSectionEnter, unlockSound } from "@/lib/sound";

/* things worth a tick when the pointer crosses them — controls plus the
   card-ish rows (members, jobs, list items) that read as pickable */
const HOVER_TARGETS =
  "button, a, [role='button'], [role='option'], [role='menuitem'], [role='tab'], [role='checkbox'], [role='switch'], summary, label, li, tr, th, [data-cursor], input, textarea, select, h1, h2, h3, .cursor-pointer";
const UNLOCK_EVENTS = ["pointerdown", "touchend", "keydown", "click"];

/*
 * Global UI sound — 1:1 port of src/components/SoundEffects.jsx.
 *
 * Plays a click for any button/link/toggle and a soft keypress while typing.
 * A capture-phase gesture unlocks Web Audio before the control's own click
 * handler, so users never need a sacrificial first click.
 *
 * Entirely delegated document listeners, no per-element bindings, so it costs
 * nothing as the tree changes — the design was already framework-agnostic.
 */
export default function SoundEffects() {
  onMount(() => {
    let active = true;
    let listeningForUnlock = true;

    const removeUnlockListeners = () => {
      if (!listeningForUnlock) return;
      listeningForUnlock = false;
      UNLOCK_EVENTS.forEach((eventName) => window.removeEventListener(eventName, unlockHandler, true));
    };
    const unlockHandler = () => {
      void unlockSound().then((audioContext) => {
        if (active && audioContext?.state === "running") removeUnlockListeners();
      });
    };

    UNLOCK_EVENTS.forEach((eventName) => window.addEventListener(eventName, unlockHandler, true));
    if (navigator.userActivation?.hasBeenActive) unlockHandler();

    const clickHandler = (event) => {
      const target = event.target.closest?.(
        "button, a, [role='button'], input[type='checkbox'], input[type='radio'], input[type='submit']"
      );
      if (target) playClick();
    };
    const inputHandler = (event) => {
      const target = event.target;
      if (!target) return;
      const tag = target.tagName;
      if (tag === "INPUT" && !["text", "search", "email", "password", "tel", "url", "number"].includes(target.type)) return;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !target.isContentEditable) return;
      playType();
    };

    let last = null;
    let lastSection = null;
    const hoverHandler = (event) => {
      const section = event.target.closest?.("[data-gp-section]") || null;
      if (section !== lastSection) {
        lastSection = section;
        if (section) playSectionEnter();
      }
      const target = event.target.closest?.(HOVER_TARGETS) || null;
      if (target === last) return;
      last = target;
      if (target) playHover();
    };

    document.addEventListener("mouseover", hoverHandler, true);
    document.addEventListener("click", clickHandler, true);
    document.addEventListener("input", inputHandler, true);

    onCleanup(() => {
      active = false;
      removeUnlockListeners();
      document.removeEventListener("mouseover", hoverHandler, true);
      document.removeEventListener("click", clickHandler, true);
      document.removeEventListener("input", inputHandler, true);
    });
  });

  return null;
}
