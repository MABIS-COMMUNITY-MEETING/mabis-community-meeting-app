/*
 * Shared semantic palette balancing.
 *
 * Canonical palettes stay untouched for stripes, previews and brand identity.
 * This module only chooses which distinct, usable colours feed semantic UI
 * roles such as primary/secondary/accent, member badges and legacy accent slots.
 */

const HUE_BUCKET_DEGREES = 18;
const NEUTRAL_SATURATION = 10;

function normalizeHex(value) {
    const hex = value.trim().toLowerCase();
    if (/^#[0-9a-f]{3}$/.test(hex)) {
        return `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}`;
    }
    return hex;
}

function hexToHslParts(hex) {
    const value = normalizeHex(hex).replace("#", "");
    if (!/^[0-9a-f]{6}$/.test(value)) return null;

    const r = parseInt(value.slice(0, 2), 16) / 255;
    const g = parseInt(value.slice(2, 4), 16) / 255;
    const b = parseInt(value.slice(4, 6), 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const lightness = (max + min) / 2;
    let hue = 0;
    let saturation = 0;

    if (max !== min) {
        const delta = max - min;
        saturation = lightness > 0.5
            ? delta / (2 - max - min)
            : delta / (max + min);
        if (max === r) hue = (g - b) / delta + (g < b ? 6 : 0);
        else if (max === g) hue = (b - r) / delta + 2;
        else hue = (r - g) / delta + 4;
        hue *= 60;
    }

    return { h: hue, s: saturation * 100, l: lightness * 100 };
}

function hslTextParts(value) {
    const match = value.trim().match(/^(?:hsl\()?\s*(-?\d+(?:\.\d+)?)\s*[ ,]\s*(\d+(?:\.\d+)?)%\s*[ ,]\s*(\d+(?:\.\d+)?)%\s*\)?$/i);
    if (!match) return null;
    return {
        h: ((Number(match[1]) % 360) + 360) % 360,
        s: Number(match[2]),
        l: Number(match[3]),
    };
}

export function colorParts(value) {
    if (typeof value !== "string") return null;
    return value.trim().startsWith("#") ? hexToHslParts(value) : hslTextParts(value);
}

export function hueDistance(a, b) {
    const delta = Math.abs(a - b) % 360;
    return Math.min(delta, 360 - delta);
}

function hslToRgb(value) {
    const parts = colorParts(value);
    if (!parts) return null;
    const h = parts.h / 360;
    const s = parts.s / 100;
    const l = parts.l / 100;
    if (s === 0) return [l, l, l];

    const hueToRgb = (p, q, input) => {
        let t = input;
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1 / 6) return p + (q - p) * 6 * t;
        if (t < 1 / 2) return q;
        if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
        return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

function relativeLuminance(rgb) {
    const linear = rgb.map((channel) => (
        channel <= 0.03928
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrastRatio(a, b) {
    const rgbA = hslToRgb(a);
    const rgbB = hslToRgb(b);
    if (!rgbA || !rgbB) return 0;
    const light = Math.max(relativeLuminance(rgbA), relativeLuminance(rgbB));
    const dark = Math.min(relativeLuminance(rgbA), relativeLuminance(rgbB));
    return (light + 0.05) / (dark + 0.05);
}

/** Pair a fill with whichever supplied foreground has the stronger contrast. */
export function bestForeground(
    fill,
    { dark = "0 0% 12%", light = "0 0% 100%" } = {},
) {
    return contrastRatio(fill, dark) >= contrastRatio(fill, light) ? dark : light;
}

function neutralBand(lightness) {
    if (lightness < 35) return "dark";
    if (lightness > 72) return "light";
    return "mid";
}

/**
 * Return distinct palette colours in canonical order.
 *
 * Chromatic colours are deduplicated by a narrow hue bucket. Repeated flag
 * stripes therefore count once. Neutrals are included only when a palette has
 * fewer than `minChromatic` usable hues, which keeps white/black from replacing
 * identity colours in colourful themes while preserving monochrome palettes.
 */
export function balancedPalette(
    colors,
    { minChromatic = 2, maxNeutrals = 2 } = {},
) {
    const entries = colors
        .filter(Boolean)
        .map((value, index) => ({ value, index, parts: colorParts(value) }))
        .filter((entry) => entry.parts);

    const chromatic = new Map();
    const neutrals = new Map();

    for (const entry of entries) {
        const { h, s, l } = entry.parts;
        if (s < NEUTRAL_SATURATION) {
            const key = neutralBand(l);
            const current = neutrals.get(key);
            if (!current || Math.abs(l - 50) > Math.abs(current.parts.l - 50)) {
                neutrals.set(key, entry);
            }
            continue;
        }

        const key = Math.round(h / HUE_BUCKET_DEGREES) % Math.round(360 / HUE_BUCKET_DEGREES);
        const current = chromatic.get(key);
        if (!current || s > current.parts.s) {
            chromatic.set(key, entry);
        }
    }

    const chromaticValues = [...chromatic.values()]
        .sort((a, b) => a.index - b.index)
        .map((entry) => entry.value);

    if (chromaticValues.length >= minChromatic) return chromaticValues;

    const neutralValues = [...neutrals.values()]
        .sort((a, b) => a.index - b.index)
        .slice(0, maxNeutrals)
        .map((entry) => entry.value);

    const combined = [...chromaticValues, ...neutralValues];
    return combined.length > 0 ? combined : colors.filter(Boolean);
}

/** Pick a real palette colour that is visually distinct from existing roles. */
export function pickDistinctPaletteColor(colors, anchors, fallback = null) {
    const anchorParts = anchors.map(colorParts).filter(Boolean);
    const candidates = balancedPalette(colors, { minChromatic: Number.POSITIVE_INFINITY, maxNeutrals: 0 })
        .map((value) => ({ value, parts: colorParts(value) }))
        .filter((entry) => entry.parts && entry.parts.s >= NEUTRAL_SATURATION);

    let best = null;
    for (const candidate of candidates) {
        const nearest = anchorParts.length === 0
            ? 180
            : Math.min(...anchorParts.map((anchor) => hueDistance(candidate.parts.h, anchor.h)));
        const score = nearest + candidate.parts.s / 1000;
        if (!best || score > best.score) best = { ...candidate, score, nearest };
    }

    return best && best.nearest >= 18 ? best.value : fallback;
}

/** Spread distinct colours across a fixed number of semantic accent slots. */
export function spreadBalancedPalette(colors, count = 8) {
    const palette = balancedPalette(colors);
    if (palette.length === 0) return [];
    return Array.from({ length: count }, (_, index) => palette[index % palette.length]);
}

export function distinctChromaticCount(colors) {
    return balancedPalette(colors, { minChromatic: Number.POSITIVE_INFINITY, maxNeutrals: 0 }).length;
}
