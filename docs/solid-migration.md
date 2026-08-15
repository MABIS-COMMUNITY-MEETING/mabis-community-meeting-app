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
npx vite build                                  # React, must stay green
npx vite build --config vite.solid.config.js    # Solid
node scripts/check-bundle-budget.mjs            # React budgets
node scripts/check-solid-parity.mjs             # Solid renders at parity
```

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
| Pages | Splash (23/23 parity), Home shell |
| Widgets | LunchMenu, Schedule |
| UI primitives | Button, Input, Textarea, Badge, spinner, empty state |

## Remaining

**94 files / ~13,500 lines**, but a meaningful share is dead code — these pages
are not routed in `src/App.jsx` and emit no chunks, so they should be **deleted,
not ported**:

```
Dashboard  Meetings  Topics  JobWheel  Register
ForgotPassword  Team  ResetPassword
```

Real remaining work, in dependency order:

1. **Kobalte primitives** — Dialog, Select, Tabs, Popover, DropdownMenu.
   30 files depend on these; everything else is blocked behind them.
2. **Widgets** — Announcements, Members, MissingItems, News, MeetingMode,
   Calendar (571), Jobs (1060), Discussion (1184).
3. **DocsEditor (1397)** — the largest single item. `react-quill` has no Solid
   port, so this is a rewrite against Quill core.
4. **Pages** — Login, History, AnnouncementsHistory, NewsHistory, Feedback.
5. **Chrome** — SiteHeader, SettingsModal, ThemeSwitcher, CustomCursor,
   MabisAIAssistant.

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
