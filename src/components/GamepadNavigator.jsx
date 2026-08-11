import { useEffect, useRef, useState } from "react";
import { classify_gamepad, action_binding } from "@/lib/gamepad_profiles";
import { find_neighbour } from "@/lib/gamepad_nav";
import { playHover, playClick, playMenuClose } from "@/lib/sound";
import ControllerHints from "@/components/ControllerHints";

const DEADZONE = 0.45;
const REPEAT_FIRST = 380;
const REPEAT_NEXT = 130;

/*
 * Gamepad polling only runs while a pad is actually connected — an idle rAF
 * loop calling getGamepads() every frame is pure waste on the 99% of visits
 * that never plug anything in.
 */
export default function GamepadNavigator() {
	const [family, setFamily] = useState(null);
	const [active, setActive] = useState(false);
	const state = useRef({ dir: null, next_at: 0, buttons: {} });

	useEffect(() => {
		if (typeof navigator === "undefined" || !navigator.getGamepads) return;
		let raf = null;

		const rumble = (pad, strength) => {
			const a = pad.vibrationActuator;
			if (!a || !a.playEffect) return;
			a.playEffect("dual-rumble", {
				duration: 60, strongMagnitude: strength, weakMagnitude: strength * 0.5,
			}).catch(() => {});
		};

		const move = (dir) => {
			const el = find_neighbour(document.activeElement, dir);
			if (!el) return;
			el.focus({ preventScroll: true });
			el.scrollIntoView({ block: "center", behavior: "smooth" });
			playHover();
		};

		const press = (pad, index, fn) => {
			const down = !!pad.buttons[index]?.pressed;
			const was = state.current.buttons[index];
			state.current.buttons[index] = down;
			if (down && !was) fn(pad);
		};

		const poll = () => {
			const pads = navigator.getGamepads?.() || [];
			const pad = Array.from(pads).find(Boolean);
			if (!pad) {
				raf = requestAnimationFrame(poll);
				return;
			}

			const fam = classify_gamepad(pad.id);
			setFamily((f) => (f === fam ? f : fam));

			const ax = pad.axes[0] || 0;
			const ay = pad.axes[1] || 0;
			let dir = null;
			if (pad.buttons[12]?.pressed || ay < -DEADZONE) dir = "up";
			else if (pad.buttons[13]?.pressed || ay > DEADZONE) dir = "down";
			else if (pad.buttons[14]?.pressed || ax < -DEADZONE) dir = "left";
			else if (pad.buttons[15]?.pressed || ax > DEADZONE) dir = "right";

			const now = performance.now();
			const s = state.current;
			if (dir) {
				setActive(true);
				if (s.dir !== dir) {
					s.dir = dir;
					s.next_at = now + REPEAT_FIRST;
					move(dir);
				} else if (now >= s.next_at) {
					s.next_at = now + REPEAT_NEXT;
					move(dir);
				}
			} else {
				s.dir = null;
			}

			const confirm = action_binding(fam, "confirm").index;
			const cancel = action_binding(fam, "cancel").index;
			press(pad, confirm, (p) => {
				setActive(true);
				const el = document.activeElement;
				if (el && el !== document.body) {
					playClick();
					rumble(p, 0.35);
					el.click();
				}
			});
			press(pad, cancel, (p) => {
				setActive(true);
				playMenuClose();
				rumble(p, 0.18);
				document.activeElement?.blur?.();
				window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
			});

			raf = requestAnimationFrame(poll);
		};

		const on_connect = () => {
			if (raf === null) raf = requestAnimationFrame(poll);
		};
		const on_disconnect = () => {
			const any = Array.from(navigator.getGamepads?.() || []).some(Boolean);
			if (any) return;
			if (raf) cancelAnimationFrame(raf);
			raf = null;
			setActive(false);
			setFamily(null);
		};
		const on_pointer = () => setActive(false);

		window.addEventListener("gamepadconnected", on_connect);
		window.addEventListener("gamepaddisconnected", on_disconnect);
		window.addEventListener("mousemove", on_pointer, { passive: true });
		if (Array.from(navigator.getGamepads?.() || []).some(Boolean)) on_connect();

		return () => {
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener("gamepadconnected", on_connect);
			window.removeEventListener("gamepaddisconnected", on_disconnect);
			window.removeEventListener("mousemove", on_pointer);
		};
	}, []);

	useEffect(() => {
		document.body.classList.toggle("gamepad-active", active);
	}, [active]);

	if (!family || !active) return null;
	return <ControllerHints family={family} />;
}