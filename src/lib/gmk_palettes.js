/* ──────────────────────────────────────────────────────────────
   GMK canonical web colourway database.

   These hex strings are LOCKED. They are the authoritative web
   targets for each keyset and must never be altered, pastelised,
   saturated, rounded or replaced by generated values.

   Derived UI colours (dim surfaces, glass tints, hover states,
   3D lighting) may be computed FROM these values — never over
   the top of them.
   ────────────────────────────────────────────────────────────── */

export const gmk_colorways = {
	olivia: {
		pink: "#F1BEB0",
		cream: "#E1DBD1",
		dark: "#2B2B2B",
	},

	red_alert: {
		red: "#BC251E",
		cream: "#E1DBD1",
		beige: "#ACA693",
	},

	gmk_8008: {
		dark: "#353A45",
		blue_grey: "#5A6270",
		pink: "#F27C9C",
		light: "#D8DDE5",
	},

	hyperfuse: {
		alpha: "#C6C9C7",
		dark: "#67635B",
		cyan: "#00A4A9",
		purple: "#5D437E",
	},

	darling: {
		pink: "#F6CED4",
		red: "#BB1E10",
		dark_red: "#8D1D2C",
		white: "#F7F2EA",
	},

	metropolis: {
		navy: "#081F2C",
		cyan: "#3CDBC0",
		yellow: "#F1BE48",
		red: "#E03C31",
	},

	shinseiki: {
		purple: "#493B57",
		green: "#A6CE39",
		red: "#D83A3A",
		light: "#E8E5EA",
	},

	nord: {
		dark_0: "#2E3440",
		dark_1: "#3B4252",
		blue_dark: "#5E81AC",
		blue: "#81A1C1",
		cyan: "#88C0D0",
		light: "#D8DEE9",
	},

	camping: {
		green: "#00773A",
		cream: "#EEE2D0",
		red: "#8D242F",
		brown: "#653C25",
	},

	wob: {
		black: "#171718",
		white: "#F7F2EA",
	},

	monochrome: {
		white: "#EAECF0",
		black: "#171718",
	},

	prussian_alert: {
		blue: "#2D4955",
		grey: "#A3A3A3",
		white: "#D7D7D5",
	},
};

/* Explicit UI role mapping per keyset — written out rather than generated,
   so no theme logic can drift the canonical values. `swatches` is the
   multi-segment preview shown in the colourway selector. */
const C = gmk_colorways;

export const gmk_ui = {
	olivia: {
		name: "GMK Olivia++",
		background: C.olivia.cream,
		foreground: C.olivia.dark,
		surface: C.olivia.cream,
		accent: C.olivia.pink,
		accent_secondary: C.olivia.dark,
		dark: false,
		swatches: [C.olivia.pink, C.olivia.cream, C.olivia.dark],
	},
	olivia_dark: {
		name: "GMK Olivia++ Dark",
		background: C.olivia.dark,
		foreground: C.olivia.cream,
		surface: C.olivia.dark,
		accent: C.olivia.pink,
		accent_secondary: C.olivia.cream,
		dark: true,
		swatches: [C.olivia.pink, C.olivia.dark, C.olivia.cream],
	},
	red_alert: {
		name: "GMK Red Alert",
		background: C.red_alert.cream,
		foreground: "#171718",
		surface: C.red_alert.beige,
		accent: C.red_alert.red,
		accent_secondary: C.red_alert.beige,
		dark: false,
		swatches: [C.red_alert.red, C.red_alert.cream, C.red_alert.beige],
	},
	gmk_8008: {
		name: "GMK 8008",
		background: C.gmk_8008.dark,
		foreground: C.gmk_8008.light,
		surface: C.gmk_8008.blue_grey,
		accent: C.gmk_8008.pink,
		accent_secondary: C.gmk_8008.blue_grey,
		dark: true,
		swatches: [C.gmk_8008.dark, C.gmk_8008.blue_grey, C.gmk_8008.pink, C.gmk_8008.light],
	},
	hyperfuse: {
		name: "GMK Hyperfuse",
		background: C.hyperfuse.dark,
		foreground: C.hyperfuse.alpha,
		surface: C.hyperfuse.dark,
		accent: C.hyperfuse.cyan,
		accent_secondary: C.hyperfuse.purple,
		dark: true,
		swatches: [C.hyperfuse.alpha, C.hyperfuse.dark, C.hyperfuse.cyan, C.hyperfuse.purple],
	},
	darling: {
		name: "GMK Darling",
		background: C.darling.pink,
		foreground: C.darling.dark_red,
		surface: C.darling.white,
		accent: C.darling.red,
		accent_secondary: C.darling.dark_red,
		dark: false,
		swatches: [C.darling.pink, C.darling.red, C.darling.dark_red, C.darling.white],
	},
	metropolis: {
		name: "GMK Metropolis",
		background: C.metropolis.navy,
		foreground: "#F4F4F2",
		surface: C.metropolis.navy,
		accent: C.metropolis.cyan,
		accent_secondary: C.metropolis.yellow,
		accent_tertiary: C.metropolis.red,
		dark: true,
		swatches: [C.metropolis.navy, C.metropolis.cyan, C.metropolis.yellow, C.metropolis.red],
	},
	shinseiki: {
		name: "GMK Shinseiki",
		background: C.shinseiki.purple,
		foreground: C.shinseiki.light,
		surface: C.shinseiki.purple,
		accent: C.shinseiki.green,
		accent_secondary: C.shinseiki.red,
		dark: true,
		swatches: [C.shinseiki.purple, C.shinseiki.green, C.shinseiki.red, C.shinseiki.light],
	},
	nord: {
		name: "GMK Nord",
		background: C.nord.dark_0,
		foreground: C.nord.light,
		surface: C.nord.dark_1,
		accent: C.nord.cyan,
		accent_secondary: C.nord.blue,
		accent_tertiary: C.nord.blue_dark,
		dark: true,
		swatches: [C.nord.dark_0, C.nord.dark_1, C.nord.blue_dark, C.nord.blue, C.nord.cyan, C.nord.light],
	},
	camping: {
		name: "GMK Camping",
		background: C.camping.cream,
		foreground: C.camping.brown,
		surface: C.camping.cream,
		accent: C.camping.green,
		accent_secondary: C.camping.red,
		dark: false,
		swatches: [C.camping.green, C.camping.cream, C.camping.red, C.camping.brown],
	},
	wob: {
		name: "GMK WoB",
		background: C.wob.black,
		foreground: C.wob.white,
		surface: C.wob.black,
		accent: C.wob.white,
		// derived chrome tone: canonical white has no contrast on the black page
		accent_ui: "#3A3A3B",
		accent_secondary: C.wob.white,
		dark: true,
		swatches: [C.wob.black, C.wob.white],
	},
	monochrome: {
		name: "GMK Monochrome",
		background: C.monochrome.white,
		foreground: C.monochrome.black,
		surface: C.monochrome.white,
		accent: C.monochrome.black,
		accent_secondary: C.monochrome.black,
		dark: false,
		swatches: [C.monochrome.white, C.monochrome.black],
	},
	prussian_alert: {
		name: "GMK Prussian Alert",
		background: C.prussian_alert.white,
		foreground: "#171718",
		surface: C.prussian_alert.grey,
		accent: C.prussian_alert.blue,
		accent_secondary: C.prussian_alert.grey,
		dark: false,
		swatches: [C.prussian_alert.blue, C.prussian_alert.grey, C.prussian_alert.white],
	},
};