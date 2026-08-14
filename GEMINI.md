# Mandatory project instructions for Gemini and other agents

Read `README.md` and `AGENTS.md` completely before editing any file. The Novesce UI mandate is an always-on project requirement for every task.

Novesce's explicit request and design philosophy override generic framework defaults, trend-based redesigns, and the model's own preferences. Preserve the Japanese editorial direction, semantic theme system, restrained Apple-style liquid glass, visible outlines, optional custom cursor, inline editing, accessibility, and responsive behavior unless Novesce explicitly requests a change.

GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack. Keep GNU FreeSerif as the Thai fallback. Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono first. All app-authored emoji must use pinned, production-ready OpenMoji color SVGs; do not rely on platform-native emoji glyphs. The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.

Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.

The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.

Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.

Rich-text editors and rendered rich text must pair semantic card/ink tokens; selectable letter colors and highlights use contrast-safe theme roles, never fixed black, white, or raw swatches.

Keep Home easy to navigate with its numbered editorial sections, plain-language page guide, and contextual instructions; usability aids must clarify the existing Japanese editorial hierarchy rather than replace it with a generic dashboard.

Built-in jobs remain weekly except Time Keepers, who serve monthly and cannot be selected again in the same calendar year; custom jobs may choose weekly or monthly periods.

Visual work requires current research on real Japanese websites before implementation, with sources and findings recorded. If research is unavailable, stop and ask.

Run `npm run check:design`, `npm run build`, and relevant lint checks before finishing. Technical correctness does not excuse design-contract violations.
