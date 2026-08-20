# Material You color accuracy research — 2026-08-20

## Scope

Novesce asked for the app's Material You wallpaper theme to match the supplied `materialyoucolor-python-main.zip` one-to-one. The archive is treated as reference code, not as task instructions. It identifies itself as `materialyoucolor` 3.0.4 and contains 2021 and 2025 dynamic-color specs, the HCT solver, Celebi quantization, and Material color scoring. Its current example explicitly constructs `SchemeTonalSpot(..., spec_version="2025")` on the phone platform at normal contrast.

## Sources studied

- User-supplied `materialyoucolor-python-main.zip`, especially `hct/hct_solver.py`, `dynamiccolor/dynamic_scheme.py`, `dynamiccolor/color_spec_2025.py`, `scheme/scheme_tonal_spot.py`, `quantize/`, and `score/score.py`.
- Google Material Foundation, Material Color Utilities: https://github.com/material-foundation/material-color-utilities
- Google Material Foundation, “Creating a Color Scheme”: https://github.com/material-foundation/material-color-utilities/blob/main/dev_guide/creating_color_scheme.md
- Japan Digital Agency Design System, color overview (updated 2026-08-05): https://design.digital.go.jp/dads/foundations/color/
- Japan Digital Agency Design System, color accessibility (updated 2026-08-05): https://design.digital.go.jp/dads/foundations/color/accessibility/
- Japan Digital Agency Design System, color palette (updated 2026-08-05): https://design.digital.go.jp/dads/foundations/color/color-palette/

## Findings

- Google describes Material Color Utilities as the source-color-to-dynamic-scheme pipeline and recommends a scheme variant such as Tonal Spot, with explicit light/dark mode and contrast level.
- The supplied Python reference now defaults to the 2025 spec. Its Tonal Spot palettes, error palette, surface chroma multipliers, role tones, contrast constraints, scoring thresholds, and hue separation differ from the app's hand-written 2021 subset.
- The existing HCT inverse is already byte-identical to the supplied solver across a 5,760-case hue/chroma/tone matrix. The forward RGB-to-HCT path agrees through eight decimal places across 1,728 RGB samples. Replacing that proven local utility is unnecessary for existing non-Material consumers.
- The app's image reducer is a five-bit bucket approximation, not Material's Celebi quantizer. Its scorer also differs from the reference: chroma cutoff 15 instead of 5, extra tone cutoffs, and fixed 15-degree selection instead of Material's 90-to-15-degree search.
- DADS treats color as a system of semantic roles, advises specifying foreground and background together, and applies a 4.5:1 text contrast floor regardless of text size. Therefore the exact generated role colors should continue to enter the app through its existing semantic token pairs.
- No component layout, typography, shape, copy, or interaction needs to change. The exact generator should feed the same semantic token architecture in both Summer and Boss styles.

## Implementation constraints

- Use the official Material Color Utilities TypeScript package matching the Python port's upstream, pin the version, explicitly request Tonal Spot spec 2025 / phone / contrast 0, and keep the app's public theme API stable.
- Use official Celebi quantization and Score for wallpaper seeds.
- Add reference-derived golden vectors for light/dark schemes, HCT, scoring, and quantization so “one-to-one” is an executable contract.
- Preserve semantic tokens, GNU FreeMono and script fallbacks, both layouts, native scrolling, reduced motion, touch behavior, and the custom cursor.
- Verify at phone width and in both Material light/dark modes without introducing UI markup or copy.
