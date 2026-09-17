/**
 * Material You Tonal Spot scheme, matched to materialyoucolor 3.0.4.
 *
 * The supplied Python reference follows Google's Material Color Utilities.
 * Keeping the official TypeScript implementation at this boundary prevents
 * palette, dynamic-role, contrast, and spec-version drift. The app asks for
 * the same configuration as the reference example: 2025, phone, normal
 * contrast.
 */

import {
  Hct,
  SchemeTonalSpot,
  argbFromHex,
  hexFromArgb,
} from "@material/material-color-utilities";
import { hslStringFromHex } from "@/lib/color/hct";

const SPEC_VERSION = "2025";
const PLATFORM = "phone";
const CONTRAST_LEVEL = 0;
// A bounded seed/mode cache avoids solving identical dynamic roles again for
// theme application and preview strips. Never expose cached mutable objects.
const schemeCache = new Map();
const MAX_CACHED_SCHEMES = 16;

function cachedScheme(seedHex, dark) {
  const key = `${argbFromHex(seedHex)}:${Boolean(dark)}`;
  let entry = schemeCache.get(key);
  if (entry) {
    schemeCache.delete(key);
  } else {
    entry = { scheme: createMaterialScheme(seedHex, dark) };
    if (schemeCache.size >= MAX_CACHED_SCHEMES) {
      schemeCache.delete(schemeCache.keys().next().value);
    }
  }
  schemeCache.set(key, entry);
  return entry;
}

function createMaterialScheme(seedHex, dark) {
  return new SchemeTonalSpot(
    Hct.fromInt(argbFromHex(seedHex)),
    Boolean(dark),
    CONTRAST_LEVEL,
    SPEC_VERSION,
    PLATFORM,
  );
}

const paletteHex = (palette, tone) => hexFromArgb(palette.tone(tone));

/**
 * Official 2025 Tonal Spot palettes for callers that need arbitrary tones.
 * Primary chroma is intentionally mode-dependent in the 2025 phone spec.
 */
export function materialPalettes(seedHex, dark = false) {
  const { scheme } = cachedScheme(seedHex, dark);
  return {
    hue: scheme.sourceColorHct.hue,
    primary: (tone) => paletteHex(scheme.primaryPalette, tone),
    secondary: (tone) => paletteHex(scheme.secondaryPalette, tone),
    tertiary: (tone) => paletteHex(scheme.tertiaryPalette, tone),
    neutral: (tone) => paletteHex(scheme.neutralPalette, tone),
    neutralVariant: (tone) => paletteHex(scheme.neutralVariantPalette, tone),
    error: (tone) => paletteHex(scheme.errorPalette, tone),
  };
}

/**
 * Exact role colors before conversion to the app's HSL CSS-token format.
 * Exported so the reference-derived contract can compare RGB bytes directly.
 */
export function materialSchemeColors(seedHex, dark) {
  const entry = cachedScheme(seedHex, dark);
  if (entry.colors) return { ...entry.colors };
  const { scheme } = entry;
  const hex = (argb) => hexFromArgb(argb);
  const tone = (palette, value) => paletteHex(palette, value);

  const roles = {
    "--primary": hex(scheme.primary),
    "--primary-foreground": hex(scheme.onPrimary),
    "--secondary": hex(scheme.secondary),
    "--secondary-foreground": hex(scheme.onSecondary),
    "--accent": hex(scheme.tertiary),
    "--accent-foreground": hex(scheme.onTertiary),
    "--destructive": hex(scheme.error),
    "--destructive-foreground": hex(scheme.onError),
    "--background": hex(scheme.background),
    "--foreground": hex(scheme.onBackground),
    "--card": hex(scheme.surfaceContainerLow),
    "--card-foreground": hex(scheme.onSurface),
    "--popover": hex(scheme.surfaceContainerHigh),
    "--popover-foreground": hex(scheme.onSurface),
    "--muted": hex(scheme.surfaceVariant),
    "--muted-foreground": hex(scheme.onSurfaceVariant),
    "--border": hex(scheme.outlineVariant),
    "--input": hex(scheme.outlineVariant),
    "--ring": hex(scheme.primary),
  };

  entry.colors = dark
    ? {
        ...roles,
        "--role-student": tone(scheme.primaryPalette, 70),
        "--role-teacher": tone(scheme.tertiaryPalette, 70),
        "--role-chair": tone(scheme.secondaryPalette, 70),
        "--role-minutes": tone(scheme.primaryPalette, 60),
        "--role-admin": tone(scheme.tertiaryPalette, 60),
        "--role-editor": tone(scheme.secondaryPalette, 60),
      }
    : {
        ...roles,
        "--role-student": tone(scheme.primaryPalette, 40),
        "--role-teacher": tone(scheme.tertiaryPalette, 40),
        "--role-chair": tone(scheme.secondaryPalette, 40),
        "--role-minutes": tone(scheme.primaryPalette, 50),
        "--role-admin": tone(scheme.tertiaryPalette, 50),
        "--role-editor": tone(scheme.secondaryPalette, 50),
      };
  return { ...entry.colors };
}

/**
 * @param {string} seedHex
 * @param {boolean} dark
 * @returns {Record<string,string>} CSS custom properties as HSL triplets
 */
export function materialSchemeVars(seedHex, dark) {
  const entry = cachedScheme(seedHex, dark);
  if (!entry.vars) {
    entry.vars = Object.fromEntries(
      Object.entries(materialSchemeColors(seedHex, dark))
        .map(([token, hex]) => [token, hslStringFromHex(hex)]),
    );
  }
  return { ...entry.vars };
}

/** Swatches for palette strips and saved-theme previews. */
export function materialSchemeSwatches(seedHex, dark) {
  const entry = cachedScheme(seedHex, dark);
  if (!entry.swatches) {
    const { scheme } = entry;
    entry.swatches = [scheme.primary, scheme.secondary, scheme.tertiary, scheme.background].map(hexFromArgb);
  }
  return [...entry.swatches];
}
