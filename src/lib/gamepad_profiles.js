/*
 * Glyph families and semantic action → physical button bindings.
 *
 * Detection lives in gamepad_detect.js; this file is presentation + mapping
 * only. Semantic actions come first (ui_accept / ui_cancel / ui_secondary /
 * ui_tertiary), then the physical index, then the glyph for the active family.
 */

export const FAMILY_XBOX = "xbox";
export const FAMILY_PLAYSTATION = "playstation";
export const FAMILY_NINTENDO = "nintendo";

/*
 * Standard-mapping indices: 0 = south, 1 = east, 2 = west, 3 = north.
 * Nintendo's physical A/B and X/Y sit mirrored, so its labels are attached to
 * the opposite indices — the prompt must name the button you actually press.
 */
const ACTION_MAP = {
	[FAMILY_XBOX]: {
		confirm: { label: "A", shape: "circle", index: 0 },
		cancel: { label: "B", shape: "circle", index: 1 },
		secondary: { label: "X", shape: "circle", index: 2 },
		tertiary: { label: "Y", shape: "circle", index: 3 },
		menu: { label: "VIEW", shape: "pill", index: 8 },
		prev: { label: "LB", shape: "shoulder", index: 4 },
		next: { label: "RB", shape: "shoulder", index: 5 },
	},
	[FAMILY_PLAYSTATION]: {
		confirm: { label: "✕", shape: "circle", index: 0 },
		cancel: { label: "○", shape: "circle", index: 1 },
		secondary: { label: "□", shape: "circle", index: 2 },
		tertiary: { label: "△", shape: "circle", index: 3 },
		menu: { label: "SHARE", shape: "pill", index: 8 },
		prev: { label: "L1", shape: "shoulder", index: 4 },
		next: { label: "R1", shape: "shoulder", index: 5 },
	},
	[FAMILY_NINTENDO]: {
		confirm: { label: "A", shape: "circle", index: 1 },
		cancel: { label: "B", shape: "circle", index: 0 },
		secondary: { label: "Y", shape: "circle", index: 2 },
		tertiary: { label: "X", shape: "circle", index: 3 },
		menu: { label: "−", shape: "pill", index: 8 },
		prev: { label: "L", shape: "shoulder", index: 4 },
		next: { label: "R", shape: "shoulder", index: 5 },
	},
};

export function action_binding(family, action) {
	const map = ACTION_MAP[family] || ACTION_MAP[FAMILY_XBOX];
	return map[action] || map.confirm;
}

/* legacy id-only helper — prefer resolve_profile() from gamepad_detect.js */
export function classify_gamepad(id) {
	const s = (id || "").toLowerCase();
	if (["dualsense", "dualshock", "playstation", "sony", "054c"].some((h) => s.includes(h))) return FAMILY_PLAYSTATION;
	if (["nintendo", "switch", "joy-con", "joycon", "057e"].some((h) => s.includes(h))) return FAMILY_NINTENDO;
	return FAMILY_XBOX;
}

export const FAMILY_LABEL = {
	[FAMILY_XBOX]: "XBOX",
	[FAMILY_PLAYSTATION]: "PLAYSTATION",
	[FAMILY_NINTENDO]: "NINTENDO",
};