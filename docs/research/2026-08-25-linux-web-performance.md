# Linux web performance research — 2026-08-25

## Scope

This pass targets Chromium/Ozone and Firefox-class browsers on desktop Linux while preserving MABIS visual quality. A page cannot select Mesa drivers, Wayland buffer formats, Vulkan queues, kernel schedulers, or GPU-process fallback modes. The app therefore optimizes browser-visible work and measures actual capability instead of treating every Linux machine as weak.

## Primary-source findings

- Chromium's Ozone overview places accelerated rendering in the GPU process behind a platform abstraction. The page does not own the kernel/window-system boundary: https://chromium.googlesource.com/chromium/src/+/main/docs/ozone_overview.md
- Chromium's Wayland documentation describes GPU-process buffer allocation, commit, presentation, and reuse. Extra promoted surfaces can increase memory and buffer-management work: https://chromium.googlesource.com/chromium/src/+/main/ui/ozone/platform/wayland/README.md
- Chromium documents several GPU and software fallback paths on Linux, so operating-system detection alone is not a rendering-capability test: https://chromium.googlesource.com/chromium/src/+/refs/heads/main/content/browser/gpu/fallback.md
- Chromium's compositor architecture keeps scroll responsive through the compositor. Application scroll handlers should not drive decoration or layout: https://chromium.googlesource.com/chromium/src/+/master/docs/how_cc_works.md
- CSS Containment lets the user agent skip layout and rendering work. `content-visibility: auto` supplies containment, but focus and top-layer content still need correct handling: https://www.w3.org/TR/css-contain-2/
- The WebGL `failIfMajorPerformanceCaveat` context option provides a standards-defined signal when WebGL would be dramatically slower than native rendering: https://registry.khronos.org/webgl/specs/latest/1.0/
- `requestIdleCallback` lets the user agent schedule noncritical work around input, animation, and compositing: https://www.w3.org/TR/requestidlecallback/
- Chrome's rendering guidance recommends transform/opacity for motion and warns against excessive layer promotion: https://web.dev/articles/stick-to-compositor-only-properties-and-manage-layer-count
- Mozilla documents `will-change` as a last resort; overuse consumes memory and can slow the page: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/will-change
- Long Animation Frame entries expose render and style/layout attribution for frames over 50 ms, which is more actionable than a platform label: https://developer.chrome.com/docs/web-platform/long-animation-frames

## Decisions implemented

1. Keep the Linux quality-first contract: no automatic `performance-lite`, no Linux-only blur removal, and no loss of animation, grain, cursor physics, themes, or reduced-motion behavior.
2. Remove the blanket Linux `preserve-3d`, backface, and global `optimizeLegibility` hints. These were speculative and could increase surfaces, memory, and shaping work.
3. Replace ten reveal observers with one shared reveal/activity observer. It preserves the entrance timing and maintains `.cv-onscreen` without adding a scroll handler.
4. On Linux, pause only continuous decorative animations inside measured sections after they leave the viewport. They resume in the same state before becoming visible.
5. Let the browser promote the short `widget-rise` transform/opacity keyframe instead of pinning section layers with permanent `will-change`.
6. Preserve the primary one-pass live glass backdrop during rapid and momentum scrolling; only redundant pseudo-element depth passes are eligible for the existing scroll-time pause.
7. Extend the opt-in `?perf=1` report with desktop-platform and software-renderer signals so driver fallback can be distinguished from application work.
8. Enforce the result with `check:linux` plus the main performance contract.

## Measurement rules

Compare Linux sessions at the display's measured refresh rate. Use dropped-frame share, p95/p99 pacing in refresh multiples, jitter, INP, LoAF attribution, LCP, and CLS. Do not claim a Linux win from user-agent detection alone, and do not trade away canonical visuals to improve a synthetic score.
