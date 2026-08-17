/**
 * Solid migration parity check.
 *
 * A green `vite build` only proves the Solid port COMPILES. This mounts the
 * real built bundle in a DOM and asserts the rendered output against the React
 * source of truth, which is what actually catches a broken port: a component
 * that throws on mount, children rendered once instead of twice, a Tailwind
 * transform silently cancelled by an inline style, or a dropped class.
 *
 * Run: node scripts/check-solid-parity.mjs [route] [flags...]   (default "/")
 *
 * Flags, in any order, are written to localStorage before the bundle boots:
 *   ja    the Japanese-companion preference, exercising the auto-translation
 *         scanner on the initial-mount path rather than only on change.
 *   boss  the editorial Home layout. Home defaults to the simple layout, so
 *         without this the boss-only masthead and interludes never render.
 *
 * One route per process on purpose. The bundle is a singleton — ESM caches it
 * and the theme engine writes to documentElement once — so checking a second
 * route in the same process would assert against the first route's DOM. The
 * `parity` npm script fans out across routes instead.
 */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { JSDOM } from "jsdom";

const dist = path.join(process.cwd(), "dist-solid");
const route = process.argv[2] || "/";
const flags = process.argv.slice(3);
const japaneseMode = flags.includes("ja");
const bossLayout = flags.includes("boss");
const failures = [];
const checks = [];

