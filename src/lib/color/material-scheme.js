/**
 * A full Material You scheme from one seed color.
 *
 * This is Material's own TonalSpot dynamic scheme (spec 2021) — the variant
 * Android itself uses for the default wallpaper-based theme — ported
 * one-to-one from Google's reference implementation (materialyoucolor /
 * material-color-utilities). Every constant below has a matching line in
 * that source; nothing here is approximated or re-derived from scratch.
 *
 * Material's own construction: five tonal palettes (primary, secondary,
 * tertiary, neutral, neutral-variant), each the seed's hue (or a fixed
 * rotation of it) held at a FIXED chroma, plus a sixth palette for errors
 * that never touches the seed's hue at all:
 *
 *   primary          seed hue,        chroma 36
 *   secondary        seed hue,        chroma 16
 *   tertiary         seed hue + 60,   chroma 24
 *   neutral          seed hue,        chroma  6
 *   neutralVariant   seed hue,        chroma  8
 *   error            hue 25 (fixed),  chroma 84 (fixed)
 *
 * Only the chroma is fixed per palette; TONE is what walks 0–100 to answer
 * "give me this palette's color at tone T" — see `palette(hue, chroma)(tone)`
 * below. This is why boosting chroma with the seed's OWN saturation (the
 * previous version of this file) produced a different-looking theme than
 * Android's Material You: TonalSpot's whole identity is that it always mutes
 * to these fixed, moderate chroma values regardless of how vivid the seed
 * photo was — that is what keeps a photo-derived theme calm and legible at
 * every tone instead of lurid at the ones a vivid seed would otherwise reach.
 *
 * The point of doing it properly rather than deriving two accent colors is
 * that SURFACES come from the seed too — the page, the cards, the muted fills
 * and the hairlines are all neutral tones carrying the wallpaper's hue, which
 * is what makes a Material You theme look like the wallpaper instead of like
 * the previous theme with two new buttons in it.
 */

import { hctFromHex, hexFromHct, hslStringFromHex } from "@/lib/color/hct";

const palette = (hue, chroma) => (tone) => hexFromHct(hue, chroma, tone);

function sanitizeDegrees(deg) {
  const d = deg % 360;
  return d < 0 ? d + 360 : d;
}

export function materialPalettes(seedHex) {
  const { hue } = hctFromHex(seedHex);
  return {
    hue,
    primary: palette(hue, 36),
    secondary: palette(hue, 16),
    tertiary: palette(sanitizeDegrees(hue + 60), 24),
    neutral: palette(hue, 6),
    neutralVariant: palette(hue, 8),
    // Error is its own fixed hue/chroma in every Material scheme — it never
    // takes the seed's hue, so an error state reads as "error" no matter what
    // photo produced the rest of the theme.
    error: palette(25, 84),
  };
}

/**
 * @param {string} seedHex
 * @param {boolean} dark keep the reader's own Material You light/dark choice
 * @returns {Record<string,string>} CSS custom properties, HSL triplets
 *
 * Every tone below is copied directly from Google's TonalSpot role table
 * (non-monochrome, non-fidelity) — e.g. `primary` there is
 * `80 if is_dark else 40`, so it is `dark ? p.primary(80) : p.primary(40)`
 * here. Card and popover use the two official Material elevation tiers
 * immediately above the page (surfaceContainerLow, surfaceContainerHigh) at
 * their standard ("Normal" contrast) tones, so a popover always reads as
 * more elevated than a card — never the same flat tone the previous version
 * gave both in light mode.
 */
export function materialSchemeVars(seedHex, dark) {
  const p = materialPalettes(seedHex);
  const hsl = (hex) => hslStringFromHex(hex);

  const roles = dark
    ? {
        "--primary": p.primary(80), "--primary-foreground": p.primary(20),
        "--secondary": p.secondary(80), "--secondary-foreground": p.secondary(20),
        "--accent": p.tertiary(80), "--accent-foreground": p.tertiary(20),
        "--destructive": p.error(80), "--destructive-foreground": p.error(20),
        "--background": p.neutral(6), "--foreground": p.neutral(90),
        "--card": p.neutral(10), "--card-foreground": p.neutral(90),
        "--popover": p.neutral(17), "--popover-foreground": p.neutral(90),
        "--muted": p.neutralVariant(30), "--muted-foreground": p.neutralVariant(80),
        "--border": p.neutralVariant(30), "--input": p.neutralVariant(30),
        "--ring": p.primary(80),
        "--role-student": p.primary(70), "--role-teacher": p.tertiary(70),
        "--role-chair": p.secondary(70), "--role-minutes": p.primary(60),
        "--role-admin": p.tertiary(60), "--role-editor": p.secondary(60),
      }
    : {
        "--primary": p.primary(40), "--primary-foreground": p.primary(100),
        "--secondary": p.secondary(40), "--secondary-foreground": p.secondary(100),
        "--accent": p.tertiary(40), "--accent-foreground": p.tertiary(100),
        "--destructive": p.error(40), "--destructive-foreground": p.error(100),
        "--background": p.neutral(98), "--foreground": p.neutral(10),
        "--card": p.neutral(96), "--card-foreground": p.neutral(10),
        "--popover": p.neutral(92), "--popover-foreground": p.neutral(10),
        "--muted": p.neutralVariant(90), "--muted-foreground": p.neutralVariant(30),
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
  return [p.primary(tone), p.secondary(tone), p.tertiary(tone), dark ? p.neutral(6) : p.neutral(98)];
}
