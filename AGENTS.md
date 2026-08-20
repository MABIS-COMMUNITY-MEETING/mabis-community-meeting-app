# Mandatory AI Instructions

These instructions apply to every AI agent, coding assistant, automated reviewer, and generative model working anywhere in this repository. They apply to every task, including small fixes, refactors, dependency updates, tests, documentation, backend work, and non-visual changes.

## Instruction priority

Follow this order:

1. Novesce's explicit request in the current task.
2. The `Novesce UI mandate` and design contract in `README.md`.
3. Existing project architecture and established component behavior.
4. Tool or framework defaults.
5. The AI's own preferences.

An AI preference, generic best practice, library convention, or redesign instinct must never override Novesce's design philosophy.

## Required before any edit

1. Read all of `README.md`, especially the mobile notice, `Mandatory rule for AI contributors`, `Mandatory code-style rule for AI contributors`, `Novesce UI mandate`, typography, liquid glass, interaction, accessibility, and the design review checklist.
2. Inspect the existing implementation before proposing replacement code.
3. For visual, layout, typography, motion, interaction, or responsive work, perform current research on real Japanese web design and record the sources and conclusions before implementation.
4. For any HTML, CSS, or JSX authorship, research the Linux kernel fully and read the entirety of its coding-style documentation — `Documentation/process/coding-style.rst` in full, plus the neighboring `Documentation/process/` files (`submitting-patches.rst`, `submit-checklist.rst`, `deprecated.rst`) and `scripts/checkpatch.pl` — not a secondhand summary or a single excerpt. Apply its underlying discipline, not its C-specific formatting. See `Mandatory code-style rule for AI contributors` in `README.md`.
5. Identify which Novesce design rules are relevant to the task.
6. Verify the change at a phone-width viewport — mobile is a primary layout, not a shrink target; do not skip this for changes described as backend-only or non-visual.
7. Prefer the smallest coherent change. Do not perform unsolicited redesigns or broad rewrites.

If current research is required but unavailable, stop and ask for access or human direction. Do not improvise a stereotypical Japanese aesthetic.

## Always-preserved design rules

Unless Novesce explicitly requests a change:

