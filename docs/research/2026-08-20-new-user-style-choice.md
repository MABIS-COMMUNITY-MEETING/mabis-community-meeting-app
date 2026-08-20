# New-user style choice research — 2026-08-20

## Request

Prompt people who have not yet chosen a Home style to choose between Boss style and Summer style. Explain that Boss leans modern and Summer leans toward simplicity. Save the result as their own account preference and do not interrupt people who already have a saved choice.

## Sources reviewed before implementation

- Japan Digital Agency Design System, Radio Button Overview: https://design.digital.go.jp/dads/components/radio/
- Japan Digital Agency Design System, Modal Dialog: https://design.digital.go.jp/dads/components/modal-dialog/
- Japan Digital Agency Design System, Dialog: https://design.digital.go.jp/dads/components/dialog/
- Japan Digital Agency Design System, Button Overview: https://design.digital.go.jp/dads/components/button/
- Japan Digital Agency Design System, Button Accessibility: https://design.digital.go.jp/dads/components/button/accessibility/
- Japan Digital Agency Design System, Select Overview: https://design.digital.go.jp/dads/components/select/

## Findings applied

1. A choice between two mutually exclusive options should expose both choices at once. The Digital Agency describes radio buttons as the pattern for choosing one item from a group, and its select guidance recommends showing small option sets rather than concealing them in a select.
2. Button hierarchy, keyboard focus order, visible focus and sufficiently large targets must stay clear. Each style is therefore a semantic button with a full text description and a target taller than the coarse-pointer minimum.
3. This decision belongs in a focused dialog because it blocks the first personalised Home presentation. The dialog has one job, an accessible title and description, focus containment, and no unrelated action.
4. English remains the primary interface copy. Every new line has an opt-in Japanese companion, using the existing JapaneseText and Maple Mono path.
5. Preference sync must finish before deciding whether to show the dialog. Otherwise a returning person's remote style could arrive after the UI has incorrectly treated them as new.

## Product and implementation constraints

- An explicit valid `mabis-home-layout` value is the completion marker. Choosing Summer must write `simple`; the implicit default does not count as a completed choice.
- The chooser appears only for an authenticated account with no explicit valid saved style after preference pull finishes.
- The result is stored through `setHomeLayout()`, so the existing preference event and account-sync mechanism remain the single persistence path.
- A returning account with a saved style is never interrupted.
- The chooser itself does not increment the separate 69-press Boss-theme catalogue easter egg. That counter remains attached only to the Boss style control in Settings.
- The layout remains changeable later in Settings.
- The modal uses semantic theme tokens, native page scrolling remains untouched, and no scroll listener or animation loop is added.

## Repository guidance

The repository's Linux kernel coding-style and neighbouring documentation were read in full earlier in this work session. This change applies the relevant principles: small single-purpose helpers, direct control flow, comments that explain why rather than restate what, and verification of the complete change rather than only the new component.
