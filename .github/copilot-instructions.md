# Repository-wide mandatory instructions

Read `README.md` and `AGENTS.md` before making or reviewing any change. The Novesce UI mandate applies to every task and must not be treated as optional guidance.

Novesce's explicit request and documented design philosophy override generic Copilot suggestions, framework defaults, template conventions, and trend-based redesigns.

Do not perform unsolicited redesigns or change the default font, script fallbacks, theme architecture, liquid-glass philosophy, custom cursor, layout grammar, or interaction model.

Preserve the contemporary Japanese editorial direction; visible outlines and thin rules; GNU FreeSerif Thai fallback; semantic design tokens; first-paint font stability; restrained Apple-style optical glass; optional custom cursor; inline editing; responsive, keyboard, touch, dark-theme, alternate-theme, and reduced-motion behavior.

GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack. Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono first. All app-authored emoji must use pinned, production-ready OpenMoji color SVGs; do not rely on platform-native emoji glyphs. The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.

Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.

The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.

Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.

Rich-text editors and rendered rich text must pair semantic card/ink tokens; selectable letter colors and highlights use contrast-safe theme roles, never fixed black, white, or raw swatches.

Keep Home easy to navigate: the default layout stacks the widgets as the original MABIS interface did, and the Boss style adds numbered editorial sections with a plain-language page guide; usability aids must clarify whichever layout is in use rather than bolt a generic dashboard onto either one.
- Japanese companion text is opt-in, shown alongside—not instead of—the English interface, stored per user, and marked with `lang="ja"` so Maple Mono CJK fallback applies; the default remains off.
- Customization surfaces show a small set of plain-language default choices first, with large theme/font catalogues and custom color tools behind clearly labeled advanced controls.
- Home has two layouts: the default reproduces the original MABIS interface — the original top bar, rounded white cards, coloured widget headers, no editorial scaffolding — and the art-directed editorial layout is opt-in as `Boss style` in Settings. Anything added, changed or fixed in one layout must exist in the other; they are two presentations of one page, not two products.

Built-in jobs remain weekly except Time Keepers, who serve monthly and cannot be selected again in the same calendar year; custom jobs may choose weekly or monthly periods.

Visual work requires current research on real Japanese websites before implementation, with sources and conclusions recorded. If research access is unavailable, stop and ask instead of inventing a Japanese aesthetic.

Do not forget about mobile: verify every change at a phone-width viewport, even backend-only or non-visual ones. Mobile is a primary layout, not a shrink target.

For any HTML, CSS, or JSX authorship, research the Linux kernel fully and read the entirety of its coding-style documentation — `Documentation/process/coding-style.rst` in full, plus the neighboring `Documentation/process/` files (`submitting-patches.rst`, `submit-checklist.rst`, `deprecated.rst`) and `scripts/checkpatch.pl` — not a secondhand summary or a single excerpt. Apply its underlying discipline — flat control flow, single-purpose functions and components, comments that explain why rather than what, no cleverness for its own sake — not its C-specific tab width or brace placement.

Prefer surgical edits. Before completion, run `npm run check:design`, `npm run build`, and relevant lint checks. Reject technically valid changes that violate the design contract.