function check(name, condition, detail = "") {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
// The compiled stylesheet, for rules whose effect jsdom cannot compute.
const builtCss = fs.readdirSync(path.join(dist, "assets"))
  .filter((f) => f.endsWith(".css"))
  .map((f) => fs.readFileSync(path.join(dist, "assets", f), "utf8"))
  .join("\n");
const entry = fs.readdirSync(path.join(dist, "assets")).find((f) => /^index-.*\.js$/.test(f));
if (!entry) {
  console.error("No Solid entry bundle found. Build first.");
  process.exit(1);
}

/*
 * Built-HTML parity, asserted before anything is mounted.
 *
 * These come from the entry HTML and the Base44 plugin's production injection,
 * not from any component, so no amount of DOM checking below would catch them
 * going missing. Both WERE missing from dist-solid at one point: the Solid
 * config omitted the plugin entirely, and solid/index.html had no JSON-LD.
 */
check("analytics tracker injected into the production build",
  /getPageNameFromPath/.test(html),
  "the @base44/vite-plugin production injection is absent");
check("Organization structured data present",
  /application\/ld\+json/.test(html) && /schema\.org/.test(html));
check("manifest linked (PWA installability)", /rel="manifest"/.test(html));
check("theme-color set", /name="theme-color"/.test(html));

const dom = new JSDOM(html, { url: `http://localhost${route}`, pretendToBeVisual: true, runScripts: "outside-only" });
const { window } = dom;

// jsdom lacks these; the port reads them through the shared preference and
// physics modules, so stub them exactly as a fine-pointer desktop would report.
window.matchMedia = (q) => ({
  matches: /hover: hover|pointer: fine/.test(q) && !/reduce/.test(q),
  media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
});
if (!window.requestIdleCallback) window.requestIdleCallback = (fn) => setTimeout(fn, 0);

// Written before the bundle boots so the preference is already true the first
// time useJapaneseText() reads it — setting it afterwards would only prove the
// change event works, not the initial-mount path.
if (japaneseMode) window.localStorage.setItem("mabis-japanese-text-enabled", "true");
if (bossLayout) window.localStorage.setItem("mabis-home-layout", "boss");

/*
 * Signed-in routes need a session. Rather than stand up a fake Base44 backend,
 * this uses the app's own offline-recovery path: base44.auth.me() fails (there
 * is no server), AuthContext falls back to restoreOfflineUser(), and that reads
 * a localStorage record keyed by a hash of the access token. Seed both and the
 * protected routes render exactly as they would for a real signed-in user.
 *
 * tokenMarker is FNV-1a, copied from src/lib/offline-cache.js — it must stay in
 * step with that function or the record is silently rejected as another user's.
 */
const SEEDED_USER = { id: "parity-user", full_name: "Parity Tester", email: "parity@example.com", role: "admin" };
if (route.startsWith("/home")) {
  const token = "parity-token";
  let hash = 2166136261;
  for (let i = 0; i < token.length; i += 1) {
    hash ^= token.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  window.localStorage.setItem("base44_access_token", token);
  window.localStorage.setItem("mabis-offline-user-v1", JSON.stringify({
    user: SEEDED_USER,
    marker: (hash >>> 0).toString(36),
    savedAt: Date.now(),
  }));
}

// Vite's modulepreload polyfill fetches each chunk to warm the cache. There is
// no server here and it is only a prefetch, so make it a no-op rather than let
// an unhandled rejection kill the run.
const noopFetch = () => Promise.resolve({ ok: true, status: 200, text: () => Promise.resolve(""), json: () => Promise.resolve({}) });
window.fetch = noopFetch;
globalThis.fetch = noopFetch;

// There is no Base44 backend here. AuthProvider probes the session on mount,
// and an XHR with nothing listening leaves the process hanging forever, so
// requests fail immediately instead. The provider already treats a failed
// probe as "signed out", which is the correct state for this check — Splash
// renders identically either way.
class DeadXHR {
  open() {}
  setRequestHeader() {}
  abort() {}
  addEventListener(type, cb) { if (type === "error") this._onerror = cb; }
  removeEventListener() {}
  getAllResponseHeaders() { return ""; }
  send() { setTimeout(() => { this.status = 0; this.readyState = 4; this.onerror?.(new Error("offline")); this._onerror?.(new Error("offline")); this.onreadystatechange?.(); }, 0); }
}
window.XMLHttpRequest = DeadXHR;
globalThis.XMLHttpRequest = DeadXHR;

/*
 * KNOWN GAP: DocsEditor's module graph imports quill/dist/quill.snow.css, so
 * Vite's dynamic-import preload helper adds a stylesheet <link> and waits for
 * its `load` event before resolving the import (see __vitePreload in the
 * entry bundle) -- real browsers fire that once the stylesheet request
 * completes. jsdom never fires it (nothing here actually fetches the linked
 * CSS), so DocsEditor's import() sits pending forever and the four
 * DocsEditor-dependent checks below fail even though the port is correct.
 *
 * Tried firing a synthetic `load` on every stylesheet <link> so the import
 * resolves. That works, but once DocsEditor (and Quill) actually mount here,
 * something downstream churns hard enough that the run never reaches a
 * settled state within any reasonable timeout, even with the 30s watchdog
 * below -- worse than the known, narrow failure this was meant to fix. Left
 * out. Verifying the editor itself needs a real browser (Playwright et al.),
 * not a deeper jsdom shim.
 */

// Hard watchdog: a parity check that hangs is a broken check, not a pass.
const watchdog = setTimeout(() => {
  console.error("Solid parity: timed out after 30s (something never settled).");
  process.exit(1);
}, 30000);
watchdog.unref?.();

// NB: `performance` is deliberately excluded. jsdom's Performance delegates to
// the global one, so assigning it back onto globalThis makes now() recurse
// into itself and blow the stack. Node's native performance works fine here.
for (const k of ["window", "document", "navigator", "localStorage", "sessionStorage", "requestAnimationFrame", "cancelAnimationFrame", "matchMedia", "getComputedStyle", "CustomEvent", "Event", "MutationObserver", "IntersectionObserver", "PerformanceObserver", "location", "history"]) {
  if (window[k] !== undefined) globalThis[k] = window[k];
}

// Copy every DOM constructor (HTMLHeadElement, Node, Element, …) rather than
// listing them: the router and query client reach for a long tail of these,
// and enumerating by hand just turns into a game of whack-a-mole.
for (const k of Object.getOwnPropertyNames(window)) {
  if (/^[A-Z]/.test(k) && globalThis[k] === undefined) {
    try { globalThis[k] = window[k]; } catch { /* getter-only */ }
  }
}
Object.defineProperty(window, "performance", { value: globalThis.performance, configurable: true });
globalThis.self = window;

// Imported by real path, not a data: URL — the entry code-splits Splash and
// Home into sibling chunks, and relative specifiers only resolve against a
// real file URL.
const entryUrl = pathToFileURL(path.join(dist, "assets", entry)).href;

let mountError = null;
try {
  await import(entryUrl);
  // Bootstrap awaits a font promise, then the lazy route chunk resolves.
  await new Promise((r) => setTimeout(r, 1200));
} catch (e) {
  mountError = e;
}

check("bundle executes without throwing", !mountError, mountError && String(mountError).slice(0, 300));

const root = window.document.getElementById("root");
const text = root ? root.textContent.replace(/\s+/g, " ") : "";
const html2 = root ? root.innerHTML : "";

check("app mounted into #root", root && root.children.length > 0);

/*
 * jsdom's querySelector silently fails to match an attribute selector whose
 * value contains "&" — button[title="Feedback & Bug Reports"] returns null
 * even though the element is present and getAttribute reads the value back
 * correctly. It does not throw, so the result is indistinguishable from a
 * component that never mounted, and it cost a real debugging detour. Match by
 * iteration instead of trusting the selector engine.
 */
const byTitle = (title) => (root
  ? [...root.querySelectorAll("[title]")].find((el) => el.getAttribute("title") === title)
  : undefined);

/*
 * Lazy chunks resolve on the timer queue, so a fixed sleep after a click is a
 * race — the same assertion passed and failed on consecutive runs before this.
 * Poll to a deadline instead.
 */
const waitFor = async (predicate, timeoutMs = 6000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return true;
    await new Promise((r) => setTimeout(r, 25));
  }
  return predicate();
};

const textNow = () => (root ? root.textContent.replace(/\s+/g, " ") : "");

// ── route-specific parity ──────────────────────────────────────────────────
// Only the landing route asserts the Splash slice; the auth and fallback
// routes assert their own source of truth. Everything below the divider is
// shared shell behaviour and runs for every route.
if (route === "/login") {
  // src/pages/Login.jsx + src/components/AuthLayout.jsx
  check("sign-in headline present", text.includes("Sign in"));
  check("Japanese title present", text.includes("サインイン"));
  check("subtitle present", text.includes("Continue with your MABIS Google account"));
  check("Google CTA present", text.includes("CONTINUE WITH GOOGLE"));
  check("AuthLayout IDENTITY label present", text.includes("IDENTITY"));
  check("AuthLayout AUTH label present", text.includes("AUTH"));
  check("AuthLayout N° 00 present", text.includes("N° 00"));
  check("AuthLayout background word present", text.includes("MABIS"));
  check("auth entrance keyframe applied (not framer)", html2.includes("auth-rise"));
  check("logo slot rendered, not the icon fallback",
    !!(root && root.querySelector('img[alt="MABIS"]')),
    "AuthLayout should take the logo branch, so <Dynamic component={icon}> must not render");
  check("Google mark rendered (4-path brand svg)",
    (html2.match(/#4285F4|#34A853|#FBBC05|#EA4335/g) || []).length === 4);
  check("cursor hint preserved", html2.includes('data-cursor="GOOGLE"'));
  // The button is enabled until clicked; a disabled button here would mean the
  // loading signal initialised wrong and sign-in would be dead on arrival.
  const cta = root && root.querySelector('button[data-cursor="GOOGLE"]');
  check("Google button is clickable on first paint", cta && !cta.disabled);
} else if (route === "/home") {
  // The shell must render for a signed-in user — if offline recovery failed we
  // would be looking at the login redirect instead, and every check below would
  // be vacuously true, so assert we are NOT on login first.
  check("signed-in session recovered (not bounced to login)",
    !text.includes("CONTINUE WITH GOOGLE"),
    "landed on /login — the seeded offline session was rejected");
  /*
   * Wait for the masthead, and assert on something only Home renders.
   *
   * This used to assert `text.includes("MABIS")` against a single early
   * sample — which the LOADING SCREEN also contains ("MABIS 2026"), so it
   * passed whether Home had rendered or not. Swapping the route fallback to a
   * blank div exposed it. Poll for the masthead itself instead.
   *
   * The default layout has no masthead at all — it goes straight from the bar
   * into the widgets, as the original site did — so it is matched by the
   * container's attribute. Matching on its copy would be the same trap as
   * MABIS: the header renders "MABIS Community Meeting" before Home mounts.
   */
  if (bossLayout) {
    await waitFor(() => textNow().includes("COMMUNITY DASHBOARD"), 15000);
    check("editorial masthead rendered", textNow().includes("COMMUNITY DASHBOARD"));
  } else {
    await waitFor(() => !!root.querySelector("[data-summer-home]"), 15000);
    check("default (original MABIS) layout rendered", !!root.querySelector("[data-summer-home]"));
    check("editorial masthead not rendered in the default layout",
      !textNow().includes("COMMUNITY DASHBOARD"));
    check("original top bar rendered", textNow().includes("Secondary Community Meeting App"));
    check("archive routes still reachable without the editorial menu",
      textNow().includes("Pages"));
  }

  // MabisAIAssistant: lazy, inside IdleMount, so it appears only after the idle
  // callback fires and its chunk resolves.
  await waitFor(() => byTitle("MABIS Omni AI Assistant"));
  const fab = byTitle("MABIS Omni AI Assistant");
  check("assistant FAB mounted after idle", !!fab,
    "IdleMount never fired, or the lazy chunk failed to resolve");
  check("assistant panel closed on first paint",
    !textNow().includes("How can I help?"));

  if (fab) {
    fab.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => textNow().includes("How can I help?"));
    const t2 = textNow();
    const h2b = root.innerHTML;
    check("assistant panel opens on click", t2.includes("MABIS Assistant"));
    check("empty-state prompt rendered", t2.includes("How can I help?"));
    check("all four suggestions rendered",
      t2.includes("What's on the agenda this week?")
      && t2.includes("What did we discuss last meeting?")
      && t2.includes("Who's on jobs this week?")
      && t2.includes("Any announcements I should know about?"));
    check("composer rendered", h2b.includes("Reply to MABIS Assistant"));
    check("entrance is the CSS keyframe, not framer", h2b.includes("assistant-pop"));
    check("send button disabled while the composer is empty",
      !!root.querySelector("textarea")
      && [...root.querySelectorAll("button")].some((b) => b.disabled));
  }

  // Header controls: React renders the avatar, first name and sign-out beside
  // the theme/settings buttons. Solid was missing the whole block.
  check("sign-out control rendered", textNow().includes("SIGN OUT"));
  check("signed-in user's first name shown", textNow().includes("PARITY"),
    "expected the seeded user's first name, upper-cased");
  const avatarBtn = byTitle("Customize Profile Picture");
  check("profile-picture button rendered", !!avatarBtn);

  if (avatarBtn) {
    avatarBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => textNow().includes("Upload Photo"));
    const t3 = textNow();
    check("ProfileEditor opens on click", t3.includes("Customize Profile Picture"));
    check("ProfileEditor upload control rendered", t3.includes("Upload Photo"));
    check("ProfileEditor reset control rendered", t3.includes("Reset to default"));
    check("ProfileEditor uses the CSS entrance, not framer",
      root.innerHTML.includes("dropdown-pop"));
  }

  // JobReminder is the third IdleMount child. With no assignment data it must
  // render nothing at all rather than an empty modal over the page.
  check("job reminder stays closed with no pending jobs",
    !textNow().includes("Job Reminder"));

  /*
   * The ten Home widgets.
   *
   * These render here even though jsdom has no IntersectionObserver, because
   * perf.js's onceVisible() degrades to firing immediately when the observer
   * is unavailable — so LazySection mounts its children rather than sitting on
   * the placeholder. That is the same path a browser with no IO support takes,
   * which makes this a real assertion, not an artefact of the harness.
   */
  // Copied from the label column of src/pages/Home.jsx, in order. Note these
  // are the SECTION labels, which differ from the wording the nav index uses
  // for the same sections ("MEMBERS" vs "People").
  //
  // Boss-layout only: they are the editorial section HEADINGS. The default
  // layout has no headings — the widget is the module — so it asserts the
  // widgets themselves are all mounted instead, one section element each.
  const SECTIONS = [
    ["01", "MEETING MODE"],
    ["02", "ANNOUNCEMENTS"],
    ["03", "DISCUSSION"],
    ["04", "JOBS AND ROTATION"],
    ["05", "CALENDAR"],
    ["06", "SCHEDULE"],
    ["07", "LOST AND FOUND"],
    ["08", "LUNCH MENU"],
    ["09", "NEWS"],
    ["10", "MEMBERS"],
  ];
  if (bossLayout) {
    for (const [index, label] of SECTIONS) {
      check(`section ${index} (${label}) rendered`, textNow().includes(label));
    }
  } else {
    for (const [index] of SECTIONS) {
      check(`section ${index} mounted`, !!root.querySelector(`#sec-${index}`));
    }
  }
  /*
   * Wait for the lazy widget chunks to settle before counting placeholders.
   *
   * Every widget sits behind <Suspense>, so a placeholder means "this chunk has
   * not resolved YET" — not "this section is broken". The hero paints long
   * before those imports land, so asserting as soon as COMMUNITY DASHBOARD
   * appears was racing them and counting eight fallbacks that were about to go
   * away. The assertion below is unchanged; this only stops it firing early.
   */
  await waitFor(() => (root.innerHTML.match(/lazy-section-placeholder/g) || []).length <= 2, 20000);

  if (process.env.PARITY_DEBUG) {
    const html = root.innerHTML;
    console.log("[debug] placeholders:", (html.match(/lazy-section-placeholder/g) || []).length);
    console.log("[debug] docs-editor-* classes:",
      JSON.stringify([...new Set(html.match(/docs-editor[\w-]*/g) || [])]));
    console.log("[debug] announcements copy:", html.includes("No announcements yet"));
    console.log("[debug] loading screen still up:", textNow().includes("CACHING"));
    console.log("[debug] text sample:", textNow().replace(/\s+/g, " ").slice(0, 400));
  }
  check("no MORE than the expected sections reserve space",
    (root.innerHTML.match(/lazy-section-placeholder/g) || []).length <= 2);

  // Widgets must reach their empty state, not an error or a spinner. Every
  // entity query fails in here (there is no backend), so this doubles as the
  // offline-behaviour check.
  check("announcements widget reached its empty state",
    textNow().includes("No announcements yet"));
  // Removal is admin-only and confirmed. The dialog only exists once a
  // removal is requested, so assert the confirming copy is not shown unasked.
  check("announcement removal is not pre-confirmed",
    !textNow().includes("Remove this announcement?"));
  /*
   * The Discussion section is a per-week minutes document now.
   *
   * NOTE: keep assertions here to the document SURFACE (the container and its
   * seeded HTML), not to Quill's own internals — toolbars, selection, key
   * handling and clipboard all need layout jsdom does not do, so asserting on
   * them fails for reasons unrelated to the code under test. Verify editing
   * behaviour in a browser.
   *
   * An earlier version of this note claimed .docs-editor-content never appears
   * under jsdom. It does; what was actually happening is that the check ran
   * before the lazy chunk resolved (see the wait above). Do not re-weaken these
   * assertions on the strength of that claim.
   */
  check("the retired topic list is gone",
    !textNow().includes("No topics yet"),
    "Discussion is a document now, not a topic list");
  // The minutes render as plain HTML and only swap to the editor on click, so
  // Quill stays off Home's critical path. Assert the document surface is there.
  check("minutes document surface rendered",
    !!root.querySelector(".docs-editor-content, .docs-editor-readonly"));

  check("meeting mode renders its locked state",
    textNow().includes("Locked until Friday"));

  check("the retired Add Topic control is gone",
    !textNow().includes("Add Topic"));

  // Editorial interludes are boss-layout only; the footer and the page guide
  // belong to both.
  if (bossLayout) {
    check("scroll-velocity band rendered",
      (textNow().match(/BANGKOK/g) || []).length >= 2,
      "the band renders its sequence twice for the seamless loop");
    check("scroll-scale ritual rendered", textNow().includes("VOICE YOUR WORDS"));
    check("scroll section indicator rendered", textNow().includes("SCROLL"));
    check("page guide rendered", textNow().includes("Choose where to go"));
    check("page footer rendered", textNow().includes("COLOPHON"));
  } else {
    check("scroll interludes absent from the default layout",
      !textNow().includes("VOICE YOUR WORDS"));
    check("editorial page guide absent from the default layout",
      !textNow().includes("Choose where to go"));
    check("original footer rendered", textNow().includes("Version: "));
    /*
     * Rounded cards.
     *
     * The widgets ship the original site's classes; what used to flatten them
     * was editorial-home.css forcing a 2px radius. jsdom computes no styles,
     * so assert both halves of the arrangement: the class is still on the
     * widget, and the rule that would override it is gated on the boss class.
     */
    check("widget cards keep their rounded corners",
      root.innerHTML.includes("mabis-widget bg-card rounded-2xl"));
    check("the radius override is gated on the boss layout",
      /html\.home-layout-boss[^{}]*\.mabis-widget[^{}]*rounded-2xl/.test(builtCss),
      "editorial-home.css would flatten the default layout's cards");
  }
  check("birthday banner stays closed with no birthdays today",
    !textNow().includes("Happy birthday"));

  // QuickStartGuide: lazy, warmed on hover, opened by the Help button.
  const helpBtn = byTitle("How to use this site");
  check("help button rendered", !!helpBtn);
  if (helpBtn) {
    helpBtn.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => textNow().includes("How to use this site"));
    const t5 = textNow();
    check("quick-start guide opens on click", t5.includes("How to use this site"));
    check("all five guide sections rendered",
      t5.includes("Start a meeting")
      && t5.includes("Add a discussion topic")
      && t5.includes("Assign a job")
      && t5.includes("Find dates and daily information")
      && t5.includes("Change how the site looks"));
    check("guide dismiss control rendered", t5.includes("I’m ready"));
    // Escape must close it AND restore body scroll.
    window.document.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    window.dispatchEvent(new window.KeyboardEvent("keydown", { key: "Escape" }));
    await waitFor(() => !textNow().includes("Start a meeting"));
    check("Escape closes the guide", !textNow().includes("Start a meeting"));
    check("body scroll restored after closing",
      window.document.body.style.overflow !== "hidden",
      `body overflow left as "${window.document.body.style.overflow}"`);
  }

  // FeedbackWidget: the other half of Home's IdleMount block.
  await waitFor(() => byTitle("Feedback & Bug Reports"));
  const feedbackFab = byTitle("Feedback & Bug Reports");
  check("feedback FAB mounted after idle", !!feedbackFab);

  if (feedbackFab) {
    feedbackFab.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await waitFor(() => textNow().includes("Report Issue or Bug"));
    const t4 = textNow();
    check("feedback panel opens on click", t4.includes("Report Issue or Bug"));
    check("satisfaction scale rendered", t4.includes("Satisfaction:"));
    check("rating defaults to 8/10", t4.includes("8/10"));
    check("attach-image control rendered", t4.includes("Attach image"));
    check("submit is disabled until a message is typed",
      [...root.querySelectorAll("button")].some((b) => b.disabled && /Submit/.test(b.textContent)));
  }
} else if (route === "/") {
  // ── content parity with src/pages/Splash.jsx ──────────────────────────────
  check('hero headline "COMMUNITY" present', text.includes("COMMUNITY"));
  check('hero headline "MEETING" present', text.includes("MEETING"));
  check("eyebrow label present", text.includes("SECONDARY COMMUNITY MEETING APP"));
  check("mission copy present", text.includes("Voice your words with presence and shared decision"));
  check("CTA present", text.includes("ENTER LOG IN"));
  check("N° 02 button index present", text.includes("N° 02"));
  check("EST. BANGKOK TH present", text.includes("EST. BANGKOK TH"));
  check("N° 2026 EDITION present", text.includes("N° 2026 EDITION"));
  check("SCROLL cue present", text.includes("SCROLL"));

  // ── structural parity ────────────────────────────────────────────────────
  check("SplitChars split the headline per glyph",
    (html2.match(/overflow: ?hidden/g) || []).length >= 16,
    "expected one clipping span per glyph of COMMUNITY+MEETING");

  check("marquee duplicated its children for the seamless loop",
    (html2.match(/MABIS BANGKOK/g) || []).length === 12,
    `found ${(html2.match(/MABIS BANGKOK/g) || []).length}, expected 12 (6 items x 2 copies)`);

  check("KineticBackground layers rendered", html2.includes("blob-drift") && html2.includes("spin-slow"));
  check("corner bracket rendered", html2.includes("corner-bracket"));
  check("liquid button classes preserved", html2.includes("liquid-btn") && html2.includes("liquid-ink"));
  check("theme tokens used (bg-ink / text-bone)", html2.includes("bg-ink") && html2.includes("text-bone"));

  // The giant cropped word animates opacity only, so its Tailwind centering
  // transform must survive — an inline transform here would be the regression.
  const hugeCrop = root && root.querySelector(".huge-crop");
  check("huge-crop word rendered", !!hugeCrop);
  check("huge-crop keeps its Tailwind transform (no inline transform override)",
    hugeCrop && !/transform/i.test(hugeCrop.getAttribute("style") || ""),
    hugeCrop ? `style="${hugeCrop.getAttribute("style")}"` : "");

  // Elements that DO animate a transform should have one inline.
  const vertLabels = root ? [...root.querySelectorAll(".vert-text")] : [];
  check("vertical side labels rendered", vertLabels.length >= 2);
} else {
  // src/lib/PageNotFound.jsx — any unmatched path.
  check("404 numeral present", text.includes("404"));
  check("404 heading present", text.includes("Page Not Found"));
  check("ERROR 404 label present", text.includes("ERROR 404"));
  check("offending path echoed back", text.includes(route.slice(1)));
  check("return-home CTA present", text.includes("RETURN HOME"));
  check("fade keyframe applied (not framer)", html2.includes("fade-in"));
  check("admin note hidden for signed-out visitor", !text.includes("ADMIN NOTE"));
}

// ── always-on shell ───────────────────────────────────────────────────────
// These mount in App.jsx for every route, so they are asserted for every route.
const shellHtml = () => (root ? root.innerHTML : "");
check("grain overlay mounted", shellHtml().includes("grain-layer"));
check("palette stripe mounted", shellHtml().includes("--palette-stripes"));
check("scroll progress bar mounted", shellHtml().includes("--palette-gradient"));

// React wraps every route EXCEPT Splash in PageTransition.
if (route === "/") {
  check("landing route has no page-transition curtain", !shellHtml().includes("page-curtain"));
} else {
  check("page-transition curtain rendered", shellHtml().includes("page-curtain"));
  check("content lift uses backwards fill, not both",
    shellHtml().includes("page-content-lift"));
}

// ── Japanese companion layer ──────────────────────────────────────────────
if (japaneseMode) {
  const annotated = root ? root.querySelectorAll("[data-ja-companion]") : [];
  check("auto-companion annotated the tree", annotated.length > 0,
    "no [data-ja-companion] attributes — the MutationObserver scan never ran");
  check("annotations carry a layout hint",
    [...annotated].every((el) => el.hasAttribute("data-ja-layout")));
  check("annotations are non-empty Japanese",
    [...annotated].every((el) => /[぀-ヿ一-龯]/.test(el.getAttribute("data-ja-companion"))));
  check("screen-reader marker present", html2.includes("日本語"));
  check("japanese-text-enabled class set when the preference is on",
    window.document.documentElement.classList.contains("japanese-text-enabled"));
  check("CJK stylesheet requested once CJK text exists",
    !!window.document.getElementById("maple-mono-cjk-styles"));
  // Manual <JapaneseText> output must not be re-translated by the scanner.
  const skipped = root ? root.querySelectorAll("[data-ja-skip][data-ja-companion]") : [];
  check("scanner did not double-translate manual JapaneseText spans", skipped.length === 0,
    `${skipped.length} element(s) carry both data-ja-skip and a companion`);
} else {
  check("no Japanese annotations when the preference is off",
    !root || root.querySelectorAll("[data-ja-companion]").length === 0);

  /*
   * Hand-written <span lang="ja"> bypasses <JapaneseText> and the scanner, so
   * the preference is enforced in CSS instead (see index.css). Assert the hook
   * that rule depends on: the class must be absent from <html>, and any raw
   * lang="ja" left in the markup must be opted out explicitly. Reported by a
   * user who turned Japanese off and still saw サインイン on the sign-in page.
   */
  check("japanese-text-enabled class absent when the preference is off",
    !window.document.documentElement.classList.contains("japanese-text-enabled"));
  // jsdom does not apply stylesheets, so assert the rule shipped rather than
  // its computed effect. Both halves matter: the selector, and the opt-out.
  check("stylesheet gates raw lang=\"ja\" on the preference",
    /html:not\(\.japanese-text-enabled\)[^{]*\[lang=["']?ja["']?\]/.test(builtCss),
    "the index.css rule that hides ungated Japanese is missing from the build");
  check("stylesheet honours the data-ja-always opt-out",
    /data-ja-always/.test(builtCss));
}

// ── theme engine parity ────────────────────────────────────────────────────
const rootStyle = window.document.documentElement.getAttribute("style") || "";
check("theme engine wrote CSS custom properties", /--primary/.test(rootStyle), rootStyle.slice(0, 120));
check("font stack applied by shared themes.js", /--font-body/.test(rootStyle));
check("ui-font-ready set (first-paint font bootstrap ran)",
  window.document.documentElement.classList.contains("ui-font-ready"));

const label = `${route}${japaneseMode ? " +ja" : ""}${bossLayout ? " +boss" : ""}`;
console.log(`\nSolid parity [${label}]: ${checks.length - failures.length}/${checks.length} checks passed\n`);
if (failures.length) {
  console.error(`FAILED (${label}):`);
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
clearTimeout(watchdog);
console.log(`Route ${label} renders at parity with the React source.\n`);
// jsdom keeps timers and observers alive, so exit explicitly rather than
// waiting for the event loop to drain (it never will).
process.exit(0);
