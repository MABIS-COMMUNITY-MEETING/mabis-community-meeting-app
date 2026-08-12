import { useEffect, useRef, useState } from "react";
import { action_binding } from "@/lib/gamepad_profiles";
import { resolve_profile, OVERRIDE_EVENT } from "@/lib/gamepad_detect";
import {
	collect_targets, find_neighbour, first_in_section,
	nearest_section_index, section_at, section_count, index_of_section,
} from "@/lib/gamepad_nav";
import { gamepad_back, top_overlay } from "@/lib/gamepad_back";
import { useNavigate, useLocation } from "react-router-dom";
import { playClick, playMenuClose } from "@/lib/sound";
import ControllerHints from "@/components/ControllerHints";

const DEADZONE = 0.3;
const REPEAT_FIRST = 300;
const REPEAT_NEXT = 140;
const TEXTY = ["text", "email", "password", "search", "url", "tel", "number", "date", "time"];

function pad_is_active(pad) {
	if (pad.buttons.some((b) => b.pressed)) return true;
	return pad.axes.some((a) => Math.abs(a) > DEADZONE);
}

export default function GamepadNavigator() {
	const [profile, setProfile] = useState(null);
	const [active, setActive] = useState(false);
	const [inside, setInside] = useState(false);
	/* section_i is the single source of truth for the section walk */
	const state = useRef({ dir: null, next_at: 0, buttons: {}, pad_index: null, entered: null, section_i: -1 });
	const navigate = useNavigate();
	const location = useLocation();
	const nav = useRef({ navigate, pathname: location.pathname });
	nav.current = { navigate, pathname: location.pathname };

	useEffect(() => {
		if (typeof navigator === "undefined" || !navigator.getGamepads) return;
		let raf = null;

		const rumble = (pad, strength) => {
			const a = pad.vibrationActuator;
			if (!a || !a.playEffect) return;
			a.playEffect("dual-rumble", { duration: 60, strongMagnitude: strength, weakMagnitude: strength * 0.5 }).catch(() => {});
		};

		const focus_el = (el) => {
			if (!el) return;
			if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
				el.setAttribute("tabindex", "-1");
			}
			el.focus({ preventScroll: true });
			el.scrollIntoView({ block: "center", behavior: "auto", inline: "nearest" });
		};

		/* move the section cursor by ±1 and focus whatever now sits there */
		const step_section = (delta) => {
			const total = section_count();
			if (!total) return;
			const s = state.current;
			if (s.section_i < 0) s.section_i = nearest_section_index();
			else s.section_i = Math.max(0, Math.min(total - 1, s.section_i + delta));
			focus_el(section_at(s.section_i));
		};

		const enter_section = (section) => {
			const first = first_in_section(section);
			if (!first) return;
			/* a section holding one control is that control */
			if (collect_targets(section).length === 1) { first.click(); return; }
			state.current.entered = section;
			setInside(true);
			focus_el(first);
		};

		const exit_section = () => {
			const section = state.current.entered;
			state.current.entered = null;
			setInside(false);
			if (section) {
				const i = index_of_section(section);
				if (i >= 0) state.current.section_i = i;
				focus_el(section);
			}
		};

		const move = (dir) => {
			const s = state.current;
			/* a dialog or full-screen widget owns input while open */
			const overlay = top_overlay();
			if (overlay) {
				const el = find_neighbour(document.activeElement, dir, overlay);
				if (el && el !== document.activeElement) focus_el(el);
				return;
			}

			/* a section whose DOM was replaced must not trap input */
			if (s.entered && !s.entered.isConnected) { s.entered = null; setInside(false); }

			if (s.entered) {
				const control = find_neighbour(document.activeElement, dir, s.entered);
				if (control && control !== document.activeElement) { focus_el(control); return; }
				if (dir === "up" || dir === "down") {
					exit_section();
					step_section(dir === "down" ? 1 : -1);
				}
				return;
			}

			/* pages without editorial sections navigate their controls directly */
			if (!section_count()) {
				const el = find_neighbour(document.activeElement, dir, null);
				if (el && el !== document.activeElement) focus_el(el);
				return;
			}

			if (dir === "left" || dir === "right") return;
			step_section(dir === "down" ? 1 : -1);
		};

		const press = (pad, index, fn) => {
			const down = !!pad.buttons[index]?.pressed;
			const was = state.current.buttons[index];
			state.current.buttons[index] = down;
			if (down && !was) fn(pad);
		};

		const pick_pad = () => {
			const pads = Array.from(navigator.getGamepads?.() || []).filter(Boolean);
			if (!pads.length) return null;
			const acting = pads.find(pad_is_active);
			if (acting) {
				if (state.current.pad_index !== acting.index) {
					state.current.pad_index = acting.index;
					state.current.buttons = {};
				}
				return acting;
			}
			return pads.find((p) => p.index === state.current.pad_index) || pads[0];
		};

		const poll = () => {
			const pad = pick_pad();
			if (!pad) { raf = requestAnimationFrame(poll); return; }

			const next = resolve_profile(pad);
			setProfile((p) => (p && p.family === next.family && p.mode === next.mode && p.id === next.id ? p : next));
			const family = next.family;

			const ax = pad.axes[0] || 0;
			const ay = pad.axes[1] || 0;
			let dir = null;
			if (pad.buttons[12]?.pressed) dir = "up";
			else if (pad.buttons[13]?.pressed) dir = "down";
			else if (pad.buttons[14]?.pressed) dir = "left";
			else if (pad.buttons[15]?.pressed) dir = "right";
			else if (Math.max(Math.abs(ax), Math.abs(ay)) > DEADZONE) {
				if (Math.abs(ay) >= Math.abs(ax)) dir = ay < 0 ? "up" : "down";
				else dir = ax < 0 ? "left" : "right";
			}

			const now = performance.now();
			const s = state.current;
			if (dir) {
				setActive(true);
				if (s.dir !== dir) { s.dir = dir; s.next_at = now + REPEAT_FIRST; move(dir); }
				else if (now >= s.next_at) { s.next_at = now + REPEAT_NEXT; move(dir); }
			} else {
				s.dir = null;
			}

			press(pad, action_binding(family, "confirm").index, (p) => {
				setActive(true);
				const el = document.activeElement;
				if (!el || el === document.body) return;
				playClick();
				rumble(p, 0.35);
				if (el.hasAttribute?.("data-gp-section")) { enter_section(el); return; }
				if (el.tagName === "TEXTAREA") return;
				if (el.tagName === "INPUT" && TEXTY.includes((el.type || "text").toLowerCase())) return;
				el.click();
			});

			press(pad, action_binding(family, "cancel").index, (p) => {
				setActive(true);
				playMenuClose();
				rumble(p, 0.18);
				gamepad_back({
					entered: state.current.entered,
					exit_section,
					leave_page: () => {
						const { navigate: go, pathname } = nav.current;
						if (pathname === "/" || pathname === "/home") return;
						go(-1);
					},
				});
			});

			/* − / View / Share drops focus into the site header bar */
			press(pad, action_binding(family, "menu").index, (p) => {
				setActive(true);
				rumble(p, 0.22);
				const header = document.querySelector("header");
				const first = header && first_in_section(header);
				if (!first) return;
				state.current.entered = header;
				setInside(true);
				focus_el(first);
			});

			/* + / Menu / Options opens the site navigation overlay */
			press(pad, action_binding(family, "start").index, (p) => {
				setActive(true);
				rumble(p, 0.22);
				window.dispatchEvent(new CustomEvent("gamepadMenu"));
			});

			/* right stick scrolls the page */
			const ry = pad.axes[3] || 0;
			if (Math.abs(ry) > 0.12) {
				const eased = Math.sign(ry) * Math.pow((Math.abs(ry) - 0.12) / 0.88, 2) * 30;
				document.scrollingElement.scrollTop += eased;
			}

			raf = requestAnimationFrame(poll);
		};

		const on_connect = () => { if (raf === null) raf = requestAnimationFrame(poll); };
		const on_disconnect = () => {
			const any = Array.from(navigator.getGamepads?.() || []).some(Boolean);
			if (any) return;
			if (raf) cancelAnimationFrame(raf);
			raf = null;
			setActive(false);
			setProfile(null);
			state.current.pad_index = null;
		};
		const on_pointer = () => setActive(false);
		const on_override = () => setProfile(null);

		window.addEventListener("gamepadconnected", on_connect);
		window.addEventListener("gamepaddisconnected", on_disconnect);
		window.addEventListener("pointermove", on_pointer, { passive: true });
		window.addEventListener(OVERRIDE_EVENT, on_override);
		if (Array.from(navigator.getGamepads?.() || []).some(Boolean)) on_connect();

		return () => {
			if (raf) cancelAnimationFrame(raf);
			window.removeEventListener("gamepadconnected", on_connect);
			window.removeEventListener("gamepaddisconnected", on_disconnect);
			window.removeEventListener("pointermove", on_pointer);
			window.removeEventListener(OVERRIDE_EVENT, on_override);
		};
	}, []);

	/* a route change invalidates the section cursor */
	useEffect(() => {
		state.current.section_i = -1;
		state.current.entered = null;
		setInside(false);
	}, [location.pathname]);

	useEffect(() => {
		document.body.classList.toggle("gamepad-active", active);
	}, [active]);

	if (!profile || !active) return null;
	return <ControllerHints profile={profile} inside={inside} />;
}