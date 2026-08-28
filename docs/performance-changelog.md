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

### Frame pacing on displays that are not 60 Hz

The animation architecture was already refresh-rate independent — a fixed
timestep with an accumulator in `src/lib/physics/scheduler.js`, analytically
integrated springs in `physics/math.js`, time-based easing in `SpinWheel`.
Nothing advances by frame count. That half was right.

The half that judged it was not. Both places that asked "is this frame late?"
answered against a hardcoded `1000 / 60`, which is wrong in **both** directions
at once:

| display | what it does | old verdict | correct verdict |
|---|---|---|---|
| 30 Hz, perfectly paced | 33.3 ms every frame | **demoted on sight** | keep effects |
| 144 Hz stuttering at ~70 Hz | 6.9 / 13.9 ms alternating | **healthy** | demote |
| 240 Hz stuttering to a third | 4.2 / 16.7 ms | **healthy** | demote |

The first row cost a steady low-refresh machine its glass, cursor physics and
motion before it had drawn a second of content — the exact opposite of the
intent, since that device was keeping perfect time. The other two are the
false-negative half: every frame in them is under the old 25 ms "slow frame"
threshold, so a user watching an obvious stutter got a monitor reporting 0%
dropped frames.

The decision window was refresh-coupled too. It counted 90 frames, which is
1.50 s of evidence at 60 Hz but 0.38 s at 240 Hz and 0.25 s at 360 Hz — the
faster the display, the less the verdict rested on, and all of it sampled
during mount, the most contended moment of the page's life.

**`src/lib/physics/refresh-rate.js`** now measures the panel instead of assuming
it, taking a low percentile of recent rAF deltas. A low percentile rather than
a mean or median because the error is one-sided: the compositor cannot present
frames closer together than the panel refreshes but can present them further
apart whenever one is missed, so the bottom of the distribution is the refresh
interval and the entire tail is the jank. Averaging would drag the "budget"
upward in proportion to how badly the page was running, and the metric would
excuse exactly the stutter it exists to catch.

It owns no loop. The physics scheduler already runs a rAF callback whenever
anything is moving, so it feeds the estimator for free; feeding is one compare
and one array store, no allocation.

`monitorFrameBudget` now counts frames that missed a whole vsync **for this
display**, over a 2 s wall-clock window after an 800 ms warm-up. Stable-but-slow
keeps its effects, unstable loses them — the right priority, because consistent
pacing is what makes motion feel smooth, not the size of the frame rate.
`perf-monitor` prices dropped frames the same way and now reports p50/p95/p99
and jitter, plus p99 expressed in refreshes, which is the only form of the
number that means the same thing on a 60 Hz laptop and a 360 Hz monitor.

Stated rather than hidden: a device pinned at *exactly* half its panel rate
forever is indistinguishable by frame spacing from a genuine half-rate panel.
Real struggling devices mix intervals and the low percentile finds the fast
ones. In the pinned case the delivery is at least perfectly even, so treating
it as slow-but-steady is the right failure mode.

Cost: **+0.1 KiB gzip** on the eager bundle (17.0 → 17.1 KiB).

- `check:pacing` (`check-frame-pacing.mjs`) — 40 assertions against synthetic
  displays from 30 Hz to 1000 Hz, driven by an injected clock so they hold in a
  sandbox with no display. Verified to fail on the pre-change logic for all
  three rows of the table above. 480 and 1000 Hz are in there deliberately: no
  panel needs them today, and the point is that no ceiling is written into the
  estimator. The source is pinned as well as the behaviour, because a
  behavioural test alone would still pass if someone reintroduced a 60 Hz
  constant beside the measurement.

### Boss-layout CSS off the critical path

Bottleneck 2 below said both Home layouts' stylesheets ship eagerly. True, and
now measured: `npm run measure:css` (`measure-css-coverage.mjs`) boots the real
built bundle in jsdom on the parity harness, reads the classes that actually
reach the DOM, and sorts every rule in the built sheet into needed / themed /
deferrable / eager / orphan. At `/home` on the default layout:

| bucket | raw | rules | |
|---|---:|---:|---|
| NEEDED | 54.9 KiB | 658 | matches the rendered DOM, or is structural |
| THEMED | 19.3 KiB | 98 | `.theme-*`, critical for whoever picked that theme |
| **LAZY** | **56.0 KiB** | **833** | only reachable from chunks first paint never loads |
| EAGER | 27.2 KiB | 230 | unmatched, but its chunk is already loaded |
| ORPHAN | 11.0 KiB | 127 | in no chunk — dead, or composed at runtime |

Attributing the deferrable bucket to the chunk that would carry it put
`boss-*.js` far in front at 14.4 KiB. The dependency chain is clean:
`Glass.jsx` is imported only by `SiteHeader.jsx`, which is imported only by
`boss.jsx`, which has been a lazy chunk since the port. The default layout
touches none of it — and `glass.css` was still linked from the entry HTML,
blocking first paint for every visitor with 16.5 KiB of source that could not
match one element on their page.

