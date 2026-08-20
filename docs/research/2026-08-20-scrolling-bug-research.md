# Scrolling bug research — 2026-08-20

Recorded before implementation under `AGENTS.md` and the README design contract.

## Current Japanese references

- Digital Agency of Japan, [Layout accessibility](https://design.digital.go.jp/dads/foundations/layout/accessibility/) (reviewed 2026-08-20): use liquid responsive layouts so content remains usable across viewport sizes; if content-specific horizontal overflow is unavoidable, keep its scrollbar available.
- Digital Agency of Japan, [Layout overview](https://design.digital.go.jp/dads/foundations/layout/) (reviewed 2026-08-20): explicitly design mobile and desktop layout states, preserve readable margins and gutters, and avoid treating mobile as a scaled desktop.
- Digital Agency of Japan, [Mobile menu](https://design.digital.go.jp/dads/components/mobile-menu/) (reviewed 2026-08-20): mobile navigation is a primary touch interface; keep its hierarchy shallow, make differing actions visually distinct, and keep its content operable within the viewport.
- [Tokyo National Museum of Modern Art](https://www.momat.go.jp/) (reviewed 2026-08-20): dense editorial material is organized through clear headings, restrained rules, and direct navigation rather than decorative scroll behavior.
- [MUJI Japan online store](https://www.muji.com/jp/ja/store) (reviewed 2026-08-20): high information density is grouped with simple category structure and restrained visual treatment.

The project’s broader 2026-08-14 research note was also re-read. Its directly relevant conclusion is that native scrolling and mobile performance take precedence over decorative scroll effects.

## Conclusions for this fix

- Keep document scrolling native; do not intercept wheel or touch events.
- A modal or full-screen menu may lock the background only while it is actually open, and the lock must always be released on close, unmount, route change, and preview HMR replacement.
- The overlay itself must remain vertically scrollable at phone width when its content exceeds the visual viewport.
- Prefer the smallest state-lifecycle correction in the shared scroll-lock path so Summer and Boss styles receive the same behavior.
- Do not change typography, tokens, glass, cursor behavior, theme architecture, or the two-layout presentation.
