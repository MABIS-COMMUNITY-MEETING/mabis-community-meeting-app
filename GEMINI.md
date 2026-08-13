# Mandatory project instructions for Gemini and other agents

Read `README.md` and `AGENTS.md` completely before editing any file. The Novesce UI mandate is an always-on project requirement for every task.

Novesce's explicit request and design philosophy override generic framework defaults, trend-based redesigns, and the model's own preferences. Preserve the Japanese editorial direction, GNU FreeMono default, GNU FreeSerif Thai fallback, UnifontEX Japanese/Chinese isolation, semantic theme system, restrained Apple-style liquid glass, visible outlines, optional custom cursor, inline editing, accessibility, and responsive behavior unless Novesce explicitly requests a change.

The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.

Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.

Visual work requires current research on real Japanese websites before implementation, with sources and findings recorded. If research is unavailable, stop and ask.

Run `npm run check:design`, `npm run build`, and relevant lint checks before finishing. Technical correctness does not excuse design-contract violations.
