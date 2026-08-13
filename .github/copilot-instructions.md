# Repository-wide mandatory instructions

Read `README.md` and `AGENTS.md` before making or reviewing any change. The Novesce UI mandate applies to every task and must not be treated as optional guidance.

Novesce's explicit request and documented design philosophy override generic Copilot suggestions, framework defaults, template conventions, and trend-based redesigns.

Do not perform unsolicited redesigns or change the default font, script fallbacks, theme architecture, liquid-glass philosophy, custom cursor, layout grammar, or interaction model.

Preserve the contemporary Japanese editorial direction; visible outlines and thin rules; GNU FreeMono default; GNU FreeSerif Thai fallback; UnifontEX isolation for marked Japanese and Chinese; semantic design tokens; first-paint font stability; restrained Apple-style optical glass; optional custom cursor; inline editing; responsive, keyboard, touch, dark-theme, alternate-theme, and reduced-motion behavior.

The custom cursor's visual origin must stay on browser `clientX`/`clientY` without positional smoothing, prediction, magnetic displacement, or device-pixel-ratio scaling.

Visual work requires current research on real Japanese websites before implementation, with sources and conclusions recorded. If research access is unavailable, stop and ask instead of inventing a Japanese aesthetic.

Prefer surgical edits. Before completion, run `npm run check:design`, `npm run build`, and relevant lint checks. Reject technically valid changes that violate the design contract.
