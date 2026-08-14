# Design & performance research — 2026-08-14

Recorded under the `AGENTS.md` requirement to research and record sources and
conclusions **before** implementation. Covers: Japanese editorial design, Apple
Liquid Glass, Frutiger Aero, and React/rendering performance.

Status: **research only — no implementation yet.**

---

## 1. Japanese editorial design

### 1.1 Typography metrics (authoritative)

The Digital Agency of Japan (デジタル庁) design system gives concrete numbers.
These are government-issued accessibility baselines, not blog opinion.

| Property | Value |
|---|---|
| Body text minimum | **16 px** (14 px only for footers/metadata; **below 14 px not permitted**) |
| Line-height, body (行間) | **150 % minimum**, 160–170 % preferred |
| Line-height, headings | 140 % |
| Line-height, dense tables | 120–130 % |
| Line-height, single-line UI | 100 % |
| Letter-spacing (字間), 14–18 px | **2 % (0.02em)** |
| Letter-spacing, 20–36 px | **1 % (0.01em)** |
| Letter-spacing, 45 px+ | **0** |

Note the deliberate inversion: **smaller Japanese text needs *more* tracking, not
less.** This is the opposite of Latin typographic instinct and is the single most
commonly botched detail in Western attempts at Japanese layout.

Our design contract pins GNU FreeMono as the default face and Maple Mono for CJK,
so we **do not** adopt Noto Sans JP. We adopt the *metrics*, which are
face-independent by design ("font sizes remain independent of typeface to ensure
information accessibility across rendering contexts").

### 1.2 余白 (whitespace) — the actual principle

Japanese sources are unanimous and specific: whitespace is not decoration, it is
**hierarchy expressed as distance**, and it must be *nested consistently*:

    outer margin  >  section gap  >  heading-to-body gap  >  inline gap

The failure mode called out repeatedly is **inconsistent gaps at the same
hierarchical level** — a table cell gap that differs from a button's inner
padding reads as sloppiness even when the user cannot articulate why. Practical
guidance from Japanese practitioners is to study print (magazines, posters) rather
than other websites.

字間 carries tone: **wider tracking reads calm/refined; tighter tracking reads
solid/serious.** This is a usable lever, not a fixed rule.

### 1.3 Grid

Standard grid discipline — every element aligned to an invisible lattice, with
gutters (カラム間の余白) doing the readability work. Nothing exotic; the
discipline is in the consistency, not the structure.

### 1.4 縦書き (vertical writing) — evaluated and **not recommended here**

`writing-mode: vertical-rl` is well supported, but the caveats are disqualifying
for this app:

- `text-align` semantics rotate — `right` means *down*. Breaks shared components.
- 縦中横 (`text-combine-upright: all`, for "2026年" reading correctly) has
  **uneven browser support** and needs per-browser verification.
- Scroll direction does **not** follow the writing mode automatically.

Verdict: vertical text is a legitimate Japanese editorial device, but applying it
to an app used by children on phones would cost usability for aesthetic credit.
It also collides directly with the "a 6th grader can use it" requirement.
**Recommend: skip, or confine to one decorative non-interactive heading.**

---

## 2. Apple Liquid Glass

### 2.1 How it actually works

Four conceptual layers. The key insight is that it is **not** a blur:

1. **Highlights layer** — behaves as a prism; specular highlights driven in real
   time by the device gyroscope/accelerometer.
2. **Material layer** — backdrop blur, translucency, tint, glow.
3. **Refraction** — a **2D displacement map**: white/black values encode the
   direction and distance each pixel is shifted. Distortion is *entirely planar* —
   a flat map on a flat backdrop. This works because screen viewing angles are
   consistent enough that planar distortion is visually indistinguishable from
   real 3D refraction.
4. **Shadow/depth** — larger elements simulate thicker material with deeper shadows.

Distinguishing property vs. ordinary glassmorphism: it **bends and concentrates**
light the way curved glass does, and refraction is **strongest at the rim**,
near-zero at the centre.

### 2.2 Reproducing it on the web — and why we mostly won't

The known technique is an SVG filter chain fed into `backdrop-filter`:
`feGaussianBlur` → `feImage` (displacement map PNG) → `feDisplacementMap`
(`scale≈55`, `xChannelSelector="R"`, `yChannelSelector="G"`), plus a second
`feImage` specular rim map composited with `feColorMatrix`/`feComposite`/`feBlend`.

Three blocking problems:

- **Chromium only.** Safari and Firefox do not support SVG filters as
  `backdrop-filter` inputs. Since this app is used on iPhones, Safari is a
  primary target — the effect would simply not render for a large share of users.
- **Expensive**, explicitly "especially on low-power devices," with "frame drops
  or visible jank on scroll."
- **Fixed-size assets.** Displacement and specular maps must match element
  dimensions; reusing one map across sizes "can create visual artifacts."

The source's own recommendation is to "restrict Liquid Glass to a small number of
floating UI elements such as toolbars, modals, navigation bars, and primary CTAs"
— which is **already this app's design contract, verbatim in spirit.**

### 2.3 Apple retreated from it

This is the most important finding in this document and it cuts against
"more glass everywhere":

- **NN/g**: *"Liquid Glass Is Cracked, and Usability Suffers in iOS 26."* Documented
  problems: text obscured by backgrounds, icons blending into photos, text over
  text, **touch targets falling below the 1 cm × 1 cm minimum**, and
  contextually appearing/vanishing controls that "break learnability."
- Accessibility reviewers: excessive transparency reduces contrast, hurts outdoor
  readability, and causes visual fatigue over long sessions.
- **Apple shipped a "Tinted" mode in iOS 26.1** that tones the gloss down and
  restores a flatter, calmer reading surface, after sustained backlash.

Conclusion: the target to copy is **iOS 26.1 Tinted**, not the June 2025 reveal.
Every usability failure NN/g lists is a failure this app's users — children on
mid-range phones — would hit harder than Apple's average customer.

---

## 3. Frutiger Aero

Roughly **2004–2013**; succeeds Y2K Futurism. Sometimes called "Web 2.0 Gloss."

- **Palette:** white, green, blue dominant. Sub-style "Funky Seasons" adds
  electric lime, sky blue, hot pink, neon orange. "Dark Aero" is the dark variant.
- **Motifs:** glossy/transparent surfaces mimicking glass and water, cloudy skies,
  tropical fish, bubbles, lens flares, bokeh, auroras, nature imagery.
- **Treatment:** linear gradients, bloom/glow, glossy sheen, skeuomorphic buttons
  with highlights for a tactile feel.
- **Type:** the Frutiger typeface family (Adrian Frutiger) — hence the name.
- **Canonical implementation:** Windows Aero (Vista / 7).
- **vs. Y2K:** higher-definition, more sophisticated 3D, "lacks the *anything
  goes* mentality" — more refined. Positioned as "the halfway point between the
  busyness of Y2K and the minimalism of Flat Design."
- **Ethos:** optimistic, clean, human-centric technology.

**Compatibility finding:** Frutiger Aero is the aesthetic *opposite* of restrained
Japanese editorial — glossy vs. matte, skeuomorphic vs. flat-with-rules,
saturated vs. neutral, decorative vs. structural. It cannot be the default
without discarding the design direction the contract protects.

It works as an **opt-in theme** among the existing 133, where its gradients and
gloss are scoped to theme tokens. Because the app already gates every theme
through `check:themes` (semantic hue, role, editor palette, slot and contrast
checks), an Aero theme must still pass contrast — which rules out the most
saturated "Funky Seasons" values for text-bearing roles.

---

## 4. Performance

### 4.1 React

- **React Compiler reached 1.0 stable (Oct 2025), production-stable in React 19.**
  It inserts memoization at build time, letting teams delete manual `useMemo` /
  `useCallback` boilerplate; reported ~70 % reduction in unnecessary re-renders.
- **Highest-leverage wins are structural**, in order: route-level code splitting,
  list virtualization, then component-level work. Scattering memoization by hand
  is explicitly called out as the *low*-value approach.
- Reported real-world results: 45 % initial-bundle reduction from splitting admin
  /analytics; 30 % from splitting modals and drawers.
- Smaller chunks parse and compile faster — the benefit is largest exactly on
  low-end devices and slow networks.

### 4.2 backdrop-filter — hard numbers

- `backdrop-filter: blur()` is **the most expensive filter**: it re-reads the
  layer beneath **every frame**.
- Mobile devices handle roughly **3–5 simultaneous blur surfaces** before
  degrading.
- **Blur values above ~10 px drop frames on mobile.**
- **`position: fixed` + `backdrop-filter` causes severe scroll jank on iOS** —
  the browser repaints the blurred region on every scroll frame.
- **Never animate blur radius** — it re-triggers GPU compositing per frame.
  Animate `opacity`/`transform` instead and keep blur static.
- `will-change: backdrop-filter` helps but should be applied before an animation
  begins, not left on permanently.

---

## 5. Audit — what this app already does right

Measured against the research above, the existing implementation is **already
strong**. Recording this to prevent well-intentioned "improvements" that regress it:

`src/styles/glass.css`
- Single `backdrop-filter` per surface, never nested.
- **No transform at rest** — a transformed element becomes a backdrop root and
  would blank the edge-lens pass.
- Blur held **constant between frames** (comment explicitly cites rasterization cost).
- Edge lens implemented as a **cached texture, not a second backdrop pass** — the
  comment records that the second pass "doubled raster work on wide navigation glass."
- `will-change: transform, opacity` — correctly *not* `backdrop-filter`.
- Rim-masked refraction falloff (`transparent 34%` → opaque at rim) — matches
  Apple's "refraction strongest at the rim" behaviour.
- Media queries for `prefers-reduced-motion`, `prefers-reduced-transparency`,
  `prefers-contrast: more`, and `forced-colors: active`.

`src/lib/performance-tier.js` + `index.css`
- Low-power detection via `deviceMemory ≤ 2`, `hardwareConcurrency ≤ 2`,
  `connection.saveData`, plus a live frame-budget monitor (90-frame sample,
  trips at >20 ms mean or >20 % slow frames).
- `html.performance-lite` **drops `backdrop-filter` entirely** to an opaque
  background, kills the custom cursor, grain, and all animation.

Build-side: route-level splitting, `Suspense` boundaries, offline cache, service
worker, bundle budgets enforced in CI (`check-bundle-budget.mjs`), and four
contract test scripts gating every build.

**This is not a codebase that needs optimization bolted on. It needs specific
gaps closed.**

---

## 6. Gaps worth acting on

Ordered by confidence × impact.

1. **Mobile blur exceeds the frame-drop threshold.** Research says >10 px drops
   frames on mobile. Current: base `--glass_blur: 20px`; the `@media (max-width:
   640px)` override lowers it only to **16 px**, and `.lg-thick` to **22 px**.
   Variants elsewhere reach 26/30/**38 px**. Lowering mobile blur costs almost
   nothing visually (blur is perceptually non-linear) and buys real frames.
2. **Verify no `position: fixed` element carries `backdrop-filter`** — this is the
   documented severe-jank case on iOS, and this app has a fixed header and
   floating control planes. Needs an audit pass.
3. **Count simultaneous glass surfaces per screen** against the 3–5 mobile budget.
4. **A user-facing "Tinted"/reduce-transparency toggle**, mirroring Apple's own
   iOS 26.1 retreat. Currently only the OS-level `prefers-reduced-transparency`
   media query is honoured — a user on a device without that setting has no escape.
5. **Japanese type metrics** (§1.1) are not currently enforced anywhere; worth a
   `check:typography` script in the same style as the existing contract checks.
6. **Touch-target audit** against the 1 cm minimum NN/g cites — directly serves
   the "a 6th grader can use it" requirement.
7. **React Compiler** — the single highest-leverage perf change available, but it
   requires React 19 and depends on the dependency-upgrade decision.

## 7. Explicitly rejected

- **SVG `feDisplacementMap` refraction in `backdrop-filter`** — Chromium-only;
  invisible on iPhone Safari, which is a primary target here.
- **Site-wide 縦書き** — browser caveats plus a direct usability cost for children.
- **Frutiger Aero as the default direction** — contradicts the protected
  Japanese editorial direction; ships as an opt-in theme instead.
- **Glass on the content plane** — the contract forbids it and the research
  independently confirms it as the top usability failure of iOS 26.

---

## Sources

Japanese editorial & typography
- [タイポグラフィ（概要）｜デジタル庁デザインシステムβ版](https://design.digital.go.jp/dads/foundations/typography/)
- [レイアウト（概要）｜デジタル庁デザインシステムβ版](https://design.digital.go.jp/dads/foundations/layout/)
- [デザインは余白でこんなに変わる！Webデザイナーが解説｜LIG](https://liginc.co.jp/624584)
- [デザインの質を上げる「余白」のつくり方｜キオミルブログ](https://kiomiru.co.jp/blog/design/white_space/)
- [デザインを決める「余白」ルール｜クーシー](https://coosy.co.jp/blog/webdesign-margin/)
- [グリッドレイアウトとは？｜デジタルハリウッド](https://school.dhw.co.jp/course/graphic/contents/w_grid.html)
- [縦書き文字を取り入れた、スタイリッシュなWebデザイン12選｜Workship MAGAZINE](https://goworkship.com/magazine/vertical-web-design/)
- [CSS Writing Modes の仕様解説｜縦書きWeb普及委員会](https://tategaki.github.io/explan1.html)
- [縦書きレイアウト作成ノウハウ｜縦書きWeb普及委員会](https://tategaki.github.io/explan4.html)
- [おすすめの明朝体｜デザインポケット](https://designpocket.jp/static/font/feature/mincho.html)

Apple Liquid Glass
- [Apple introduces a delightful and elegant new software design｜Apple Newsroom](https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/)
- [How Liquid Glass works｜pavel larionov](https://1ar.io/updates/how-liquid-glass-works)
- [How to create Liquid Glass effects with CSS and SVG｜LogRocket](https://blog.logrocket.com/how-create-liquid-glass-effects-css-and-svg/)
- [Liquid Glass Is Cracked, and Usability Suffers in iOS 26｜NN/g](https://www.nngroup.com/articles/liquid-glass/)
- [iOS 26 in detail: Liquid Glass UI between Usability and Accessibility｜let's dev](https://letsdev.de/en/blog/ios-26-in-detail-liquid-glass-ui-between-usability-and-accessibility.php)
- [Apple's iOS 26 Liquid Glass: Sleek, Shiny, and Questionably Accessible｜Infinum](https://infinum.com/blog/apples-ios-26-liquid-glass-sleek-shiny-and-questionably-accessible/)
- [iOS 26 UI transparency causes readability and accessibility issues｜Apple Developer Forums](https://developer.apple.com/forums/thread/811219)
- [Apple yields: 'Tinted' control in iOS 26.1 beta 4｜Gulf News](https://gulfnews.com/technology/companies/apple-yields-tinted-control-in-ios-261-beta-4-tones-down-liquid-glass-after-backlash-1.500315176)

Frutiger Aero
- [Frutiger Aero Aesthetic｜frutiger-aero.org](https://frutiger-aero.org/frutiger-aero)
- [Frutiger Aero Archive](https://frutigeraeroarchive.org/)
- [Frutiger Aero: Rise, Reign & Resurgence｜Vapor95](https://vapor95.com/blogs/darknet/frutiger-aero-a-nostalgic-journey-through-the-rise-reign-and-resurgence-of-a-unique-design-aesthetic)
- [Frutiger Aero aesthetic: the glossy 2000s trend｜Kittl](https://www.kittl.com/blogs/frutiger-aero-aesthetic-stl/)

Performance
- [React Performance Optimization: React 19 Compiler, Memo, Lazy Loading｜Ilir Ivezaj](https://ilirivezaj.com/guides/react-performance-guide)
- [React Performance Optimization 2026: Advanced Techniques｜Softaims](https://softaims.com/blog/react-performance-optimization-advanced-2026)
- [Optimizing Bundle Sizes in React Applications｜Coditation](https://www.coditation.com/blog/optimizing-bundle-sizes-in-react-applications-a-deep-dive-into-code-splitting-and-lazy-loading)
- [backdrop-filter｜MDN](https://developer.mozilla.org/docs/Web/CSS/Reference/Properties/backdrop-filter)
- [CSS backdrop-filter: blur, brightness, saturate and when to use each｜Empire UI](https://empire-ui.com/blog/backdrop-filter-css)
- [backdrop-filter: blur is laggy when many elements are rendered｜Mozilla bug 1718471](https://bugzilla.mozilla.org/show_bug.cgi?id=1718471)
- [CSS Backdrop filter causing performance issues｜shadcn-ui/ui #327](https://github.com/shadcn-ui/ui/issues/327)
