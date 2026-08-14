@README.md
@AGENTS.md

# Claude Code mandatory project memory

The imported Novesce design contract and AI instructions apply to every task in this repository, not only visual tasks.

Before editing any file, read the imported instructions and identify the relevant design constraints. Do not perform an unsolicited redesign, font change, fallback change, glass restyle, cursor change, theme rewrite, or interaction-model change.

GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack. Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono first. The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.

Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.

The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.

Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.

For visual work, complete and record current research on real Japanese web design before implementation. If research access is unavailable, stop and ask rather than inventing an aesthetic.

Before finishing, run `npm run check:design`, `npm run build`, and relevant lint checks. A technically valid change that violates Novesce's design philosophy is not complete.
