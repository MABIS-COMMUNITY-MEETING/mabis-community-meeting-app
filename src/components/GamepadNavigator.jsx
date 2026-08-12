import { useEffect, useRef, useState } from "react";
import { action_binding } from "@/lib/gamepad_profiles";
import { resolve_profile, OVERRIDE_EVENT } from "@/lib/gamepad_detect";
import { SECTION_SELECTOR, collect_targets, find_neighbour, find_section, first_in_section, section_index } from "@/lib/gamepad_nav";
import { gamepad_back, top_overlay } from "@/lib/gamepad_back";
import { useNavigate, useLocation } from "react-router-dom";
import { playHover, playClick, playMenuClose } from "@/lib/sound";
import ControllerHints from "@/components/ControllerHints";

const DEADZONE = 0.3;
const REPEAT_FIRST = 300;
const REPEAT_NEXT = 110;
const TEXTY = ["text", "email", "password", "search", "url", "tel", "number", "date", "time"];

/* Any meaningful intent from a pad — used to pick the active controller. */
function pad_is_active(pad) {
	if (pad.buttons.some((b) => b.pressed)) return true;
	return pad.axes.some((a) => Math.abs(a) > DEADZONE);
}

/*
 * Gamepad polling only runs while a pad is actually connected — an idle rAF
 * loop calling getGamepads() every frame is pure waste on the 99% of visits
 * that never plug anything in.
 */
export default function GamepadNavigator() {
	const [profile, setProfile] = useState(null);
	const [active, setActive] = useState(false);
	const [inside, setInside] = useState(false);
	const state = useRef({ dir: null, next_at: 0, buttons: {}, pad_index: null, entered: null });
	const navigate = useNavigate();
	const location = useLocation();
	/* the poll loop is created once — keep routing info fresh through a ref */
	const nav = useRef({ navigate, pathname: location.pathname });
	nav.current = { navigate, pathname: location.pathname };

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

		const focus_el = (el) => {
			if (!el) return;
			/* clickable divs (role="button") aren't focusable by default */
			if (!el.hasAttribute("tabindex") && !/^(A|BUTTON|INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) {
				el.setAttribute("tabindex", "-1");
			}
			el.focus({ preventScroll: true });
			el.scrollIntoView({ block: "center", behavior: "auto", inline: "nearest" });
		};

		const move = (dir) => {
			const entered = state.current.entered;
			/* a dialog or full-screen widget owns input while it is open */
			const overlay = top_overlay();
			if (overlay) {
				const el = find_neighbour(document.activeElement, dir, overlay);
				if (el && el !== document.activeElement) focus_el(el);
				return;
			}
			if (!entered) {
				/* pages without editorial sections (history, feedback, auth, modals
				   over them) navigate their controls directly */
				const has_sections = document.querySelector("[data-gp-section]");
				if (!has_sections) {
					const el = find_neighbour(document.activeElement, dir, null);
					if (el && el !== document.activeElement) focus_el(el);
					return;
				}
				if (dir === "left" || dir === "right") return;
				/* focus can be lost (a modal closed, an element re-rendered) — remember
				   both the last section and its position so the walk stays in order */
				const remembered = state.current.section?.isConnected ? state.current.section : null;
				const cur = document.activeElement?.closest?.(SECTION_SELECTOR) || remembered;
				const section = find_section(cur, dir, state.current.section_i ?? -1);
				if (section) {
					state.current.section = section;
					state.current.section_i = section_index(section);
					focus_el(section);
				}
				return;
			}
			const control = find_neighbour(document.activeElement, dir, entered);
			if (control && control !== document.activeElement) { focus_el(control); return; }
			/* dead end inside a section — step back out rather than trapping focus */
			if (dir === "up" || dir === "down") {
				exit_section();
				const section = find_section(document.activeElement, dir, state.current.section_i ?? -1);
				if (section) {
					state.current.section = section;
					state.current.section_i = section_index(section);
					focus_el(section);
				}
			}
		};

		const enter_section = (section) => {
			const first = first_in_section(section);
			if (!first) return;
			/* a section holding a single control (e.g. Start Meeting) is that
			   control — press it and stay at section level, never trap focus */
			if (collect_targets(section).length === 1) { first.click(); return; }
			state.current.entered = section;
			setInside(true);
			focus_el(first);
		};

		const exit_section = () => {
			const section = state.current.entered;
			state.current.entered = null;
			setInside(false);
			if (section?.hasAttribute?.("data-gp-section")) {
				state.current.section = section;
				state.current.section_i = section_index(section);
			}
			if (section) focus_el(section, "start");
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
			/* the pad most recently producing intentional input owns the UI */
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
			if (!pad) {
				raf = requestAnimationFrame(poll);
				return;
			}

			const next = resolve_profile(pad);
			setProfile((p) =>
				p && p.family === next.family && p.mode === next.mode && p.id === next.id ? p : next
			);
			const family = next.family;

			const ax = pad.axes[0] || 0;
			const ay = pad.axes[1] || 0;
			let dir = null;
			if (pad.buttons[12]?.pressed) dir = "up";
			else if (pad.buttons[13]?.pressed) dir = "down";
			else if (pad.buttons[14]?.pressed) dir = "left";
			else if (pad.buttons[15]?.pressed) dir = "right";
			else if (Math.max(Math.abs(ax), Math.abs(ay)) > DEADZONE) {
				/* Lock diagonals to their dominant axis so one tilt is one movement. */
				if (Math.abs(ay) >= Math.abs(ax)) dir = ay < 0 ? "up" : "down";
				else dir = ax < 0 ? "left" : "right";
			}

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

			press(pad, action_binding(family, "confirm").index, (p) => {
				setActive(true);
				const el = document.activeElement;
				if (!el || el === document.body) return;
				playClick();
				rumble(p, 0.35);
				if (el.hasAttribute?.("data-gp-section")) {
					enter_section(el);
					return;
				}
				/* text fields do nothing useful on click — checkboxes and radios must
				   still toggle, so only skip the typing ones */
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

			/* Menu / Options / + jumps focus up into the site header bar */
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

			/* right stick scrolls the page — eased so small tilts creep and full
			   tilt travels fast */
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
		/* manual glyph override changes must take effect without a reload */
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

	useEffect(() => {
		document.body.classList.toggle("gamepad-active", active);
	}, [active]);

	if (!profile || !active) return null;
	return <ControllerHints profile={profile} inside={inside} />;
}