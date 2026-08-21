import { onMount, onCleanup } from "solid-js";
import {
  activateFocused,
  isEditingTarget,
  moveDirectionalFocus,
  NAVIGATION_REPEAT,
  readGamepadIntent,
} from "~/lib/input-navigation";

const ARROWS = {
  ArrowLeft: "left",
  ArrowRight: "right",
  ArrowUp: "up",
  ArrowDown: "down",
};

export default function InputNavigation() {
  onMount(() => {
    const root = document.documentElement;
    const held = new Map();
    let frame = 0;

    const revealFocus = () => root.classList.add("input-navigation-active");
    const hideFocus = () => root.classList.remove("input-navigation-active");

    const onKeyDown = (event) => {
      const direction = ARROWS[event.key];
      if (!direction || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      if (isEditingTarget(event.target)) return;
      if (!moveDirectionalFocus(direction)) return;
      event.preventDefault();
      revealFocus();
    };

    const fireWithRepeat = (key, active, now, action) => {
      if (!active) {
        held.delete(key);
        return;
      }
      const next = held.get(key);
      if (next === undefined) {
        held.set(key, now + NAVIGATION_REPEAT.initialDelay);
        action();
        return;
      }
      if (now >= next) {
        held.set(key, now + NAVIGATION_REPEAT.interval);
        action();
      }
    };

    const closeOrGoBack = () => {
      const overlay = document.querySelector("[role='dialog'], [aria-modal='true']");
      if (overlay) {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        return;
      }
      window.history.back();
    };

    const poll = (now) => {
      const pads = navigator.getGamepads?.() || [];
      const gamepad = [...pads].find((pad) => pad?.connected);
      if (gamepad) {
        const intent = readGamepadIntent(gamepad);
        for (const direction of ["left", "right", "up", "down"]) {
          fireWithRepeat(direction, intent[direction], now, () => {
            revealFocus();
            moveDirectionalFocus(direction);
          });
        }
        fireWithRepeat("activate", intent.activate, now, () => {
          revealFocus();
          activateFocused();
        });
        fireWithRepeat("back", intent.back, now, closeOrGoBack);
      } else {
        held.clear();
      }
      frame = requestAnimationFrame(poll);
    };

    const startPolling = () => {
      if (!frame) frame = requestAnimationFrame(poll);
    };
    const stopPollingIfEmpty = () => {
      const connected = [...(navigator.getGamepads?.() || [])].some((pad) => pad?.connected);
      if (!connected && frame) {
        cancelAnimationFrame(frame);
        frame = 0;
        held.clear();
      }
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    window.addEventListener("pointerdown", hideFocus, { passive: true });
    window.addEventListener("gamepadconnected", startPolling);
    window.addEventListener("gamepaddisconnected", stopPollingIfEmpty);

    if ([...(navigator.getGamepads?.() || [])].some((pad) => pad?.connected)) startPolling();

    onCleanup(() => {
      window.removeEventListener("keydown", onKeyDown, { capture: true });
      window.removeEventListener("pointerdown", hideFocus);
      window.removeEventListener("gamepadconnected", startPolling);
      window.removeEventListener("gamepaddisconnected", stopPollingIfEmpty);
      if (frame) cancelAnimationFrame(frame);
      held.clear();
      hideFocus();
    });
  });

  // Intentionally no visible UI: controller navigation is a hidden enhancement.
  return null;
}
