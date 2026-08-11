/*
 * Centralised controller input-mode detection.
 *
 * The browser Gamepad API exposes no "input_api" property, so the effective
 * mode is inferred from the strongest available evidence in `id` / `mapping`,
 * scored by confidence. Detection lives here only — UI components consume the
 * resolved glyph family and never run their own regexes.
 *
 *   xinput -> xbox glyphs
 *   dinput -> playstation glyphs
 *   switch -> nintendo glyphs
 *   unknown -> xbox glyphs (always the safe fallback)
 */

import { FAMILY_XBOX, FAMILY_PLAYSTATION, FAMILY_NINTENDO } from "@/lib/gamepad_profiles";

export const MODE_XINPUT = "xinput";
export const MODE_DINPUT = "dinput";
export const MODE_SWITCH = "switch";
export const MODE_UNKNOWN = "unknown";

const OVERRIDE_KEY = "mabis_glyph_override";
export const OVERRIDE_EVENT = "mabis-glyph-override";

export function get_glyph_override() {
	const v = typeof localStorage !== "undefined" ? localStorage.getItem(OVERRIDE_KEY) : null;
	return v === FAMILY_XBOX || v === FAMILY_PLAYSTATION || v === FAMILY_NINTENDO ? v : null;
}

export function set_glyph_override(family) {
	if (family) localStorage.setItem(OVERRIDE_KEY, family);
	else localStorage.removeItem(OVERRIDE_KEY);
	window.dispatchEvent(new CustomEvent(OVERRIDE_EVENT));
}

/* ── evidence tables ───────────────────────────────────────────── */

const MODE_SIGNALS = [
	/* explicit mode wording is the strongest signal a browser ever gives us */
	{ mode: MODE_XINPUT, weight: 5, hints: ["xinput", "x-input", "xusb", "xbox 360 controller", "microsoft x-box"] },
	{ mode: MODE_DINPUT, weight: 5, hints: ["dinput", "directinput", "d-input", "hid-compliant game controller"] },
	{ mode: MODE_SWITCH, weight: 5, hints: ["switch pro", "pro controller", "joy-con", "joycon", "nintendo switch", "057e"] },
	/* mode-specific product names used by third-party pads */
	{ mode: MODE_XINPUT, weight: 3, hints: ["8bitdo ... xinput", "ultimate wireless", "controller (xbox"] },
	{ mode: MODE_DINPUT, weight: 3, hints: ["generic usb joystick", "usb gamepad", "twin usb"] },
];

const FAMILY_SIGNALS = [
	{ family: FAMILY_PLAYSTATION, hints: ["dualsense", "dualshock", "playstation", "sony", "ps5", "ps4", "ps3", "054c"] },
	{ family: FAMILY_NINTENDO, hints: ["nintendo", "switch", "joy-con", "joycon", "pro controller", "057e"] },
	{ family: FAMILY_XBOX, hints: ["xbox", "xinput", "microsoft", "045e", "xusb"] },
];

export function detect_native_family(id) {
	const s = (id || "").toLowerCase();
	for (const sig of FAMILY_SIGNALS) {
		if (sig.hints.some((h) => s.includes(h))) return sig.family;
	}
	return null;
}

/*
 * Returns { mode, confidence } — confidence 0..1. A single weak generic word
 * never classifies on its own; unmatched pads stay `unknown`.
 */
export function detect_input_mode(pad) {
	const s = (pad?.id || "").toLowerCase();
	if (!s) return { mode: MODE_UNKNOWN, confidence: 0 };

	let best = { mode: MODE_UNKNOWN, score: 0 };
	for (const sig of MODE_SIGNALS) {
		for (const h of sig.hints) {
			if (h.includes(" ... ")) {
				const [a, b] = h.split(" ... ");
				if (s.includes(a) && s.includes(b) && sig.weight > best.score) best = { mode: sig.mode, score: sig.weight };
			} else if (s.includes(h) && sig.weight > best.score) {
				best = { mode: sig.mode, score: sig.weight };
			}
		}
	}

	/* a non-standard mapping is weak corroboration of a DInput-style profile */
	if (best.score === 0 && pad?.mapping !== "standard" && (pad?.buttons?.length || 0) > 0) {
		best = { mode: MODE_DINPUT, score: 2 };
	}

	return { mode: best.mode, confidence: Math.min(best.score / 5, 1) };
}

/* Presentation decision — kept separate from detection. */
export function get_glyph_family(mode, native_family, override = get_glyph_override()) {
	if (override) return override;
	if (mode === MODE_XINPUT) return FAMILY_XBOX;
	if (mode === MODE_DINPUT) return FAMILY_PLAYSTATION;
	if (mode === MODE_SWITCH) return FAMILY_NINTENDO;
	if (native_family) return native_family;
	return FAMILY_XBOX;
}

/* One call for the whole subsystem. */
export function resolve_profile(pad) {
	const { mode, confidence } = detect_input_mode(pad);
	const native = detect_native_family(pad?.id);
	const override = get_glyph_override();
	return {
		id: pad?.id || "",
		mapping: pad?.mapping || "custom",
		buttons: pad?.buttons?.length || 0,
		axes: pad?.axes?.length || 0,
		index: pad?.index ?? -1,
		mode,
		confidence,
		native_family: native,
		family: get_glyph_family(mode, native, override),
		override,
	};
}

export const MODE_LABEL = {
	[MODE_XINPUT]: "XINPUT",
	[MODE_DINPUT]: "DINPUT",
	[MODE_SWITCH]: "SWITCH",
	[MODE_UNKNOWN]: "UNKNOWN",
};