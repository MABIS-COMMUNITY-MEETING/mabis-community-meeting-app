# SolidJS migration — status

The React app in `src/` is **live and untouched**. The Solid app is built in
parallel under `solid/` and swaps in only when it reaches parity.

```
vite.config.js        React  → dist/          (live site)
vite.solid.config.js  Solid  → dist-solid/    (in progress)
```

Both builds share `src/lib/**` and `src/styles/**` from their original
location. There is no fork, so the design system cannot drift between them.

Verify with:

```bash
npm run build            # React, must stay green (runs all four contracts)
npm run verify:solid     # Solid: build + compile-check + parity across routes
```

`verify:solid` is the one to run. It chains three things that fail for
different reasons:

| Step | Catches |
|---|---|
| `build:solid` | anything in the module graph that does not compile |
| `check:solid` | the same for **orphan** files nothing imports yet — Vite tree-shakes those out of the build, so a broken one stays invisible |
| `check:notes` | lossy `parseBlocks`→`serializeBlocks` round-trips. Notes are *stored* as HTML and re-parsed on every open, so anything the parser drops is deleted from the user's saved document on the next autosave. `block_html.js` is shared, so this guards **both** builds |
| `check:solid:parity` | components that compile but throw, drop content, or render wrong, asserted against the React source |

Parity runs one route per process (`/`, `/login`, `/nowhere`, `/home`, plus `/`
and `/login` with the Japanese preference on). The bundle is a singleton, so a
second route in the same process would assert against the first route's DOM.

`/home` is signed-in. The harness does not fake a backend — it seeds
`localStorage` so the app's own **offline-recovery** path restores a session:
`base44.auth.me()` fails, `AuthContext` falls back to `restoreOfflineUser()`,
and that reads a record keyed by an FNV-1a hash of the access token. If
`tokenMarker()` in `src/lib/offline-cache.js` ever changes, the copy in the
harness must change with it or `/home` will silently start testing the login
page instead. There is an explicit assertion guarding exactly that.

## Done

| Area | Notes |
|---|---|
| Toolchain | `vite-plugin-solid`, separate config, shared `public/` |
| Design layer | `index.css`, themes, palettes, Japanese dictionary — shared, unchanged |
| Bootstrap | `main.jsx` applies theme/font/motion before first paint, same order as React |
| Motion | framer springs → the app's own `lib/physics` (see `solid/lib/motion.js`) |
| Routing | `@solidjs/router`, code-split routes |
| Data layer | `@tanstack/solid-query`, cache policy copied exactly |
| Auth | `AuthContext` incl. silent cookie probe + offline recovery |
| Toast | Signal + portal (replaces the Radix toaster) |
| Perf core | Shared IntersectionObserver, `content-visibility`, scroll-state class |
| Field metrics | LoAF/INP/CLS monitor, opt-in via `?perf=1` |
| Pages | Splash, Home, History, Archive/Announcements/News, Feedback |
| Auth | Login + AuthLayout + GoogleIcon; `/register`, `/forgot-password`, `/reset-password` redirect to `/login` as in React |
| 404 | `solid/pages/NotFound.jsx` on `path="*"` (React keeps it at `src/lib/PageNotFound.jsx`) |
| Japanese | `JapaneseUiCompanion` auto-scanner + `CjkFontLoader`, mounted in the shell and verified annotating the DOM |
| Assistant | `MabisAIAssistant` (+ `IdleMount`), mounted in Home and meeting mode; parity opens the panel and asserts the empty state, suggestions and composer |
| Home chrome | Avatar + role ring, first name and SIGN OUT in the header (Solid had none of it), plus `ProfileEditor`, `FeedbackWidget` and `JobReminder` — Home's `IdleMount` block now matches React's three children |
| App shell | `MotionPreference`, `PrefsSync`, `ScrollToTop`, `SoundEffects`, `PrideAmbience`, `PageTransition`, and `chrome.jsx` (`GrainOverlay`, `PaletteStripe`, `ScrollProgress`, `ScrollSectionIndicator`) |
| Auth errors | `Protected` now branches on `authError()`, so an unregistered account gets `UserNotRegisteredError` instead of a silent bounce to login |
| Home interludes | `ScrollVelocity`, `ScrollScaleRitual`, `BirthdayBanner`, `QuickStartGuide` (hover-warmed), and the `PageFooter` Solid was missing |
| Loading | `LoadingScreen` replaces the blank route fallback, and is deliberately **not** lazy — it is what shows while chunks load |
| Notes | `MeetingNotesEditor` + `notes/{BlockNotesEditor,NoteBlock,BlockToolbar}`, wired into meeting mode. `block_html.js` is **shared** with React, not forked — it is a zero-import leaf, so there is nothing for vite-plugin-solid to mis-compile and the storage format cannot drift |
| Widgets | LunchMenu, Schedule |
| UI primitives | Button, Input, Textarea, Badge, spinner, empty state, Select |
| Kobalte primitives | Dialog, Tabs, Popover, DropdownMenu — ported 2026-08-15, verified against `vite.solid.config.js` |
| Dead code removal | `Dashboard/Meetings/Topics/JobWheel/Register/ForgotPassword/Team/ResetPassword` pages deleted from `src/pages/`, along with the components only they used (`topics/TopicCard`, `meetings/MeetingCalendar`, `jobs/JobCard`, `wheel/SpinWheel`). React build verified green after removal. |

