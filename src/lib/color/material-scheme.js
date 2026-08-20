/**
 * A full Material You scheme from one seed color.
 *
 * Material's own construction: five tonal palettes (primary, secondary,
 * tertiary, neutral, neutral-variant) built by holding the seed's CAM16 hue
 * and a fixed chroma per palette while walking L* tone, then reading the
 * scheme's roles off specific tones of those palettes.
 *
 * The point of doing it properly rather than deriving two accent colors is
 * that SURFACES come from the seed too — the page, the cards, the muted fills
 * and the hairlines are all neutral tones carrying the wallpaper's hue, which
 * is what makes a Material You theme look like the wallpaper instead of like
 * the previous theme with two new buttons in it.
 */

import { hctFromHex, hexFromHct, hslStringFromHex } from "@/lib/color/hct";

const palette = (hue, chroma) => (tone) => hexFromHct(hue, chroma, tone);

export function materialPalettes(seedHex) {
  const { hue, chroma } = hctFromHex(seedHex);
  return {
    hue,
    primary: palette(hue, Math.max(48, chroma)),
    secondary: palette(hue, 16),
    tertiary: palette(hue + 60, 24),
    neutral: palette(hue, 4),
    neutralVariant: palette(hue, 8),
  };
}

/**
 * @param {string} seedHex
 * @param {boolean} dark keep the reader's current light/dark polarity
 * @returns {Record<string,string>} CSS custom properties, HSL triplets
 */
export function materialSchemeVars(seedHex, dark) {
  const p = materialPalettes(seedHex);
  const hsl = (hex) => hslStringFromHex(hex);

  const roles = dark
    ? {
        "--primary": p.primary(80), "--primary-foreground": p.primary(20),
        "--secondary": p.secondary(80), "--secondary-foreground": p.secondary(20),
        "--accent": p.tertiary(80), "--accent-foreground": p.tertiary(20),
        "--background": p.neutral(6), "--foreground": p.neutral(90),
        "--card": p.neutral(12), "--card-foreground": p.neutral(90),
        "--popover": p.neutral(14), "--popover-foreground": p.neutral(90),
        "--muted": p.neutralVariant(22), "--muted-foreground": p.neutralVariant(80),
        "--border": p.neutralVariant(32), "--input": p.neutralVariant(32),
        "--ring": p.primary(80),
        "--role-student": p.primary(70), "--role-teacher": p.tertiary(70),
        "--role-chair": p.secondary(70), "--role-minutes": p.primary(60),
        "--role-admin": p.tertiary(60), "--role-editor": p.secondary(60),
      }
    : {
        "--primary": p.primary(40), "--primary-foreground": p.primary(100),
        "--secondary": p.secondary(40), "--secondary-foreground": p.secondary(100),
        "--accent": p.tertiary(40), "--accent-foreground": p.tertiary(100),
        "--background": p.neutral(98), "--foreground": p.neutral(10),
        "--card": p.neutral(100), "--card-foreground": p.neutral(10),
        "--popover": p.neutral(100), "--popover-foreground": p.neutral(10),
        "--muted": p.neutralVariant(94), "--muted-foreground": p.neutralVariant(30),
        "--border": p.neutralVariant(80), "--input": p.neutralVariant(80),
        "--ring": p.primary(40),
        "--role-student": p.primary(40), "--role-teacher": p.tertiary(40),
        "--role-chair": p.secondary(40), "--role-minutes": p.primary(50),
        "--role-admin": p.tertiary(50), "--role-editor": p.secondary(50),
      };

  return Object.fromEntries(Object.entries(roles).map(([k, hex]) => [k, hsl(hex)]));
}

/** Swatches for the palette strip / previews: the scheme's own key tones. */
export function materialSchemeSwatches(seedHex, dark) {
  const p = materialPalettes(seedHex);
  const tone = dark ? 80 : 40;
  return [p.primary(tone), p.secondary(tone), p.tertiary(tone), dark ? p.neutral(12) : p.neutral(98)];
}