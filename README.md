# MABIS Community Meeting App

A shared workspace for Montessori Academy Bangkok International School community meetings. The app combines discussion topics, announcements, attendance, meeting notes, schedules, job rotation, history, and account-based preferences in one responsive interface.

This README is also the project’s **design contract**. New pages and components should follow these rules so the app continues to feel like one coherent product rather than a pile of unrelated widgets.

## Mandatory rule for AI contributors

An AI agent, coding assistant, or generative model must **research Japanese web design in depth before writing or editing any project code**. Do not begin implementation from memory, stereotypes, a generic “Japanese-inspired” prompt, or the visual habits of Western SaaS products.

The research pass must happen before code changes and should:

- Study current, real Japanese websites across several categories, such as editorial publications, cultural institutions, schools, public services, studios, retail, and technology.
- Prefer original Japanese sites, Japanese-language material, design-system documentation, case studies, and other primary or credible sources over mood boards, scraped galleries, AI summaries, or Pinterest-style collections.
- Examine composition, grid behavior, density, typography, spacing, navigation, mobile layouts, forms, motion, color restraint, accessibility, and content hierarchy.
- Compare several examples rather than copying one site.
- Separate observed patterns from personal assumptions.
- Check findings against the design contract in this README and the existing implementation before proposing changes.
- Record the sources studied and a concise summary of the relevant findings in the working notes, pull request, issue, or change summary.

Research does not grant permission to imitate a site pixel-for-pixel. The goal is to understand design principles and adapt them to this school community product.

If the AI cannot access current research sources, it must stop and ask for research access or human direction instead of inventing a Japanese aesthetic. This rule applies before visual design, layout, typography, styling, motion, interaction, responsive behavior, or component work. For non-visual fixes, the AI must still read this design contract first and verify that the change does not accidentally alter the interface.

## Novesce UI mandate

This section records how **Novesce wants the interface to look and behave**. It is a higher-priority design requirement than an AI model’s personal taste, framework defaults, generic best practices, template conventions, trend reports, or an attempt to make the product look more conventional.

An AI must not quietly reinterpret, modernize away, simplify, normalize, or replace these preferences. When a requested change conflicts with this mandate, follow the explicit request. When the conflict is unclear, stop and ask Novesce before changing the design system.

### The overall feeling

Novesce prefers a UI that feels:

- contemporary Japanese editorial rather than generic Western SaaS
- precise, deliberate, slightly unusual, and strongly art-directed
- information-dense but calm
- technical and typographic rather than illustration-heavy
- feminine or queer when a theme calls for it, without turning into an uncontrolled rainbow gradient
- modern and polished without losing outlines, structure, or personality

The visual language should use asymmetric grids, large cropped type, small index numbers, thin structural rules, compact labels, measured whitespace, paper-and-ink contrast, and carefully placed accent colors.

Do not convert the product into a soft collection of identical rounded cards. Do not replace its personality with a stock component-library look. Do not default to the visual grammar of a startup landing page, an admin template, Material Design, or a generic dashboard.

### Japanese influence

Japanese influence must come from researched composition, pacing, density, typography, hierarchy, navigation, and material restraint. It must not come from random kanji, fake Japanese copy, anime decoration, red-circle motifs, or stereotypical visual shorthand.

- No romaji decoration.
- No random Japanese labels.
- Keep English interface labels clear and functional.
- Real Japanese, Chinese, or Thai content is welcome when it is actual content and receives the correct language metadata.
- Decorative separators must be drawn with CSS, not typed as `/`, `／`, or another font-dependent glyph.

### Shape, outlines, and surfaces

Novesce prefers visible structure.

- Preserve outlines and borders. Do not erase them merely to make the UI look softer.
- Use crisp edges and small radii for ordinary content.
- Reserve pills for statuses, filters, and genuinely pill-shaped controls.
- Avoid excessive shadows, inflated spacing, and card-inside-card construction.
- A component should earn its container. Do not wrap every line of content in a panel.
- Keep the editorial content plane crisp and readable.

### Liquid glass

Liquid glass should feel closer to **Apple-style optical liquid glass** than Frutiger Aero.

It should have restrained transparency, edge refraction, directional highlights, clear outlines, depth appropriate to the control, and readable content. It must not become blue-green bubble glass, wet plastic, glossy skeuomorphism, or a blur pasted onto every surface.