## Remaining

Every route now renders, so what is left is shell polish and the long tail of
feature components — not structural work.

**1. Nothing reachable is missing.** Walking the import graph from
`src/App.jsx` reaches 81 component/page modules (12,211 lines). All of them now
have a Solid counterpart except `src/components/ui/use-toast.jsx`, the Radix
toast hook — replaced wholesale by `solid/lib/toast.jsx` (a signal plus a
portal), so it is not a gap.

**2. Fourteen React files are dead code.** Nothing imports them, in either
build, so they were deliberately not ported: `OAuthConsent` (239),
`FamicomController` (145), `layout/AppLayout` (120), `HistoryWidget` (114),
`MeetingSummary` (81), `SectionReveal` (66), `Tilt3D` (57), `RevealText` (46),
`HighlightPicker` (39), `KineticHeading` (26), `shared/MemberAvatar` (23),
`shared/XpBadge` (16), `SmoothScroll` (10), `DoveAnimation` (6). Deleting them
from `src/` is a separate cleanup — verify with a fresh reachability walk first,
since `OAuthConsent` in particular looks like a real page.

**⚠ Open product question — `JobReminder` never fires for configurable jobs.**
The component carries its own private `scheduledDaysFor`, which disagrees with
the shared one in `@/lib/jobsRotation`:

| | `schedule_days` respected | title with no (1)/(2) |
|---|---|---|
| `@/lib/jobsRotation` | yes | all five weekdays |
| `JobReminder`'s copy | **no** | **`[]`** |

`pending` filters on `sched.length > 0`, so any job with a custom schedule or a
plain name is silently skipped and its owner is never reminded. The Solid port
preserves this byte-for-byte on purpose: switching to the shared helper would
start showing the modal to people who have never seen it, which is a product
call rather than a porting one. **If it is fixed, fix both builds together** —
note `npm run check:jobs` already enforces configurable periods elsewhere, so
the two are genuinely inconsistent today.

**4. Do not judge a port by line count.** Two claims in earlier revisions of
this document were both wrong, in the same way:

- `DiscussionWidget` "40%" — actually 95%. The figure compared the Solid file
  against the React file *plus* its sub-components.
- `DocsEditor` "47%" — actually complete. Audited control-by-control: every
  toolbar button, dropdown and menu item in the React source is present
  (undo/redo, format painter, font, size stepper, B/I/U/S, theme ink, theme
  highlight, super/subscript, three list kinds, indent, quote, code block,
  link, image, clear formatting, find, zoom, the Document-formatting menu with
  headings/align/line-spacing, and the File menu). The 728-line difference is
  120 lines extracted to `solid/lib/quill-setup.js` plus the react-quill
  wrapper and `useState`/`useCallback` boilerplate that Solid does not need.

Solid files are usually *longer* than their React counterparts here, so a
noticeably shorter one is worth auditing — but audit the feature surface, not
`wc -l`.

## Progress

Measured over the React component/page modules reachable from `src/App.jsx`
(`src/lib/**` excluded because both builds share it):

| Measure | Done |
|---|---|
| Routes rendering | 7 / 7 |
| Source volume | 98.7% (100% excluding the replaced toast hook) |
| Module count | 80 / 81 |
| Solid modules | 83 |

The feature port is complete. What remains is not porting work:

1. **Audit the widgets nobody has driven yet.** Parity exercises Splash, Login,
   404 and Home (including the assistant, feedback, profile and help dialogs).
   The ten Home widgets render, but their *interactions* — spinning the job
   wheel, editing a topic, adding a calendar event — are only covered by the
   compile check.
2. **`visualEditAgent`** (see Known gaps) — still the blocker on actually
   swapping `dist-solid/` in.
3. **The `JobReminder` product question** below.
4. Optional: delete the fourteen dead React files.

Kobalte primitives are done (Select, Dialog, Tabs, Popover, DropdownMenu). Note
the Radix→Kobalte data-attribute swap: `data-[state=open|closed]` becomes
`data-[expanded]` / `data-[closed]`, or `data-[selected]` for the active Tabs
trigger. Popover's Content takes `gutter`, not `sideOffset`.

## Rules learned porting (read before continuing)

- **Never destructure props.** They are getters; destructuring snapshots them
  once and silently kills reactivity. Use `splitProps`.
- **Query/mutation options must be a function** — `useQuery(() => ({...}))`.
  A plain object captures its first value forever.
- **`children` cannot be rendered twice.** Solid JSX makes real DOM nodes, so a
  second render *moves* them. Take a function child (see `Marquee`).
