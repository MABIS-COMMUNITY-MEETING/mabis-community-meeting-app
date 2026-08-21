import path from "node:path";
import { readFileSync } from "node:fs";
import { createServer } from "vite";
import {
    balancedPalette,
    colorParts,
    distinctChromaticCount,
    spreadBalancedPalette,
} from "../src/lib/color/themeBalance.js";

const ROLE_TOKENS = [
    "--role-student",
    "--role-teacher",
    "--role-chair",
    "--role-minutes",
    "--role-admin",
    "--role-editor",
];

const EDITOR_INK_TOKENS = [
    "--editor-ink-default",
    "--editor-ink-primary",
    "--editor-ink-secondary",
    "--editor-ink-accent",
];

const EDITOR_HIGHLIGHT_ROLES = ["primary", "secondary", "accent"];

const SURFACE_TEXT_PAIRS = [
    ["--background", "--foreground"],
    ["--card", "--card-foreground"],
    ["--popover", "--popover-foreground"],
    ["--muted", "--muted-foreground"],
];

function distinctTokenHues(values) {
    return distinctChromaticCount(values, { neutralSaturation: 15 });
}

function hslToRgb(value) {
    const parts = colorParts(value);
    if (!parts) return null;
    const h = parts.h / 360;
    const s = parts.s / 100;
    const l = parts.l / 100;

    if (s === 0) return [l, l, l];

    const hueToRgb = (p, q, t) => {
        let next = t;
        if (next < 0) next += 1;
        if (next > 1) next -= 1;
        if (next < 1 / 6) return p + (q - p) * 6 * next;
        if (next < 1 / 2) return q;
        if (next < 2 / 3) return p + (q - p) * (2 / 3 - next) * 6;
        return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [hueToRgb(p, q, h + 1 / 3), hueToRgb(p, q, h), hueToRgb(p, q, h - 1 / 3)];
}

function luminance(rgb) {
    const linear = rgb.map((channel) => (
        channel <= 0.03928
            ? channel / 12.92
            : ((channel + 0.055) / 1.055) ** 2.4
    ));
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

function contrastRatio(a, b) {
    const rgbA = hslToRgb(a);
    const rgbB = hslToRgb(b);
    if (!rgbA || !rgbB) return 0;
    const light = Math.max(luminance(rgbA), luminance(rgbB));
    const dark = Math.min(luminance(rgbA), luminance(rgbB));
    return (light + 0.05) / (dark + 0.05);
}

const server = await createServer({
    configFile: false,
    root: process.cwd(),
    resolve: { alias: { "@": path.resolve("src") } },
    server: { middlewareMode: true, hmr: false },
    optimizeDeps: { noDiscovery: true },
    ssr: { noExternal: ["@material/material-color-utilities"] },
    appType: "custom",
    logLevel: "silent",
});

const failures = [];
let themesChecked = 0;

const css = readFileSync(path.resolve("src/index.css"), "utf8");
const cssWithoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "");
const themedCursorRules = cssWithoutComments.match(
    /(?:pride-active|theme-(?!committing)[a-z0-9_-]+|material[a-z0-9_-]*)[^{}]*\.cursor-(?:dot|ring|trail|label)[^{}]*\{/gi,
) || [];
if (themedCursorRules.length > 0) {
    failures.push(`cursor styling must be theme-independent: ${themedCursorRules.join(" | ")}`);
}

try {
    const { THEMES, resolveThemeVars } = await server.ssrLoadModule("/src/lib/themes.js");

    for (const [key, theme] of Object.entries(THEMES)) {
        themesChecked += 1;
        const vars = resolveThemeVars(theme["vars"]);
        const swatches = theme.swatches || [];
        const availableHues = distinctChromaticCount(swatches);
        const semanticValues = [vars["--primary"], vars["--secondary"], vars["--accent"]];
        const semanticHues = distinctTokenHues(semanticValues);
        const expectedSemanticHues = Math.min(availableHues, 3);

        if (semanticHues < expectedSemanticHues) {
            failures.push(`${key}: semantic roles use ${semanticHues}/${expectedSemanticHues} available hues`);
        }

        const roleValues = ROLE_TOKENS.map((token) => vars[token]).filter(Boolean);
        const roleHues = distinctTokenHues(roleValues);
        const expectedRoleHues = Math.min(availableHues, 4);
        if (roleHues < expectedRoleHues) {
            failures.push(`${key}: role badges use ${roleHues}/${expectedRoleHues} available hues`);
        }

        for (const token of ["primary", "secondary", "accent"]) {
            const fill = vars[`--${token}`];
            const foreground = vars[`--${token}-foreground`];
            const ratio = contrastRatio(fill, foreground);
            if (ratio < 4.5) {
                failures.push(`${key}: ${token} contrast is ${ratio.toFixed(2)}:1`);
            }
        }

        for (const [surfaceToken, textToken] of SURFACE_TEXT_PAIRS) {
            const ratio = contrastRatio(vars[surfaceToken], vars[textToken]);
            if (ratio < 4.5) {
                failures.push(`${key}: ${textToken} on ${surfaceToken} contrast is ${ratio.toFixed(2)}:1`);
            }
        }

        const editorSurface = vars["--card"];
        for (const token of EDITOR_INK_TOKENS) {
            const ratio = contrastRatio(vars[token], editorSurface);
            if (ratio < 4.5) {
                failures.push(`${key}: ${token} on card contrast is ${ratio.toFixed(2)}:1`);
            }
        }

        for (const role of EDITOR_HIGHLIGHT_ROLES) {
            const fill = vars[`--editor-highlight-${role}`];
            const foreground = vars[`--editor-highlight-${role}-foreground`];
            const ratio = contrastRatio(fill, foreground);
            if (ratio < 4.5) {
                failures.push(`${key}: editor ${role} highlight contrast is ${ratio.toFixed(2)}:1`);
            }
        }

        const balanced = balancedPalette(swatches);
        const slots = spreadBalancedPalette(swatches, 8);
        if (balanced.length > 0) {
            const counts = balanced.map((color) => slots.filter((slot) => slot === color).length);
            if (Math.max(...counts) - Math.min(...counts) > 1) {
                failures.push(`${key}: semantic accent slots are not evenly distributed`);
            }
        }
    }
} finally {
    await server.close();
}

if (failures.length > 0) {
    console.error("\nTheme-balance check failed:\n");
    failures.forEach((failure) => console.error(`- ${failure}`));
    console.error("\nPreserve canonical swatches, then repair semantic role distribution or contrast.\n");
    process.exit(1);
}

console.log(`Theme balance: ${themesChecked} themes passed semantic hue, role, editor palette, slot, contrast and theme-independent cursor checks.`);
