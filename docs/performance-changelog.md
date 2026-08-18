# Performance changelog

Measured work on the critical path — everything the browser must fetch, parse
and run before the app paints. Numbers come from `npm run measure`
(`scripts/measure-critical-path.mjs`), which reads the eager set straight out of
`dist/index.html` and reports raw bytes, gzip bytes and real V8 parse+compile
time. Byte counts are deterministic; compile time is a median of seven runs on
a 1-vCPU sandbox and moves ±6%, so only differences above ~10% are meaningful.

No headless browser exists in the sandbox, so LCP, FCP, INP and CLS were **not**
measured. Everything below is the input to those metrics, not the metrics
themselves.

## 2026-08-17

### The state this started from

`dist/` on disk was stale output from an older Tailwind v3 build. Rebuilding
from the then-current source produced a **visually broken app**, which is what
the first three fixes below address. The performance baseline was therefore
taken twice: JS numbers are comparable throughout, CSS numbers are not, because
the "before" stylesheet was missing most of itself.

| | before | after | change |
|---|---|---|---|
| Eager JS, raw | 273.9 KiB | 208.1 KiB | **−65.8 KiB (−24%)** |
| Eager JS, gzip | 97.0 KiB | 74.5 KiB | **−22.5 KiB (−23%)** |
| Eager JS, V8 parse+compile | ~7.5 ms | ~5.5 ms | **−27%** |
| Preloaded fonts | 294.3 KiB | 59.3 KiB | **−235.0 KiB (−80%)** |
| Render-blocking CSS, gzip | 15.4 KiB (broken) | 30.5 KiB (correct) | see below |
| **Wire bytes before first paint** | **421.8 KiB** | **164.3 KiB** | **−61%** |

The wire-byte row compares like with like: it prices the "before" CSS at its
correct size (30.5 KiB gzip), not at the 15.4 KiB the broken build produced.
Charging the app for a stylesheet it could not render with would have flattered
the result by 15 KiB.

### Correctness fixes (found while measuring, not performance work)

**The Tailwind utility layer was not being generated at all.**
`@import "tailwindcss"` had drifted 267 lines down `src/index.css`, below the
`@font-face` block. A CSS `@import` is only honoured when it precedes every rule
other than `@charset` and `@layer`, so it was discarded: the shipped stylesheet
contained no `.flex`, no `.grid`, no `.p-4`, no `.bg-card`. Elements styled by
utility classes rendered with no background, no spacing and no layout. The build
exited 0 and the bundle-budget check passed, because a stylesheet that lost half
its content looks like a win. Moved to the top of the file: 85 KiB → 179 KiB,
729 rules → 2191.

**`tailwind.config.js` was CommonJS in an ESM package.** `package.json` declares
`"type": "module"`, so `module.exports` and `require()` threw
"require is not defined in ES module scope" whenever Tailwind's `@config`
resolved it. Every custom token — `bg-card`, the role hues, the radius scale,
the `tailwindcss-animate` plugin — silently disappeared while the built-in
utilities stayed. Converted to `export default`.

**`check-performance-contract.mjs` was validating a dead file.** It read the
root `index.html`, a React leftover that still points at `/src/main.jsx`.
`vite.config.js` sets `root: solid/`, so `solid/index.html` is what actually
ships. Repointed.

### Optimisations

**socket.io and partysocket off the boot path** — −48.9 KiB raw, −15.3 KiB gzip.
`@base44/sdk` statically imports socket.io-client (via `utils/socket-utils.js`)
and partysocket (via `modules/actors.js`). `base44Client` is the first thing the
app loads, so the whole realtime stack — socket.io-client, engine.io-client and
both parsers — was parsed on every visit. Nothing on the boot path uses it: the
SDK builds the socket lazily and the only subscriber is `useActivePresence()`
inside the lazy `MembersWidget` chunk. partysocket backs the Actors API, which
this app never calls. Both bare specifiers are now aliased to lazy shims
(`src/lib/lazy-socket-io.js`, `src/lib/lazy-partysocket.js`) that hand back a
connection-shaped object immediately and fetch the real library behind it. The
SDK is unmodified. `base44Client` fell from 117.4 KiB to 69.8 KiB raw and its
compile time from 3.94 ms to 2.14 ms.

**GNU FreeMono subsetted for first paint** — −235.0 KiB.
The two preloaded weights are `font-display: block`, so nothing painted until
287 KiB of font arrived — more than three times the entire gzipped JS and CSS.
GNU FreeMono is pan-Unicode: 4160 codepoints spanning Greek, Cyrillic, Hebrew,
Arabic, Armenian, Georgian and 955 technical symbols. The shipped UI uses 30
non-CJK codepoints outside Latin-1. `scripts/build-font-subsets.py` splits each
face into a first-paint subset and a remainder, declared on non-overlapping
`unicode-range` descriptors, so a browser fetches 58 KiB for an all-Latin page
and the remainder only when a character it alone covers is actually on screen.
No glyph is lost and no text falls back to a different typeface.

