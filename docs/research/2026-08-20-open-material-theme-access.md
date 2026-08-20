# Open Material theme access research — 2026-08-20

## User request

Make the custom Material You theme option available directly to everyone, retire the hidden 19-tap MABIS-logo unlock, and stop displaying manual Primary and Secondary colour fields. Keep wallpaper/photo generation and let each person save and reuse their own themes.

## Current Japanese design references

- Japan Digital Agency Design System, Accordion overview and usage:
  - https://design.digital.go.jp/dads/components/accordion/
  - https://design.digital.go.jp/dads/components/accordion/usage/
  - Relevant pattern: important actions and information should not depend on concealed disclosure; an accordion is suitable for clearly labelled supplemental controls and must remain keyboard accessible.
- Japan Digital Agency Design System, Button:
  - https://design.digital.go.jp/dads/components/button/
  - Relevant pattern: keep a single clear primary action and preserve meaningful mobile stacking order.
- Japan Digital Agency Design System, Mobile menu:
  - https://design.digital.go.jp/dads/components/mobile-menu/
  - Relevant pattern: touch actions should be direct and their behaviour clear; avoid hidden interaction layers.
- MUJI Japan store:
  - https://www.muji.com/jp/shop/
  - Relevant pattern: restrained functional hierarchy with direct labelled inputs and actions.
- 21_21 DESIGN SIGHT:
  - https://2121designsight.jp/designsight/
  - Relevant pattern: restrained typography and structured navigation rather than decorative control density.

## Repository-required code-style references

Read in full before implementation:

- Linux kernel coding style: https://docs.kernel.org/process/coding-style.html
- Submitting patches: https://docs.kernel.org/process/submitting-patches.html
- Patch submission checklist: https://docs.kernel.org/process/submit-checklist.html
- Deprecated interfaces: https://docs.kernel.org/process/deprecated.html
- scripts/checkpatch.pl from the current upstream kernel source

Applicable principles: make one logical and reviewable change, remove unused state rather than retaining a second path, keep functions shallow and single-purpose, explain why rather than restating the code, preserve compatibility deliberately, and build/test the changed user-visible paths.

## Implementation constraints

- Show the existing advanced Material theme disclosure in both Summer and Boss styles without an account or local-unlock gate.
- Remove the 19-tap logo counter, unlock event wiring, and interactive footer-logo callback.
- Keep the wallpaper/photo colour extraction and light/dark mode control.
- Remove manual Primary and Secondary colour inputs and their swatch summary.
- Save only an active Material seed from the creation panel; continue loading legacy saved custom-colour pairs so existing user data is not stranded.
- Show personal saved themes to their owner through the existing per-user preference sync.
- Keep one Save action, disabled until a name and generated Material seed are present.
- Verify design contract, Material regression coverage, lint, build, scroll checks, and a phone-width shell.

## Boss catalogue follow-up — 2026-08-20

### Clarified request

The “Boss themes” are the large themed palette catalogue: LGBTQ+ flags, BFDI, Touhou, Linux, game-console, character, GMK, and related palettes. Boss style itself and the Material You wallpaper/photo builder are not part of this gate. The catalogue must unlock only after a person activates the Boss style control 69 times.

### Current Japanese interaction references

- Japan Digital Agency Design System, Button accessibility:
  - https://design.digital.go.jp/dads/components/button/accessibility/
  - Relevant finding: an action must remain a real button with a usable focus order and adequate target size. The existing Boss style choice already provides that semantic, keyboard-operable control and an 80px minimum target.
- Japan Digital Agency Design System, Button overview:
  - https://design.digital.go.jp/dads/components/button/
  - Relevant finding: the button’s visible hierarchy should continue to communicate its primary function—choosing the page style—without extra decorative controls.
- Japan Digital Agency Design System, Web accessibility policy:
  - https://design.digital.go.jp/dads/webaccessibility/
  - Relevant finding: essential functionality should target WCAG/JIS accessibility. The hidden catalogue is a deliberately requested, non-essential easter egg; standard MABIS colors and the Material You builder remain directly available.

### Implementation constraints

- Count activations of the existing Boss style button, including keyboard activation through its native button semantics.
- Unlock on exactly 69 activations and persist the completed unlock through the existing `mabis-` preference sync.
- Remove account ID and email bypasses so every person reaches the catalogue through the same gesture.
- Keep `getSelectableThemeKeys()` as the only picker-facing catalogue gate and notify an already-mounted ThemeSwitcher through the existing unlock event.
- Do not add visible progress, extra controls, or new copy; the page-layout choice must continue to look and behave normally.
- Keep the Material You wallpaper/photo builder and named personal themes directly available to everyone.
- Re-run the design, theme, Material, lint, build, scrolling, and phone-width checks.
