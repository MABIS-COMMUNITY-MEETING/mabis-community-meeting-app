# Meeting and wheel maintenance — 17 September 2026

## Scope and sources

Read the current AGENTS.md and complete README; retain both Summer and Boss presentations, semantic themes, shared widgets, GNU/Maple/OpenMoji fonts, live glass, native scrolling and reduced-motion behavior. The Linux contributor documentation was read in the earlier work on this task; its small, reviewable-change discipline continues to apply. No layout or visual-effects redesign is planned.

Current Japanese design research before interaction changes:

- https://design.digital.go.jp/dads/components/date-picker/usage/ (Digital Agency Design System, accessed 2026-09-17): show dates and their context explicitly; support text belongs next to its control. Preserve the existing date format and English/Japanese pair; correct the source of the date instead of introducing another picker.
- https://www.digital.go.jp/en/policies/servicedesign/designsystem/20230531-1 (Digital Agency): prioritizes usability and accessibility in recurring form components. Apply this by retaining the familiar Remove/Add controls and explaining the weekly duration nearby.

These are contextual principles, not permission to replace either established skin. Keep actions next to the student affected; no additional dialog or ornamental Japanese text.

## Findings before edits

Meeting Mode reads an unscoped legacy date from localStorage and can inherit the week being browsed in Discussion. The meeting session needs to own its date and week through pause/resume/end. Date-only strings must be parsed locally, not as UTC. Friday-anchored ISO week keys must use the ISO week year at January boundaries.

Manage Students currently writes a permanent boolean. New removals should instead store an explicit excluded week, share optimistic query state, and expire by comparing week keys. Preserve existing undated legacy exclusions rather than silently restoring an intentionally disabled profile. In-flight spins must not announce a student removed while the wheel was moving.

The offline cache currently serializes the whole allowlisted cache for unrelated successful query activity, and can enqueue multiple idle writes. Material scheme roles are recomputed for repeated seed/mode requests. Optimize this work without changing theme colors, offline freshness, or visible effects.
