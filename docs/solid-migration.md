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
| Loading | `LoadingScreen` replaces the blank route fallback, and is deliberately **not** lazy — it is what shows while chunks load. Three follow-up fixes, 2026-08-16: (1) `main.jsx` now calls `preloadRoute(window.location.pathname)` as the first thing in `bootstrap()`, unawaited, so the current route's chunk races the auth check instead of starting after it — closes the "loading screen splashes a couple of times" bug, most visible landing on `/home` fresh after the Google OAuth redirect, where the outer `<Suspense>` used to remount `LoadingScreen` a second time before `PageTransition`'s own curtain played on top. (2) The counter's own animation only moved when a *new* target arrived; `home-warmup.js`'s 21 concurrent tasks land unevenly (`14 + round((11/21)*80) = 56` exactly, hence "stuck at 56"), so gaps between real updates read as frozen. Replaced the per-target effect with one persistent frame loop that trickles the display forward (capped +9, never past 97) once a target has held for 260ms, snapping straight to the next real value the moment it arrives — never claims 100 except on a real completion event. (3) `routes.js`'s Home-route `budget` (the backstop that lets the route resolve before warm-up finishes, so a slow endpoint can't strand anyone) dropped 1500ms → 900ms — `isConstrainedNetwork()` already gives slow-2g/2g connections a lighter warm-up, so this only bounds the tail case it doesn't catch (normal `effectiveType`, high latency). List limits in `home-warmup.js` (`.list(..., 500)` etc.) were deliberately left alone — they're matched pairs with each widget's own query, so trimming is a data-correctness call, not a safe perf one. |
| Notes | `MeetingNotesEditor` + `notes/{BlockNotesEditor,NoteBlock,BlockToolbar}`, wired into meeting mode. `block_html.js` is **shared** with React, not forked — it is a zero-import leaf, so there is nothing for vite-plugin-solid to mis-compile and the storage format cannot drift |
| Widgets | LunchMenu, Schedule |
| UI primitives | Button, Input, Textarea, Badge, spinner, empty state, Select |
| Kobalte primitives | Dialog, Tabs, Popover, DropdownMenu — ported 2026-08-15, verified against `vite.solid.config.js` |
| Dead code removal | `Dashboard/Meetings/Topics/JobWheel/Register/ForgotPassword/Team/ResetPassword` pages deleted from `src/pages/`, along with the components only they used (`topics/TopicCard`, `meetings/MeetingCalendar`, `jobs/JobCard`, `wheel/SpinWheel`). React build verified green after removal. |
| Jobs | `JobsWidget.jsx` + `jobs/{SpinWheel,tables}.jsx` — audited 2026-08-16 against the React source. Two real gaps found and fixed: `SpinWheel` never redrew when `members` changed outside a spin (unchecking someone in Manage Students, or "Remove from wheel", left the canvas stale — React got this for free from `useCallback`'s dependency array; Solid needed an explicit `createEffect`), and the Add Job name input had lost `autoFocus`. Wired into `DiscussionWidget`'s two remaining `PendingWidget` slots (meeting mode + normal-mode compact table) — `Home.jsx` already had it as the "04" section widget directly. Both `npm run build` and the Solid build verified green after each change. |

## Remaining

The feature port is complete — see Progress below. This section records what is
deliberately absent and what is still open.

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

The feature port is complete, and `dist-solid/` is production-equivalent to
`dist/` (same injections, same structured data, same manifest).

Parity covers 218 assertions across six route/mode combinations, including all
ten Home sections rendering with their empty states and the Discussion composer
opening. What is left:

1. **Deeper widget interaction coverage.** All ten widgets render and reach
   their empty states, and Discussion's composer is driven. Their heavier
   flows — spinning the job wheel, saving a topic, adding a calendar event —
   still are not exercised, mostly because the harness has no backend to write
   to. Doing this properly means a stub Base44 client, not more DOM poking.
2. **The `JobReminder` product question** below — needs a decision, not code.
3. Optional: delete the fourteen dead React files.

`visualEditAgent` is **no longer** on this list — see Known gaps for why it was
never the blocker it was recorded as.

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

### `visualEditAgent` — earlier note was wrong, here is what it actually does

Previous revisions said "the visual editor will not work against `dist-solid/`"
and treated it as the blocker on swapping over. That was wrong about the
mechanism. Reading `@base44/vite-plugin` source:

- **The visual-edit machinery is dev-only.** `visualEditPlugin` is gated on
  `apply: config => config.mode === "development"`, is only added at all when
  `MODAL_SANDBOX_ID` is set, and the agent `<script>` is injected only when
  `currentMode === "dev"` *and* the page is in an iframe. **A production build
  never contains any of it**, so `dist-solid/` was never affected. Deploying
  the Solid build does not change anything about the editor's runtime output.
- **What the plugin does in production is inject `analyticsTracker`** — and the
  Solid config was omitting the plugin entirely, so `dist-solid/` silently
  shipped without the page-view tracking `dist/` has. That is now fixed (see
  `base44ForSolid` in `vite.solid.config.js`) and asserted by parity.
- **The genuine incompatibility is narrow**, and it is not about React at all.
  `visualEditPlugin` transforms JSX generically — it walks the AST with Babel
  and stamps source locations onto opening elements, which Solid's compiler
  would carry through fine. What breaks is `extractFilename()`: it derives the
  path with `parts.lastIndexOf("src")`. These files live under `solid/`, so
  every one would report a bare `"Home.jsx"` instead of `solid/pages/Home.jsx`,
  and the editor could not map an edit back to a file. Fixing it means teaching
  the plugin about a second source root — an upstream change, not a port task.

**So: `visualEditAgent` stays off, and the swap is not blocked on it.** What is
lost is the ability to visually edit *Solid* files from the Base44 UI while
running the Solid dev server. The React app remains fully editable.

### Other

- Adding `@base44/vite-plugin` to the Solid config requires stripping its
  `resolve.alias = { "@/": "/src/" }` contribution. That path is
  filesystem-root-relative and Vite gives it precedence over the config's own
  `@` alias, so every `@/lib/*` import resolved to `/src/lib/*` and the build
  failed on `Could not load /src/index.css`. `base44ForSolid()` deletes that one
  key and keeps the rest.
- `font-display: block` (chosen to stop the font flash) is scored lower than
  `swap` by Lighthouse's font-display audit. Deliberate trade-off.
- The theme catalogue (~71 KB of source) is in the boot chunk while only one
  theme is applied at startup. Splitting it behind the theme switcher is the
  largest remaining first-load win, and applies to both builds.