The subset ranges were chosen from the **built** bundle, not the source: the
source is full of Greek, box-drawing and math characters that live only in
comments and never ship. Including those blocks measured at +5.7 KiB, +3.4 KiB
and +13.9 KiB on FreeMono alone, for glyphs nothing renders.

**The Japanese companion dictionary loads on demand** — −10.2 KiB raw.
`JapaneseUiCompanion` mounts in the app shell on every page and statically
imported a several-hundred-entry translation table. The companion is off by
default, so that was 10 KiB parsed and a large object allocated to annotate
nothing. Now fetched on the first flip to enabled.

**The field performance monitor loads only when asked for** — −3.6 KiB raw.
`startPerfMonitor()` returns immediately unless `?perf=1` is set, so importing
it looked free — but the import is not the call, and the whole module compiled
into the boot chunk on every visit. The flag is now read in `main.jsx` and the
module dynamically imported only when it will run.

### Guards added

These exist because every bug above was silent — the build stayed green while
the app was wrong.

- `check:css` (`check-tailwind-layer.mjs`) — fails if the built stylesheet is
  missing core or themed utilities, or falls below a 120 KiB floor. Checks the
  output, so any future way of losing the layer is caught, not just the two
  found here.
- `check:fonts` (`check-font-subset.mjs`) — fails if a codepoint in the built
  bundle falls outside the preloaded subset while being covered by the
  remainder, which would put a 170 KiB font fetch back on the critical path.
  Also asserts the CSS ranges still match what the subsetter produced.
- `check:realtime` (`check-lazy-realtime.mjs`) — 23 assertions on the lazy
  shims: that work queued before the library lands is replayed in order, and
  that a disconnect issued during the download latches.
- `npm run measure` — the harness the numbers above come from.

`check-solid-parity.mjs`'s radius assertion was also updated. It required the
literal `var(--radius)`, but the `@theme` workaround for Tailwind v4's radius
baking adds one hop (`var(--radius-lg)`, defined as `var(--radius)`). It now
accepts the indirection and verifies it resolves, while still failing on a baked
px value — the regression it was written for.

### Remaining bottlenecks, ranked by measured cost

1. **axios, 43.7 KiB raw, eager.** The single largest dependency left on the
   boot path, inside `@base44/sdk`, which uses it for every HTTP call. In a
   modern browser it is a large wrapper around `fetch`, and it ships both the
   XHR and fetch adapters. Removing it means patching the SDK's
   `utils/axios-client.js`, whose interceptor and error-shape behaviour the SDK
   depends on — a much riskier alias than the socket shims. Not attempted.
2. **Render-blocking CSS, 175.4 KiB raw / 30.5 KiB gzip.** Now the largest text
   asset on the critical path. Both Home layouts' stylesheets ship eagerly
   although only one is active at a time, and the file carries 140 themes'
   worth of palette rules. Splitting the inactive layout and the non-default
   themes into a deferred sheet is the obvious next move; it was not attempted
   because the layout preference is read before first paint and getting this
   wrong causes a flash of unstyled content.
3. **@tanstack/query-core, 34.6 KiB raw, eager.** `QueryClientProvider` sits at
   the app root, so it loads even on `/` and `/login`, which run no queries.
   Deferring it would help only those two routes and complicates the shell;
   worth doing only if the split of landings across routes says otherwise.
4. **`dist/` ships 37 MB of fonts**, mostly `.ttf` duplicates of faces that also
   exist as woff2, plus 15 MB of the optional by-womxn catalogue. Users only
   download what they select, so this costs deploy size and CDN storage rather
   than page weight — but the `.ttf` files listed in `src/index.css` as
   `format('truetype')` sources are 2-4× their woff2 equivalents for anyone who
   does pick those fonts.

### Rejected

- **Whole-Unicode-block font subsets.** Including the math, letterlike,
  currency, geometric-shapes and dingbat blocks "for safety" cost +50.6 KiB on
  FreeMono for characters the built bundle does not contain. Replaced with
  Latin-1, combining marks, punctuation, superscripts, arrows, and the four
  individual codepoints the bundle actually uses (`−`, `▼`, `☐`, `☑`).
- **Marking `@base44/sdk` side-effect-free to tree-shake partysocket.**
  `createClient` builds `client.actors` as a property of the returned object, so
  no bundler can prove it unused. Would not have worked.
- **Deleting the root `index.html`.** Dead — it points at a `/src/main.jsx` that
  no longer exists — but it is not mine to remove and nothing loads it. Flagged
  instead; the contract check no longer reads it.
