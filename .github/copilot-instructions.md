# Repository-wide mandatory instructions

Read `README.md` and `AGENTS.md` before making or reviewing any change. The Novesce UI mandate applies to every task and must not be treated as optional guidance.

Novesce's explicit request and documented design philosophy override generic Copilot suggestions, framework defaults, template conventions, and trend-based redesigns.

Do not perform unsolicited redesigns or change the default font, script fallbacks, theme architecture, liquid-glass philosophy, custom cursor, layout grammar, or interaction model.

Preserve the contemporary Japanese editorial direction; visible outlines and thin rules; GNU FreeSerif Thai fallback; semantic design tokens; first-paint font stability; restrained Apple-style optical glass; optional custom cursor; inline editing; responsive, keyboard, touch, dark-theme, alternate-theme, and reduced-motion behavior.

GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack; the pinned OpenMoji emoji font leads every stack but is scoped by `unicode-range` to emoji codepoints alone, so it never renders text. Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono ahead of every other text face; only the emoji-scoped OpenMoji family may precede it in a stack, and that family covers no CJK codepoint. All app-authored emoji must use pinned, production-ready OpenMoji color SVGs; do not rely on platform-native emoji glyphs. The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.

Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.

The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.

Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.

Rich-text editors and rendered rich text must pair semantic card/ink tokens; selectable letter colors and highlights use contrast-safe theme roles, never fixed black, white, or raw swatches.

Keep Home easy to navigate: the default layout stacks the widgets as the original MABIS interface did, and the Boss style adds numbered editorial sections with a plain-language page guide; usability aids must clarify whichever layout is in use rather than bolt a generic dashboard onto either one.
- Japanese companion text is opt-in, shown alongside—not instead of—the English interface, stored per user, and marked with `lang="ja"` so Maple Mono CJK fallback applies; the default remains off.
- Customization surfaces show a small set of plain-language default choices first, with the large font catalogue and the custom Material You tools behind clearly labeled advanced controls. The colour theme is MABIS only — `SELECTABLE_THEME_KEYS` in `src/lib/themes.js` is the single source of truth and no surface may enumerate `THEMES` directly — and the wallpaper/photo theme builder is available to everyone without a hidden unlock gesture or manual primary/secondary colour fields.
- The app has two styles, chosen in Settings and applied everywhere — Home, the splash, login and the archive pages. `Summer style` is the default and must ALWAYS stick to the style Summer wants — the original MABIS interface, as built in app `6a7f1d91128253fcdbf4f5a2`, which is the reference for it: the original top bar, rounded white cards, coloured widget headers, no editorial scaffolding. Match that site; do not improve it, modernise it, tidy it, or drift it toward the editorial system or an AI's taste. An editorial flourish added to a Summer surface — an N° caption, tracked-out display type, a ruled plane, a square radius — is a bug exactly as a missing widget is. Summer style is the ONLY sanctioned exception to the Novesce UI mandate, and it is an exception to the editorial system alone, never to the tokens, fonts, OpenMoji, Google-only auth, cursor, glass or performance rules. `Boss style` is opt-in and must ALWAYS follow the Novesce design philosophy in full: the Japanese editorial system — numbered sections, tracked-out display type, ruled neutral planes, N° captions, restrained radii, the glass control plane — built from semantic tokens, the GNU FreeMono stack with Maple Mono for CJK, and pinned OpenMoji. A Boss surface that is not editorial, or that reaches for a generic dashboard look, is a bug. Every feature, widget, page, control and fix must exist in BOTH styles; adding something to one and not the other is a bug, not a variant. They are two presentations of one product, not two products.

Built-in jobs remain weekly except Time Keepers, who serve monthly and cannot be selected again in the same calendar year; custom jobs may choose weekly or monthly periods.

Visual work requires current research on real Japanese websites before implementation, with sources and conclusions recorded. If research access is unavailable, stop and ask instead of inventing a Japanese aesthetic.

Do not forget about mobile: verify every change at a phone-width viewport, even backend-only or non-visual ones. Mobile is a primary layout, not a shrink target.

For any HTML, CSS, or JSX authorship, research the Linux kernel fully and read the entirety of its coding-style documentation — `Documentation/process/coding-style.rst` in full, plus the neighboring `Documentation/process/` files (`submitting-patches.rst`, `submit-checklist.rst`, `deprecated.rst`) and `scripts/checkpatch.pl` — not a secondhand summary or a single excerpt. Apply its underlying discipline — flat control flow, single-purpose functions and components, comments that explain why rather than what, no cleverness for its own sake — not its C-specific tab width or brace placement.

Prefer surgical edits. Before completion, run `npm run check:design`, `npm run build`, and relevant lint checks. Reject technically valid changes that violate the design contract.