Moved the import into `Glass.jsx`, so it travels with the chunk that renders
the markup. Vite's preload helper waits for a chunk stylesheet's load event
before resolving the dynamic import, so the boss layout still paints fully
styled on its first frame — no flash, by construction.

| | before | after | change |
|---|---|---|---|
| Render-blocking CSS, raw | 175.4 KiB | 167.3 KiB | **−8.1 KiB** |
| Render-blocking CSS, gzip | 30.5 KiB | 28.9 KiB | **−1.6 KiB (−5%)** |
| Wire bytes before first paint | 105.4 KiB | 103.8 KiB | **−1.6 KiB** |

Smaller than the 14.4 KiB attribution, and the gap is worth stating: most of
that figure is Tailwind utilities used by boss markup, and Tailwind v4 emits
one utility layer for the whole app regardless of which file imports what. Only
the hand-written 8.3 KiB actually moved. Per-chunk utility generation is not
something Tailwind does, so the rest of that bucket is not addressable this way.

**A harness gap had to be closed first.** Adding CSS to the boss chunk made its
dynamic import hang in jsdom — `__vitePreload` awaits the stylesheet's load
event and jsdom never fires it, the same limitation already documented for
Quill. The boss parity run fell from 71/71 to 39/62: an entire layout became
unverifiable through a harness artefact rather than any real fault. Trading
2 KiB for 62 assertions would have been a bad deal, so `check-solid-parity.mjs`
now fires a synthetic load on chunk stylesheets (Quill still excluded, since
resolving that one makes the run never settle). Boss is back to 71/71, and any
future lazy component with its own stylesheet is now verifiable too.

- `check:csssplit` (`check-css-split.mjs`) — asserts the glass component's own
  rules are absent from the render-blocking sheet and present in a chunk sheet,
  both halves, plus the import's location in source. It tests the LEFTMOST
  compound selector rather than any mention of `.lg-`: index.css legitimately
  keeps ~1.1 KiB of cross-cutting overrides that reach into glass from the
  theme, the performance tier and the scroll state, and one of those also
  targets `.mabis-widget`, which the default layout uses. The first draft of
  this guard failed on exactly that and was wrong to.

`editorial-home.css` is the same shape of win — 8.9 KiB, every rule gated on
`html.home-layout-boss` — and was **not** moved. `check-design-contract.mjs`
requires the app entry to import it, and that guard's own failure message says
it may only change at Novesce's explicit request.

### Remaining bottlenecks, ranked by measured cost

1. **axios, 43.7 KiB raw, eager.** The single largest dependency left on the
   boot path, inside `@base44/sdk`, which uses it for every HTTP call. In a
   modern browser it is a large wrapper around `fetch`, and it ships both the
   XHR and fetch adapters. Removing it means patching the SDK's
   `utils/axios-client.js`, whose interceptor and error-shape behaviour the SDK
   depends on — a much riskier alias than the socket shims. Not attempted.
2. **Render-blocking CSS, 167.3 KiB raw / 28.9 KiB gzip.** Still the largest
   text asset on the critical path, now measured rather than guessed — see the
   coverage table above. The glass half of the layout split is done.

   One claim in the original version of this entry was **wrong**: the file does
   not carry "140 themes' worth of palette rules". Themes are applied by
   `themes.js` writing custom properties onto the root element at runtime, so
   only four themes have bespoke CSS at all, and all `.theme-*` rules together
   are 19.3 KiB raw. There is no 140-theme palette block to split out.

   What is left is the 27.2 KiB EAGER bucket (unmatched at first paint but
   owned by chunks already loaded) and the long tail of component sections in
   `index.css` — the docs toolbar, the spin wheel, start-meeting, the settings
   panel. Each would have to move to the component that owns it, the way glass
   just did. None is individually large; together they are the remaining win.
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

### Paid for, not saved: the Aqua treatment on the glass

A visual change, logged here because it *adds* paint work, and the rule of this
document is that additions get accounted for too.

Per glass surface it adds one static `linear-gradient` to `.liquidGlass-shine`,
two inset edge lines, and four zero-blur outer hairlines on `.lg-surface`.

What it does **not** add is the expensive kind of work: no filter, no blur pass,
no backdrop sample, nothing that reads the page behind the pane. The two new
inset lines have a 2px blur radius against the 56px one already in that rule, so
they are small next to what the shine costs today. The hairlines have no blur
and no spread at all — four hard 1px lines.

The honest cost is on pointer move. `.liquidGlass-shine` already repaints on
every pointer move because its radial hotspot is pointer-driven, and the new
lozenge sits in that same background stack, so it repaints along with it.
Hoisting the static half onto its own pseudo-element was considered and
rejected: same layer, same damage rect, so it would repaint anyway and only add
an element.

Not measured as frame time — this sandbox has no paint profiler, and quoting a
number that was never taken would be worse than saying so.

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