- **Prefer `<Index>` to `<For>`** when a list never reorders — `<For>` carries
  keyed reconciliation that is pure overhead there.
- **Use a store, not a signal holding an object**, for multi-field forms, so a
  keystroke updates one input instead of all of them.
- **Do not write signals per frame.** Hot paths write `style.transform`
  directly in the scheduler's render phase.
- **Only set inline `transform` if you animate one** — it overrides Tailwind
  transform utilities, which is how the centred hero word broke.
- **Never import `@/lib/routeLoaders` from Solid.** It dynamic-imports the
  React pages, so pulling it in drags React source into the Solid module graph
  where vite-plugin-solid compiles it with the Solid JSX transform — it builds
  clean and is nonsense at runtime. It inflated the bundle 281 → 686 KiB gzip
  before the compiler's malformed-HTML warning gave it away. Use
  `~/lib/routes.js` instead.
- **Icons come from `lucide-solid`, not `lucide-react`.** There is no
  `~/components/icons` barrel — an earlier session invented one, and because
  the only file importing it (`AuthLayout`) was an orphan at the time, Vite
  tree-shook it away and the build stayed green while the file was broken.
  `npm run check:solid` exists precisely to catch this class of failure; run it,
  not just the build.
- **A green build does not mean a working port.** Orphan files are excluded
  from it entirely, and a component that compiles can still throw on mount.
  `verify:solid` is the real gate.
- **`useEffect(fn, [dep])` → `createEffect` with `onCleanup` *inside* it.**
  Registering cleanup inside the effect body gives React's exact teardown
  semantics: it runs before each re-run and once on disposal. See
  `JapaneseUiCompanion`.
- **Solid setters are synchronous — re-read state with care.** React code often
  calls `setMessages(prev => [...prev, msg])` and then reads `messages` in the
  same function, still getting the *pre-update* array because setState is
  deferred. In Solid that read returns the updated array. `MabisAIAssistant`
  captures `priorHistory` before appending; without that it would send the
  user's own message as prior chat history and duplicate it against `prompt`.
- **Never bind `innerHTML` on a contentEditable.** Solid would rewrite the DOM
  under the caret on every keystroke. Write the content imperatively once, in
  an effect gated on "became editable" — see `NoteBlock`.
- **`on([deps], fn)` is React's dependency array.** Reads inside `fn` are not
  tracked, which is how `NoteBlock` re-focuses on `editing`/`type` changes
  without also re-running whenever `block.html` changes. React needed an
  `eslint-disable` to express the same thing.
- **`<Show when={x} keyed>` reproduces React's `key={x}` remount.** Needed
  wherever a child snapshots a prop at creation — `BlockNotesEditor` parses
  `initialHtml` once, so changing week must build a fresh one.
- **Dead code does not get a free ride across.** React's `ProfileEditor`
  declares `AVATAR_COLORS`, `profileColor` and `handleColorSave`, none of which
  its JSX references — an abandoned colour picker no user can reach. The port
  leaves it out. Check whether a symbol is actually rendered before
  transcribing it.
- **CSS `animation-fill-mode` is a correctness concern, not a detail.** A
  finished animation with `both`/`forwards` leaves the element holding its
  animated `transform`, and any non-`none` transform makes that element the
  containing block for its `position: fixed` descendants. React hit exactly
  this with framer and had to null the inline transform in
  `onAnimationComplete`. `page-content-lift` uses `backwards` so it covers the
  delay and then leaves no transform at all.
- **There is no framer, so there is no `MotionConfig`.** The whole port
  animates via CSS, and `solid-motion.css` switches every keyframe and
  transition off under `html.animations-disabled`. `MotionPreference` just
  writes that class — the preference is enforced one layer lower than in React.
- **Clear your own timers.** React tolerates `setState` after unmount as a
  no-op; a Solid signal write after disposal is a real leak. `Login` tracks its
  15s retry timer and clears it in `onCleanup`.
- **Watch for "The HTML provided is malformed" at build time.** It is Solid's
  template compiler telling you the JSX cannot nest that way; it is never
  cosmetic. In practice it has meant a component tree was being parsed that
  should not have been.

## Known visual differences

- **Nav active indicator.** framer's `layoutId="nav-active"` slides a shared
  element between nav items; Motion One has no layout animation, so the Solid
  header shows a static bar on the active item instead. Only known motion
  difference in the port.

## Known gaps

- `visualEditAgent` in `@base44/vite-plugin` instruments React JSX and is
  deliberately absent from the Solid config. Base44's visual editor will not
  work against `dist-solid/` — unresolved, and the reason the swap should not
  happen until parity is reached.
- `font-display: block` (chosen to stop the font flash) is scored lower than
  `swap` by Lighthouse's font-display audit. Deliberate trade-off.
- The theme catalogue (~71 KB of source) is in the boot chunk while only one
  theme is applied at startup. Splitting it behind the theme switcher is the
  largest remaining first-load win, and applies to both builds.
