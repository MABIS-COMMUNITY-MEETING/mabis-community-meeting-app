# Custom theme pre-paint audit — 2026-08-20

## Request

Apply saved custom theme colors before the website loads, eliminating the default-color flash on reload.

## Finding

The app already snapshots the final inline CSS-variable paint after all three custom paths:

- `applyCustomColors()` for legacy primary/secondary themes,
- `applyMaterialSeed()` for wallpaper/photo Material You schemes,
- font application, which refreshes the same snapshot after the selected face is applied.

However, `applyThemeSnapshot()` ran inside the external JavaScript entry module. The shipped `solid/index.html` displayed a full-viewport loading surface with hard-coded dark background, cream text and MABIS-maroon progress before that module executed. The stored custom palette was correct but arrived one paint too late.

## Implementation constraints

- Replay only a snapshot whose theme and font identity match the current stored preferences.
- Keep the full theme catalogue and Material color maths out of the blocking path.
- Apply root CSS variables in a small blocking head script before critical first-paint CSS is parsed.
- Apply the snapshot's owned body polarity/theme classes immediately after `<body>` exists and before the root or loading surface.
- Make the loading surface consume `--background`, `--foreground` and `--primary` with safe dark fallbacks.
- Update `meta[name="theme-color"]` from the saved primary for matching browser chrome.
- Keep the existing module replay and post-paint reconciliation as authoritative repair paths.
- A remote account theme cannot be known before the first authenticated network response on a brand-new device. This pre-paint path deliberately covers already-synced local preferences and every ordinary reload.