- Use glass mainly for floating navigation, compact controls, toolbars, overlays, and special control planes.
- Keep outlines and edge definition.
- Do not nest backdrop filters.
- Do not apply glass to long text, discussion bodies, lists, or every card.
- Preserve the existing glass architecture in `src/styles/glass.css` unless Novesce explicitly requests a redesign.
- Preserve live single-pass glass backdrop blur during wheel, touch, rapid, and momentum scrolling; active-scroll optimizations may pause decoration but must not replace glass with an opaque fallback.

### Color

The base design uses ink, bone, MABIS maroon, and gold, while the theme system may introduce Pride, GMK, Linux, console, character, and custom palettes.

- Neutral surfaces should carry most of the page.
- Theme colors should arrive through edges, rules, small fills, indicators, cursor light, and focused interaction states.
- Do not flood every surface with the active accent.
- Preserve the recognizable source colors of themed palettes while maintaining contrast.
- For feminine or transfeminine treatments, deliberate pink accents are preferred over generic pastel gradients.
- Never hard-code a color when a semantic token already expresses its role.

### Font contract

Typography is part of the interface architecture, not a decorative afterthought.

**GNU FreeMono is the default UI font.** It must remain the default until Novesce explicitly asks to change it. GNU FreeMono remains the default and every selectable UI face falls back through the GNU FreeFont stack.

The current script rules are mandatory:

- English and ordinary Latin UI use the selected UI font.
- Thai falls back to the Thai-only **GNU FreeSerif** face.
- Explicitly marked Chinese, Japanese, and Korean text uses **Maple Mono** first, with the GNU FreeFont stack beneath it.
- Multilingual fallbacks must never leak into ordinary English UI.

Every component must use the shared font variables or matching Tailwind utilities. Do not hard-code a font family inside a page, modal, loading screen, canvas, export routine, or component.

The customizable font system must remain available. Featured choices include GNU FreeMono, GNU FreeSerif, GNU FreeSans, Go, Iosevka, Lilex, UnifontEX, Torrefarfan, and the legally embeddable Libre Fonts by Womxn catalogue. Commercial choices such as Atlas Mono or Transgender Grotesk may appear only as licensed/local options unless the correct webfont license and files are supplied.

When selecting new fonts, prefer work from **publicly self-identified LGBTQ+, trans, non-binary, intersex, or FLINTA designers** when authorship, identity, licensing, and script support can be verified from reliable public sources. Never guess or infer a designer’s identity.

The font picker must keep the preview sentence:

> Montessori Acadamy Bangkok International School

Font implementation rules:

- Apply the saved font before React paints.
- Preload the active default faces needed for first paint.
- Prevent font flashes on the loading screen.
- Keep the loading screen on one captured selected family throughout its animation.
- Make canvas-rendered text read the active CSS font variable.
- Verify regular and bold faces.
- Keep user choices synced to the signed-in account.
- Do not silently replace a missing commercial font with a visually identical-looking label. Clearly report that its fallback is active.

### Emoji and iconography

All app-authored emoji must use pinned, production-ready OpenMoji color SVGs; do not rely on platform-native emoji glyphs.