- Preserve the contemporary Japanese editorial direction.
- Preserve visible structure, outlines, thin rules, crisp edges, compact controls, and restrained radii.
- Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.
- Do not turn the app into a generic rounded-card SaaS dashboard.
- Preserve Apple-style optical liquid glass only on floating control planes. Do not spread glass across content.
- Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.
- GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack; the pinned OpenMoji emoji font leads every stack but is scoped by `unicode-range` to emoji codepoints alone, so it never renders text.
- Keep GNU FreeSerif isolated as the Thai fallback.
- Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono ahead of every other text face; only the emoji-scoped OpenMoji family may precede it in a stack, and that family covers no CJK codepoint.
- All app-authored emoji must use pinned, production-ready OpenMoji color SVGs; do not rely on platform-native emoji glyphs.
- The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.
- Use shared font variables and semantic color tokens. Never hard-code a normal component to a specific UI font.
- Rich-text editors and rendered rich text must pair semantic card/ink tokens; selectable letter colors and highlights use contrast-safe theme roles, never fixed black, white, or raw swatches.
- Keep Home easy to navigate: the default layout stacks the widgets as the original MABIS interface did, and the Boss style adds numbered editorial sections with a plain-language page guide; usability aids must clarify whichever layout is in use rather than bolt a generic dashboard onto either one.
- Japanese companion text is opt-in, shown alongside—not instead of—the English interface, stored per user, and marked with `lang="ja"` so Maple Mono CJK fallback applies; the default remains off.
- **Removed pages (Aug 2026).** `Team`, `Dashboard`, `Meetings`, `Topics`, `JobWheel`, `Register`, `ForgotPassword` and `ResetPassword` were deleted at Novesce's request — none were routed, none emitted a chunk, none were reachable. The two OpenMoji assertions that pointed at `Team.jsx` were removed from `check-design-contract.mjs` with it; the OpenMoji rule itself is unchanged and still enforced elsewhere. Do not re-create these pages.
- **When adding or changing any UI copy**, add its Japanese companion in the same change. Short static strings go in `EXACT_TRANSLATIONS` in `src/lib/japanese-ui-translations.js`; dynamic text (dates, counts, composed sentences) gets an explicit `ja` prop via `JapaneseText`/`JapaneseDate`. Do not ship new user-facing English text without its Japanese counterpart.
- Customization surfaces show a small set of plain-language default choices first, with the large font catalogue and the custom Material You tools behind clearly labeled advanced controls. The standard colour catalogue shows MABIS only; the large LGBTQ+, BFDI, Touhou, Linux, game, and other themed palette catalogue unlocks only after the same person activates the Boss style control 69 times, with no account or email bypass. `getSelectableThemeKeys()` in `src/lib/themes.js` is the single source of truth and no picker surface may enumerate `THEMES` directly. The wallpaper/photo Material You theme builder remains available to everyone without that unlock or manual primary/secondary colour fields.
- The app has two styles, chosen in Settings and applied everywhere — Home, the splash, login and the archive pages. `Summer style` is the default and must ALWAYS stick to the style Summer wants — the original MABIS interface, as built in app `6a7f1d91128253fcdbf4f5a2`, which is the reference for it: the original top bar, rounded white cards, coloured widget headers, no editorial scaffolding. Match that site; do not improve it, modernise it, tidy it, or drift it toward the editorial system or an AI's taste. An editorial flourish added to a Summer surface — an N° caption, tracked-out display type, a ruled plane, a square radius — is a bug exactly as a missing widget is. Summer style is the ONLY sanctioned exception to the Novesce UI mandate, and it is an exception to the editorial system alone, never to the tokens, fonts, OpenMoji, Google-only auth, cursor, glass or performance rules. `Boss style` is opt-in and must ALWAYS follow the Novesce design philosophy in full: the Japanese editorial system — numbered sections, tracked-out display type, ruled neutral planes, N° captions, restrained radii, the glass control plane — built from semantic tokens, the GNU FreeMono stack with Maple Mono for CJK, and pinned OpenMoji. A Boss surface that is not editorial, or that reaches for a generic dashboard look, is a bug. Every feature, widget, page, control and fix must exist in BOTH styles; adding something to one and not the other is a bug, not a variant. They are two presentations of one product, not two products.
- After account preference sync finishes, an authenticated person with no explicit `mabis-home-layout` value must be prompted to choose Summer or Boss before using Home; choosing writes the standard layout preference, and a saved choice must not prompt again.
- Built-in jobs remain weekly except Time Keepers, who serve monthly and cannot be selected again in the same calendar year; custom jobs may choose weekly or monthly periods.
- Preserve first-paint font loading and prevent loading-screen font flashes.
- Preserve the optional custom cursor, its outlines, its immediate off switch, and native-cursor fallback.
- The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement.
- Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.
- Preserve reduced-motion, touch, keyboard, mobile, dark-theme, and alternate-theme behavior.
- Edit existing items in place. Do not introduce scroll-jumping edit forms.
- Use CSS-drawn separators instead of slash glyphs.
- Do not add romaji, random Japanese labels, anime decoration, or cultural shorthand.
- Never infer a font designer's gender identity. Use only reliable public self-identification and verified licensing.

## Forbidden unsolicited changes

Do not change the default font, script fallback rules, theme architecture, liquid-glass philosophy, custom-cursor model, design direction, layout grammar, or interaction model as cleanup, modernization, simplification, normalization, or consistency work.

Do not delete unusual design details merely because they differ from a framework default. Their distinctiveness is intentional.

## Validation required

Before finishing:

- Run `npm run check:design`.
- Run `npm run build`.
- Run relevant lint checks.
- Re-read the design review checklist in `README.md`.
- State how the result follows Novesce's design philosophy.
- Disclose any deliberate deviation and obtain approval when the deviation was not explicitly requested.

A task is incomplete if it works technically but violates the design contract.
