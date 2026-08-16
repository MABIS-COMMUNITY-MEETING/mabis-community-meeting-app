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
| `check:solid:parity` | components that compile but throw, drop content, or render wrong, asserted against the React source |

Parity runs one route per process (`/`, `/login`, `/nowhere`, plus `/` and
`/login` with the Japanese preference on). The bundle is a singleton, so a
second route in the same process would assert against the first route's DOM.

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
| Widgets | LunchMenu, Schedule |
| UI primitives | Button, Input, Textarea, Badge, spinner, empty state, Select |
| Kobalte primitives | Dialog, Tabs, Popover, DropdownMenu — ported 2026-08-15, verified against `vite.solid.config.js` |
| Dead code removal | `Dashboard/Meetings/Topics/JobWheel/Register/ForgotPassword/Team/ResetPassword` pages deleted from `src/pages/`, along with the components only they used (`topics/TopicCard`, `meetings/MeetingCalendar`, `jobs/JobCard`, `wheel/SpinWheel`). React build verified green after removal. |

## Remaining

Every route now renders, so what is left is shell polish and the long tail of
feature components — not structural work.

**1. App-shell components React mounts and Solid does not.** This list is
exact: it is the diff between the two `App.jsx` trees.

| Component | Effect of its absence |
|---|---|
| `MotionPreference` | reduced-motion preference not applied app-wide |
| `PrefsSync` | preferences not synced back to the account |
| `ScrollToTop` | scroll position persists across navigation |
| `SoundEffects` | UI sounds silent |
| `GrainOverlay`, `PaletteStripe`, `PrideAmbience` | decorative layers missing |
| `ScrollProgress` | no scroll progress indicator |
| `LoadingScreen` | Suspense falls back to a blank height-reserving div |
| `UserNotRegisteredError` | see below |

**2. Auth error states.** React's `AuthenticatedApp` branches on
`authError.type`: `user_not_registered` renders `UserNotRegisteredError`, and
`auth_required` calls `navigateToLogin()`. Solid's `Protected` only checks
`isAuthenticated()`, so an unregistered Google account currently falls through
to the login redirect instead of the explanatory screen. Port this with the
shell.

**3. Feature components not yet ported** (verified absent from `solid/`):
`ProfileEditor`, `BlockNotesEditor` + `BlockToolbar` + `NoteBlock`,
`HistoryWidget`, `QuickStartGuide`, `BirthdayBanner`, `JobReminder`,
`MeetingSummary`, `RoleSwitcher`, `RolePreviewToggle`, `HighlightPicker`,
`FamicomController`, `DoveAnimation`, `MemberAvatar`, `XpBadge`,
`FeedbackWidget`, `SmoothScroll`, `Tilt3D`, `SectionReveal`, `IdleMount`.

**4. `DocsEditor` is a partial port** — 669 Solid lines against 1397 React
lines (~47%). It is the one widget with a real shortfall, and the reason is
known: `react-quill` has no Solid equivalent, so it is a rewrite against Quill
core rather than a transcription. Audit it against the React source before
treating it as done.

Every other ported widget is at or above its React line count (Solid runs
slightly longer — `Show`/`For` are more verbose than `&&` and `.map`).
`DiscussionWidget` is at 95%, not the 40% an earlier revision of this document
claimed; that figure compared the Solid file against the React file *plus* its
sub-components, and was wrong.

## Progress

Measured over the React component/page modules reachable from `src/App.jsx`
(12,211 lines; `src/lib/**` is excluded because both builds share it):

| Measure | Done |
|---|---|
| Routes rendering | 7 / 7 |
| Source volume | ~81% |
| Source volume, counting `DocsEditor`'s shortfall | ~75% |
| Module count | 51 / 81 |

Module count trails source volume because what remains is a long tail of small
files — the median unported component is under 50 lines. The two largest are
`MabisAIAssistant` (324) and `FeedbackWidget` (171).

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