- Render intentional interface emoji through `src/components/OpenMoji.jsx`.
- Keep the production SVGs pinned and self-hosted under `public/openmoji/<version>/`; do not load the experimental OpenMoji font or an unversioned CDN.
- Emoji that repeats an adjacent text label is decorative and uses empty alternative text. A meaningful standalone emoji needs a concise accessible label.
- Lucide remains the interface icon library; OpenMoji is for emoji artwork, not a replacement for functional control icons.
- All emojis are designed by [OpenMoji](https://openmoji.org/), the open-source emoji and icon project, and are used under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

### Motion and cursor

Motion should feel physical, restrained, and responsive. It may use springs, reveals, small transformations, and pointer-aware material behavior, but it must not become a carnival of perpetual animation.

The custom liquid cursor is a distinctive part of the desktop experience. Preserve it, including its outlines, jitter-stabilized core dot, and bounded spring-follow outer ring, unless Novesce explicitly requests a redesign. It must also remain optional:

- The Settings toggle must disable it immediately.
- The native cursor must return when it is disabled.
- The physics loop must stop rather than continue invisibly.
- Touch devices, reduced-motion environments, and low-power modes must receive safe fallbacks.
- The animation preference must continue to disable nonessential motion.

### Interaction behavior

Novesce prefers direct manipulation over page jumps and detached forms.

- Edit an item inside its own card or row.
- Keep the page at the current scroll position while editing.
- Use the top form only for creating a new item when that is the established pattern.
- Put actions close to the object they affect.
- Keep controls compact, but preserve accessible touch targets.
- Never hide an essential action behind hover alone.
- Avoid destructive rewrites of working interaction code when a surgical fix is possible.

### AI enforcement procedure

Before an AI changes this project, it must complete all of the following:

1. Read this entire README, especially the AI research rule and Novesce UI mandate.
2. Perform the required research on real Japanese web design before visual work.
3. Inspect the existing design tokens, typography variables, theme system, glass styles, and reference components.
4. State in its working notes which Novesce preferences are relevant to the requested change.
5. Make the smallest coherent change that satisfies the request.
6. Preserve the font picker, script fallbacks, loading-font bootstrap, theme compatibility, cursor toggle, inline editing, and responsive behavior unless the request explicitly changes them.
7. Run the production build and relevant lint checks.
8. Test at least one mobile width, one alternate theme, the selected default font, Thai fallback behavior, custom cursor off, and reduced motion when the change can affect those systems.
9. Summarize what changed and identify any deliberate deviation from this mandate.

An AI must not change the default font, typography fallback rules, liquid-glass philosophy, Japanese editorial direction, cursor behavior, theme architecture, or interaction model as an unsolicited cleanup. A direct request from Novesce may change these rules. When that happens, update this README in the same change so it remains the source of truth.

### Always-on agent enforcement

The design philosophy is duplicated into the repository-level instruction files used by major coding agents:

- `AGENTS.md` for repository-aware coding agents
- `CLAUDE.md` for Claude Code
- `GEMINI.md` for Gemini-compatible agents
- `.cursor/rules/novesce-design.mdc` as an `alwaysApply` Cursor project rule
- `.github/copilot-instructions.md` for GitHub Copilot

These files do not replace this README. They force agents to load, respect, and validate this README as the canonical design contract.

The command below checks that the instruction files and core design rules remain present:

```bash
npm run check:design
```

`npm run build` runs this check automatically through the `prebuild` script. A build must fail if an AI removes the Novesce mandate, disables the always-on rule, changes the protected font/fallback contract without updating the complete instruction system, or deletes an agent instruction file.

No task is exempt because it is “small,” “backend-only,” “just cleanup,” “only a refactor,” or “not really design work.” Every change must preserve the design philosophy, and any explicit design-system change requested by Novesce must update this README, all agent instruction files, and the contract checker together.

## Core product principles

1. **Useful before decorative**  
   The interface is used during real meetings. Important actions must be obvious, fast, and close to the content they affect.

2. **Edit in context**  
   Editing a discussion topic, announcement, or record should happen where that item already appears. Do not jump the user to a form at the top of a long page unless they are creating a new item.

3. **Calm information density**  
   Show a lot of useful information without turning the page into a dashboard wall. Use whitespace, rules, hierarchy, and restrained color rather than oversized cards around everything.

4. **Personalization without fragmentation**  
   Themes, fonts, motion, sound, and cursor preferences may change, but the layout, hierarchy, contrast, and interaction rules must remain dependable.

5. **Mobile is a primary layout**  
   Every feature must remain usable on a phone, not merely shrink until it technically fits.

---

# Design direction

## Visual character

The site should feel like a **contemporary Japanese editorial system adapted for a school community tool**:

- precise grids
- generous negative space
- thin rules and index numbers
- restrained typography
- paper, ink, and stamp-like accent colors
- occasional optical glass on floating controls
- subtle kinetic movement
- practical, readable forms

The Japanese influence should come from composition, pacing, hierarchy, and material restraint. It must not rely on decorative stereotypes.

### Do

- Use asymmetrical editorial grids.
- Use numbered sections such as `01`, `02`, and `03` to create rhythm.
- Use thin dividers and small technical labels.
- Let one large headline or number carry a section.
- Keep controls compact and clearly grouped.
- Use the theme’s primary color as a precise accent, not a paint bucket.

### Do not

- Add random Japanese words purely for decoration.
- Add romaji. Romanized Japanese labels such as `KAIGI`, `OSHIRASE`, or `YOTEI` are not part of the design language.
- Use anime-style decoration unless it is an intentional theme or requested feature.
- Use full-width slash characters or font-rendered `/` glyphs as visual separators.
- Cover every surface in blur, gradients, glow, or glass.
- turn the interface into a generic rounded-card SaaS dashboard.

When a diagonal separator is required, draw it with CSS so it remains consistent across user-selected fonts.

---

# Layout system

## Page structure

Use the existing editorial shell:

- A large masthead introduces the page or meeting context.
- Content is divided into numbered editorial sections.
- Desktop sections may use a narrow index rail plus a flexible content column.
- Mobile collapses to one readable column.
- Important page controls stay reachable without covering content.

Reference components:

- `src/components/home/HomeMasthead.jsx`
- `src/components/home/EditorialSection.jsx`
- `src/components/SectionReveal.jsx`
- `src/components/SiteHeader.jsx`

## Spacing

Use spacing to explain relationships:

- Small gaps inside one control group.
- Medium gaps between fields or pieces of a card.
- Large gaps between editorial sections.
- Avoid placing unrelated actions in the same tight row.

Prefer Tailwind’s spacing scale instead of arbitrary pixel values. Arbitrary values are acceptable for deliberate editorial proportions, not as a default habit.

## Borders and radii

The product uses crisp edges and light structural rules.

- Default radius comes from `--radius` and is intentionally small.
- Use thin borders to define structure.
- Avoid adding large pill shapes to ordinary panels.
- Pills are appropriate for statuses, compact filters, and small segmented choices.
- Large rounded surfaces should be reserved for overlays or clearly tactile controls.

## Cards

A card should represent a real object or task, not merely fill empty space.

Good card candidates:

- one discussion topic
- one announcement
- one member record
- one meeting summary
- one settings group

Avoid nesting cards inside cards unless the inner element is an interactive object with a separate state.

---

# Color and themes

## Use semantic tokens

New UI must use theme tokens rather than fixed colors:

```css
background: hsl(var(--background));
color: hsl(var(--foreground));
border-color: hsl(var(--border));
accent-color: hsl(var(--primary));
```

Preferred Tailwind classes include:

```txt
bg-background text-foreground
bg-card text-card-foreground
bg-muted text-muted-foreground
bg-primary text-primary-foreground
border-border
```

Do not add new hard-coded maroon, gold, red, white, or gray values when a semantic token can express the role.

## Default palette

The base visual model is:

- **ink** for deep structural surfaces
- **bone** for paper and light text
- **primary** for the active stamp-like accent
- **secondary** for supporting emphasis
- neutral backgrounds for the majority of content

The default MABIS palette begins from maroon and gold, but every component must also work under the full theme library.

## Theme behavior

Theme changes should feel continuous rather than flashing between unrelated palettes.

- Keep contrast stable.
- Preserve hierarchy in both light and dark themes.
- Use bright theme colors mainly for edges, small fills, indicators, and interaction states.
- Do not recolor every neutral surface with the active theme.
- Pride, character, console, Linux, and GMK themes should retain their recognizable source hues without making text unreadable.

Theme definitions live in:

- `src/lib/themes.js`
- `src/lib/pride.js`
- `src/lib/gmk_palettes.js`
- `src/lib/bfdi_palettes.js`

---

# Typography

## Default font

The default interface font is **GNU FreeMono**.

All UI typography must use the CSS variables:

```css
var(--font-body)
var(--font-heading)
var(--font-display)
var(--font-mono)
```

Or the matching Tailwind utilities:

```txt
font-body
font-heading
font-display
font-mono
```

Never hard-code a component to UnifontEX, GNU FreeMono, Iosevka, Lilex, or another family when it should follow the user’s chosen UI font.

## User-selectable fonts

The Settings font picker includes embedded libre fonts and licensed-local options. Every font card previews:

> Montessori Acadamy Bangkok International School

When adding a font:

1. Confirm its redistribution and web-embedding license.
2. Add a real webfont file for embedded choices.
3. Do not represent a missing local font as installed.
4. Add it to `src/lib/themes.js`.
5. Test regular and bold text before making it featured.
6. Confirm the loading screen does not flash through another font.

Commercial fonts such as Transgender Grotesk and Atlas Mono must not be bundled without the correct web license.

## Multilingual behavior

- English and ordinary interface text use the selected UI font.
- Thai falls back to the Thai-only GNU FreeSerif face.
- Explicitly marked Chinese, Japanese, and Korean text uses Maple Mono first.
- Thai elements should use `lang="th"`, `data-script="th"`, or `.font-thai` where possible.
- Chinese, Japanese, and Korean elements should use the relevant `lang`, `data-script`, `.font-cjk`, or `.font-multilingual` marker.
- Do not let multilingual fallbacks replace ordinary English text.

## Hierarchy

- Mastheads may use very large, tightly tracked display text.
- Section headings should be strong but smaller than the page masthead.
- Technical labels are compact, uppercase, and widely tracked.
- Body text should remain comfortably readable.
- Avoid excessive all-caps paragraphs.
- Use tabular numerals for dates, counters, weeks, and indexes.

---

# Liquid glass

Liquid glass is an **optical material for the floating control plane**, not the main content plane.

Use glass for:

- persistent navigation
- floating toolbars
- compact control clusters
- controller prompts
- modal surfaces
- small icon controls over visual backgrounds

Do not use glass for:

- long articles
- discussion descriptions
- large lists of records
- every card on the page
- nested surfaces with multiple backdrop filters

## Glass variants

Use the existing classes in `src/styles/glass.css`:

```txt
lg-surface
lg-compact
lg-regular
lg-navigation
lg-controller
lg-panel
lg-thick
lg-clear
lg-overlay
lg-on-dark
lg-on-light
```

Rules:

- One backdrop filter per surface.
- Never nest glass surfaces unless the child does not create another backdrop-filter layer.
- Specular highlights should respond to the pointer, not sweep forever.
- The center of a panel must stay optically stable enough for text behind it to remain legible.
- Reduce optical complexity on mobile and low-power devices.
- Always provide a solid translucent fallback for browsers without backdrop-filter support.

---

# Motion

Motion should explain state and hierarchy, not continuously demand attention.

## Preferred behavior

- Reveal a section once as it enters the viewport.
- Use short opacity and position transitions for modal and panel state changes.
- Keep the standard easing near `cubic-bezier(0.16, 1, 0.3, 1)`.
- Animate transform and opacity where possible.
- Use the shared physics and pointer systems for the custom cursor rather than creating another animation loop.

## Avoid

- perpetual decorative motion across many components
- large layout animations that move controls away from the pointer
- repeated blur interpolation
- scroll-jacking
- animations that prevent interaction until they complete

The app has a global animation preference. New animation systems must respect:

- `prefers-reduced-motion`
- the app’s animation toggle
- performance-lite and low-power modes

---

# Cursor and pointer behavior

The liquid custom cursor is optional.

- The custom cursor's core dot must follow browser `clientX`/`clientY` in CSS pixels without prediction, magnetic displacement, device-pixel-ratio scaling, or accumulating lag; a tightly capped spatial deadband may suppress subpixel and one-pixel OS jitter, and the outer ring may use bounded spring-follow displacement. Movement beyond the deadband must snap to the current browser sample rather than use time-based easing. The ring's displacement must remain capped and settle quickly; neither layer may apply DPR conversion.
- Custom-cursor deformation should use bounded underdamped springs, settle promptly, and never loop while idle.
- It is enabled only for fine pointers when motion and performance conditions permit.
- Settings can turn it off and restore the native system cursor immediately.
- Turning it off must stop the pointer physics loop, not merely hide the cursor graphics.
- Text fields must retain an appropriate text caret.
- Touch devices must never depend on hover or the custom cursor.

Relevant files:

- `src/components/CustomCursor.jsx`
- `src/lib/cursor-preference.js`
- `src/lib/physics/`

---

# Interaction design

## Editing

Edit existing content in place.

For example, discussion topics open an inline editor inside the selected topic card. The page must not scroll to a shared form at the top.

Inline editors should provide:

- a clear editing label
- Save
- Cancel
- a visible pending state
- validation close to the field
- no accidental save from unrelated clicks

Use the top-level creation form only for new content.

## Buttons

- Use verbs that describe the result: `Save Changes`, `Add Topic`, `End Meeting`.
- Destructive actions must be visually distinct and require confirmation when data loss is significant.
- Icon-only buttons need an accessible name or title.
- Keep touch targets at least about 40 to 44 CSS pixels on coarse pointers.

## Forms

- Labels should remain visible when possible.
- Placeholder text is a hint, not a replacement for a label.
- Validation must explain how to fix the problem.
- Do not reset user input after an unrelated query refresh.
- Preserve focus and scroll position during inline updates.

## Loading states

- Apply the saved UI font before rendering the loading screen.
- Do not allow a second font to appear during startup.
- Keep loading feedback brief and non-blocking.
- Use skeletons or local pending states for small updates instead of covering the whole page.

---

# Accessibility

Every design change must preserve:

- keyboard navigation
- visible focus indicators
- meaningful headings
- accessible names for icon buttons
- sufficient text and control contrast
- reduced-motion behavior
- native scrolling
- usable touch targets
- logical focus order

Do not encode status using color alone. Pair color with text, an icon, a label, or a shape.

Use real buttons for actions and real links for navigation. Avoid clickable `div` elements when a semantic element is available.

---

# Responsive design

## Mobile

- Use one primary column.
- Keep headers compact and allow control rows to wrap.
- Avoid fixed widths wider than the viewport.
- Remove expensive glass lens passes where necessary.
- Do not require hover to discover actions.
- Keep inline editors inside their cards without horizontal overflow.
- Test with Android and iOS browser UI reducing the visible viewport.

## Desktop

- Use wider editorial grids without stretching body copy indefinitely.
- Keep controls near the content they affect.
- Use sticky navigation sparingly.
- Preserve whitespace instead of filling every empty region.

---

# Component implementation rules

## Prefer

- Existing shared components and semantic tokens.
- Small components with one visual responsibility.
- React Query for server state.
- Local state for temporary UI state.
- Event-based preference updates through the existing preference utilities.
- CSS variables for theme-sensitive values.

## Avoid

- duplicating the same editor or form in multiple places
- new global event loops for decorative effects
- hard-coded font stacks
- hard-coded theme colors
- arbitrary z-index escalation
- nested backdrop filters
- disabling native scrolling
- storing secrets or admin credentials in the README or client code

## Important style files

Preserve the Home editorial normalization in `src/styles/editorial-home.css`: neutral ruled content planes, restrained radii, no widget elevation, and edge-to-edge mobile modules.

```txt
src/index.css                 Global tokens and editorial UI rules
src/styles/editorial-home.css Scoped Home widget and mobile editorial rules
src/styles/glass.css          Liquid-glass material system
tailwind.config.js            Theme tokens, font utilities, radii
src/lib/themes.js             Theme and font catalogue
src/lib/pride.js              Art-directed Pride theme behavior
```

---

# Feature behavior to preserve

When redesigning, do not break these product expectations:

- authenticated MABIS accounts take priority over local demonstration identities
- user preferences sync across devices
- discussion topics edit inline
- meeting mode remains usable on mobile
- font selection changes the entire interface
- Thai uses GNU FreeSerif fallback
- Chinese, Japanese, and Korean use explicit Maple Mono multilingual handling
- The public authentication surface is Google-only: `/login` exposes one Continue with Google button, and registration/password-reset routes redirect there.
- the custom cursor can be disabled
- animation and sound can be disabled independently
- canvas-rendered text follows the selected UI font

---

# Performance architecture

Performance is part of the Novesce design contract. A technically correct change is incomplete when it makes the interface slower, increases first-load work without necessity, or restores hidden background activity.

AI and human contributors must preserve these rules:

- Route modules use shared dynamic loaders so navigation targets can preload on pointer or keyboard intent.
- Large Home widgets remain behind near-viewport `LazySection` and `React.lazy` boundaries. Their mount and render work stays gated. On the first authenticated Home visit, capable connections may warm the section 01–10 code behind the startup screen within a strict time budget; Save-Data and 2G warm only the immediately useful sections. Delaying mount without splitting the import is not sufficient.
- Discussion is the explicit measured exception: its split chunk starts downloading as soon as Home evaluates, without a scroll gate, and it queries only the viewed week; its rich editor remains lazy.
- Rich-text editing, analytics charts, settings, profile editing, cursor physics, and floating assistant tools load only when their interaction requires them.
- Noncritical reminders and floating tools mount during browser idle time rather than competing with the first useful paint.
- Long editorial sections and list cards use `content-visibility` and intrinsic-size containment where supported.
- The theme chooser progressively mounts a small batch of memoized options and renders each palette as one lazily cached stripe; do not synchronously mount the full theme catalogue, precompute every preview at startup, or recreate a DOM node for every swatch. A selection commits CSS variables and the active body class once, suppresses page-wide transition fan-out for that paint, emits one preference event, and coalesces dependent canvas redraws.
- Decorative scroll indicators share one passive, animation-frame-throttled scroll signal and write to isolated DOM nodes without causing React renders on every scroll frame.
- Native browser scrolling is never intercepted. Scroll-linked decoration stays on transform and opacity; document height is cached between resize notifications; full-viewport grain and ambient loops yield only during active scroll and restore at scrollend. The single-pass glass backdrop remains optically stable during wheel, touch, rapid, and momentum scrolling; only `performance-lite` and unsupported-browser fallbacks may replace it with a static translucent surface.
- Canvas animations must cache computed styles, avoid reallocating backing buffers per frame, cap unreasonable pixel density, and cancel animation frames on unmount.
- Data queries that serve hidden tabs or unauthorized controls remain disabled until those surfaces are reachable.
- Use `useMemo`, `useDeferredValue`, transitions, and component memoization only where they remove measured work. Do not scatter them ceremonially.
- Canonical visuals, accessibility, reduced-motion behavior, mobile behavior, and the optional custom cursor must survive every optimization.
- The critical GNU FreeMono faces remain full-glyph WOFF2 files. Thai, CJK Maple Mono, and the optional Libre Fonts by Womxn catalogue load only when their actual text or settings surface requires them. Font readiness may delay React bootstrap for at most 800 ms.
- Production builds generate a revisioned offline shell from Vite's manifest. Register it after the `load` event, keep runtime caches bounded, and never put Base44 API, function, authorization, or cross-origin responses in Cache Storage.
- Offline data is a progressive enhancement: persist only the explicit read-only query allowlist, scope snapshots to the authenticated user, cap them at 2 MiB and seven days, and erase them on logout. Online authorization always wins and `401`/`403` responses must never fall back to an offline session.
- Respect Save-Data and 2G signals: avoid speculative route downloads, preload the next visible section early enough to avoid blank shells, and postpone nonessential floating UI until interaction. Low-memory devices use a shorter inactive query lifetime.

The production build enforces static performance boundaries and gzip budgets. Do not weaken or remove these checks merely to make an oversized change pass. Investigate the regression, preserve the intended lazy boundary, or obtain Novesce's explicit approval for a documented budget change.

---

# Development

## Requirements

- Node.js 18 or newer
- npm
- Base44 application credentials

## Setup

```bash
npm install
```

Create `.env.local`:

```env
VITE_BASE44_APP_ID=your_app_id
VITE_BASE44_APP_BASE_URL=your_backend_url
```

Start development:

```bash
npm run dev
```

## Validation

Before committing:

```bash
npm run check:performance
npm run build
npm run lint
```

`npm run build` also runs the design, theme, performance-contract, and post-build gzip-budget checks.

Also manually test:

- phone-width layout
- keyboard navigation
- light and dark themes
- at least one Pride or multi-color theme
- GNU FreeMono and another selectable font
- Thai text
- custom cursor on and off
- animation toggle
- inline topic editing without a scroll jump
- Home warm-up preparing sections 01–10 on a capable connection, while Save-Data/2G avoids below-fold chunk warm-up
- Analytics and rich-text editor chunks loading only when opened
- cursor physics remaining absent on touch, reduced-motion, and low-power devices

## Publishing

Repository changes sync to the Base44 Builder. Publish the tested version from Base44 after confirming the production build.

---

# Design review checklist

Before merging a visual change, ask:

- Did the contributor read and follow the Novesce UI mandate?
- If the contributor is an AI, did it research real Japanese web design and record its sources and findings before implementation?
- Would Novesce recognize this as the same product rather than a generic redesign?
- Did GNU FreeMono remain the default unless Novesce explicitly requested otherwise?
- Are the GNU FreeFont fallback chain, GNU FreeSerif Thai fallback, and Maple Mono CJK handling still isolated correctly?
- Does it still look coherent in a different theme?
- Does it respect the selected UI font?
- Does it remain readable with Thai, Chinese, Japanese, or Korean text?
- Is the action located next to the content it changes?
- Does it work with the custom cursor disabled?
- Does it work with animations disabled?
- Can it be used with keyboard and touch?
- Does it introduce a new hard-coded color, font, radius, or z-index unnecessarily?
- Is glass being used as a material, or merely as decoration?
- Is the mobile layout intentionally designed?

If several answers are “no,” the feature is not ready yet.
