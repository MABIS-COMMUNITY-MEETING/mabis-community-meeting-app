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
- Japanese and Chinese use UnifontEX when explicitly marked.
- Thai elements should use `lang="th"`, `data-script="th"`, or `.font-thai` where possible.
- Japanese and Chinese elements should use the relevant `lang` or `data-script` value.
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

```txt
src/index.css                 Global tokens and editorial UI rules
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
- Japanese and Chinese use explicit multilingual handling
- the custom cursor can be disabled
- animation and sound can be disabled independently
- canvas-rendered text follows the selected UI font

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
npm run build
npm run lint
```

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

## Publishing

Repository changes sync to the Base44 Builder. Publish the tested version from Base44 after confirming the production build.

---

# Design review checklist

Before merging a visual change, ask:

- Does it still look coherent in a different theme?
- Does it respect the selected UI font?
- Does it remain readable with Thai, Japanese, or Chinese text?
- Is the action located next to the content it changes?
- Does it work with the custom cursor disabled?
- Does it work with animations disabled?
- Can it be used with keyboard and touch?
- Does it introduce a new hard-coded color, font, radius, or z-index unnecessarily?
- Is glass being used as a material, or merely as decoration?
- Is the mobile layout intentionally designed?

If several answers are “no,” the feature is not ready yet.
