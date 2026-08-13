@README.md
@AGENTS.md

# Claude Code mandatory project memory

The imported Novesce design contract and AI instructions apply to every task in this repository, not only visual tasks.

Before editing any file, read the imported instructions and identify the relevant design constraints. Do not perform an unsolicited redesign, font change, fallback change, glass restyle, cursor change, theme rewrite, or interaction-model change.

The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.

For visual work, complete and record current research on real Japanese web design before implementation. If research access is unavailable, stop and ask rather than inventing an aesthetic.

Before finishing, run `npm run check:design`, `npm run build`, and relevant lint checks. A technically valid change that violates Novesce's design philosophy is not complete.
