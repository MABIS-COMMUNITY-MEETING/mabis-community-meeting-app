# Mandatory AI Instructions

These instructions apply to every AI agent, coding assistant, automated reviewer, and generative model working anywhere in this repository. They apply to every task, including small fixes, refactors, dependency updates, tests, documentation, backend work, and non-visual changes.

## Instruction priority

Follow this order:

1. Novesce's explicit request in the current task.
2. The `Novesce UI mandate` and design contract in `README.md`.
3. Existing project architecture and established component behavior.
4. Tool or framework defaults.
5. The AI's own preferences.

An AI preference, generic best practice, library convention, or redesign instinct must never override Novesce's design philosophy.

## Required before any edit

1. Read all of `README.md`, especially `Mandatory rule for AI contributors`, `Novesce UI mandate`, typography, liquid glass, interaction, accessibility, and the design review checklist.
2. Inspect the existing implementation before proposing replacement code.
3. For visual, layout, typography, motion, interaction, or responsive work, perform current research on real Japanese web design and record the sources and conclusions before implementation.
4. Identify which Novesce design rules are relevant to the task.
5. Prefer the smallest coherent change. Do not perform unsolicited redesigns or broad rewrites.

If current research is required but unavailable, stop and ask for access or human direction. Do not improvise a stereotypical Japanese aesthetic.

## Always-preserved design rules

Unless Novesce explicitly requests a change:

- Preserve the contemporary Japanese editorial direction.
- Preserve visible structure, outlines, thin rules, crisp edges, compact controls, and restrained radii.
- Do not turn the app into a generic rounded-card SaaS dashboard.
- Preserve Apple-style optical liquid glass only on floating control planes. Do not spread glass across content.
- Keep GNU FreeMono as the default UI font.
- Keep GNU FreeSerif isolated as the Thai fallback.
- Keep UnifontEX isolated to explicitly marked Japanese and Chinese content.
- Use shared font variables and semantic color tokens. Never hard-code a normal component to a specific UI font.
- Preserve first-paint font loading and prevent loading-screen font flashes.
- Preserve the optional custom cursor, its outlines, its immediate off switch, and native-cursor fallback.
- Preserve reduced-motion, touch, keyboard, mobile, dark-theme, and alternate-theme behavior.
- Edit existing items in place. Do not introduce scroll-jumping edit forms.
- Use CSS-drawn separators instead of slash glyphs.
- Do not add romaji, random Japanese labels, anime decoration, or cultural shorthand.
- Never infer a font designer's gender identity. Use only reliable public self-identification and verified licensing.

## Forbidden unsolicited changes

Do not change the default font, script fallback rules, theme architecture, liquid-glass philosophy, custom-cursor model, design direction, layout grammar, or interaction model as cleanup, modernization, simplification, normalization, or consistency work.

Do not delete unusual design details merely because they differ from a framework default. Their distinctiveness is intentional.

## Validation required

Before finishing:

- Run `npm run check:design`.
- Run `npm run build`.
- Run relevant lint checks.
- Re-read the design review checklist in `README.md`.
- State how the result follows Novesce's design philosophy.
- Disclose any deliberate deviation and obtain approval when the deviation was not explicitly requested.

A task is incomplete if it works technically but violates the design contract.
