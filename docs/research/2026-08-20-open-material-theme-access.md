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
