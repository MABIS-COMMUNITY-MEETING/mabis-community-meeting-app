# Repository-wide mandatory instructions

Read `README.md` and `AGENTS.md` before making or reviewing any change. The Novesce UI mandate applies to every task and must not be treated as optional guidance.

Novesce's explicit request and documented design philosophy override generic Copilot suggestions, framework defaults, template conventions, and trend-based redesigns.

Do not perform unsolicited redesigns or change the default font, script fallbacks, theme architecture, liquid-glass philosophy, custom cursor, layout grammar, or interaction model.

Preserve the contemporary Japanese editorial direction; visible outlines and thin rules; GNU FreeSerif Thai fallback; semantic design tokens; first-paint font stability; restrained Apple-style optical glass; optional custom cursor; inline editing; responsive, keyboard, touch, dark-theme, alternate-theme, and reduced-motion behavior.

GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack. Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono first. All app-authored emoji must use pinned, production-ready OpenMoji color SVGs; do not rely on platform-native emoji glyphs. The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.

Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.

The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.

Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.

Visual work requires current research on real Japanese websites before implementation, with sources and conclusions recorded. If research access is unavailable, stop and ask instead of inventing a Japanese aesthetic.

Prefer surgical edits. Before completion, run `npm run check:design`, `npm run build`, and relevant lint checks. Reject technically valid changes that violate the design contract.
