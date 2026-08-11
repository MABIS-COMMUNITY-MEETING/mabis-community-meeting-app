/*
 * Controller family classification.
 *
 * Gamepad.id strings differ wildly between browser, OS and driver (Chrome on
 * Linux reports raw HID names, Firefox reports vendor/product ids). So we match
 * loosely on both name fragments and known vendor ids, and — per spec — fall
 * back to the Xbox layout for anything we cannot identify. Never show a "?".
 */

export const FAMILY_XBOX = "xbox";
export const FAMILY_PLAYSTATION = "playstation";
export const FAMILY_NINTENDO = "nintendo";

const PLAYSTATION_HINTS = [
	"dualsense", "dualshock", "playstation", "sony", "ps5", "ps4", "ps3",
	"054c", "wireless controller",
];
const NINTENDO_HINTS = [
	"nintendo", "switch pro", "joy-con", "joycon", "pro controller", "057e",
];
const XBOX_HINTS = [
	"xbox", "xinput", "microsoft", "045e",
];

export function classify_gamepad(id) {
	const s = (id || "").toLowerCase();
	if (PLAYSTATION_HINTS.some((h) => s.includes(h))) return FAMILY_PLAYSTATION;
	if (NINTENDO_HINTS.some((h) => s.includes(h))) return FAMILY_NINTENDO;
	if (XBOX_HINTS.some((h) => s.includes(h))) return FAMILY_XBOX;
	return FAMILY_XBOX; /* unknown device → Xbox glyphs */
}

/*
 * Semantic action → physical button, per family. Nintendo swaps the east/south
 * face buttons relative to the standard mapping, so confirm/cancel must swap
 * with it — labels alone would lie about which button to press.
 */
const ACTION_MAP = {
	[FAMILY_XBOX]: {
		confirm: { label: "A", shape: "circle", tone: "confirm", index: 0 },
		cancel: { label: "B", shape: "circle", tone: "cancel", index: 1 },
		menu: { label: "☰", shape: "pill", tone: "neutral", index: 9 },
		prev: { label: "LB", shape: "shoulder", tone: "neutral", index: 4 },
		next: { label: "RB", shape: "shoulder", tone: "neutral", index: 5 },
	},
	[FAMILY_PLAYSTATION]: {
		confirm: { label: "✕", shape: "circle", tone: "confirm", index: 0 },
		cancel: { label: "○", shape: "circle", tone: "cancel", index: 1 },
		menu: { label: "≡", shape: "pill", tone: "neutral", index: 9 },
		prev: { label: "L1", shape: "shoulder", tone: "neutral", index: 4 },
		next: { label: "R1", shape: "shoulder", tone: "neutral", index: 5 },
	},
	[FAMILY_NINTENDO]: {
		confirm: { label: "A", shape: "circle", tone: "confirm", index: 1 },
		cancel: { label: "B", shape: "circle", tone: "cancel", index: 0 },
		menu: { label: "+", shape: "pill", tone: "neutral", index: 9 },
		prev: { label: "L", shape: "shoulder", tone: "neutral", index: 4 },
		next: { label: "R", shape: "shoulder", tone: "neutral", index: 5 },
	},
};

export function action_binding(family, action) {
	const map = ACTION_MAP[family] || ACTION_MAP[FAMILY_XBOX];
	return map[action] || map.confirm;
}

export const FAMILY_LABEL = {
	[FAMILY_XBOX]: "XBOX",
	[FAMILY_PLAYSTATION]: "PLAYSTATION",
	[FAMILY_NINTENDO]: "NINTENDO",
};