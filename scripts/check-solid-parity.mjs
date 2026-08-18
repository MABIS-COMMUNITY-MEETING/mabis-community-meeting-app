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

/*
 * Let chunk stylesheets resolve.
 *
 * jsdom does not fetch <link rel="stylesheet">, so it never fires their load
 * event. Vite's __vitePreload awaits exactly that event before resolving a
 * dynamic import whose chunk carries CSS — so any lazily-loaded component
 * with its own stylesheet hangs forever here and its whole route reads as
 * "never mounted", which is indistinguishable from a genuinely broken port.
 *
 * That stopped being a theoretical gap when glass.css moved into the boss
 * chunk: the entire boss layout became unverifiable, 62 assertions of
 * coverage lost to a harness limitation rather than to anything wrong.
 *
 * Firing the event is safe because nothing here reads the stylesheet's
 * CONTENT through the DOM — the rules are asserted against `builtCss`, read
 * off disk. It only unblocks the import.
 *
 * Quill is the documented exception. DocsEditor pulls quill.snow.css, and
 * when that import resolves Quill mounts and never settles (see the KNOWN GAP
 * note above); the run then dies on the watchdog instead of reporting. So
 * that one sheet stays unresolved, which leaves DocsEditor exactly as pending
 * as it has always been — no coverage lost relative to before.
 */
const stylesheetLoadFixup = new window.MutationObserver((records) => {
  for (const record of records) {
    for (const node of record.addedNodes) {
      if (node.tagName !== "LINK" || node.rel !== "stylesheet") continue;
      if (/quill/i.test(node.href || "")) continue;
      setTimeout(() => node.dispatchEvent(new window.Event("load")), 0);
    }
  }
});
stylesheetLoadFixup.observe(window.document.head, { childList: true, subtree: true });

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

/*
 * Which declaration actually WINS for a property on a given element.
 *
 * jsdom does not compute the cascade, and asserting on markup is not enough:
 * the default layout's square corners were caused by
 *
 *     .bg-card.rounded-2xl.shadow-sm { border-radius: 2px }
 *
 * in index.css quietly outranking the element's own .rounded-2xl — (0,3,0)
 * against (0,1,0), no !important involved. Every check that looked at classes
 * or at the presence of a rule passed while the page rendered square. So this
 * resolves the winner the way a browser would: collect matching rules, order
 * by importance, then specificity, then source order.
 */
function splitSelectorList(list) {
  // Top-level commas only — :is(a, b, c) is ONE selector, not three.
  const out = [];
  let depth = 0;
  let buf = "";
  for (const ch of list) {
    if (ch === "(" || ch === "[") depth += 1;
    else if (ch === ")" || ch === "]") depth -= 1;
    if (ch === "," && depth === 0) { out.push(buf); buf = ""; continue; }
    buf += ch;
  }
  if (buf.trim()) out.push(buf);
  return out;
}

function selectorSpecificity(selector) {
  const s = selector.replace(/\\./g, "");
  const ids = (s.match(/#[\w-]+/g) || []).length;
  const classes = (s.match(/\.[\w-]+|\[[^\]]+\]|:(?!:)(?!not|is|where)[\w-]+(\([^)]*\))?/g) || []).length;
  const elements = (s.match(/(^|[\s>+~(])[a-z][\w-]*/gi) || []).length;
  return ids * 10000 + classes * 100 + elements;
}

function winningDeclaration(element, property) {
  const candidates = [];
  const blocks = /(@media[^{]+\{)|(\})|([^{}]+)\{([^{}]*)\}/g;
  let media = null;
  let depth = 0;
  let order = 0;
  let block;
  while ((block = blocks.exec(builtCss))) {
    if (block[1]) { media = block[1].slice(0, -1).trim(); depth += 1; continue; }
    if (block[2]) { if (depth > 0) { depth -= 1; if (!depth) media = null; } continue; }
    if (media) continue;                       // desktop only; phone widths differ by design
    const body = block[4];
    if (!body.includes(`${property}:`)) continue;
    for (const selector of splitSelectorList(block[3])) {
      const trimmed = selector.trim();
      if (!trimmed || /:(hover|focus|active)\b/.test(trimmed)) continue;
      let hit = false;
      try { hit = element.matches(trimmed.replace(/::(before|after)\b/g, "").trim()); } catch { hit = false; }
      if (!hit) continue;
      const declaration = (body.match(new RegExp(`${property}:[^;]*`, "g")) || []).join("; ");
      candidates.push({
        declaration,
        important: new RegExp(`${property}:[^;]*!important`).test(body),
        specificity: selectorSpecificity(trimmed),
        order: order++,
      });
    }
  }
  candidates.sort((a, b) => (a.important !== b.important
    ? (a.important ? 1 : -1)
    : (a.specificity !== b.specificity ? a.specificity - b.specificity : a.order - b.order)));
  return candidates.length ? candidates[candidates.length - 1].declaration : "";
}

// ── route-specific parity ──────────────────────────────────────────────────
// Only the landing route asserts the Splash slice; the auth and fallback
// routes assert their own source of truth. Everything below the divider is
// shared shell behaviour and runs for every route.
if (route === "/login") {
  // src/pages/Login.jsx + src/components/AuthLayout.jsx
  check("sign-in headline present", text.includes("Sign in"));
  check("Japanese title present", text.includes("サインイン"));
  check("subtitle present", text.includes("Continue with your MABIS Google account"));
  /*
   * The CTA's casing is style-dependent — editorial sets it in tech-label
   * caps, Summer in sentence case — so match case-insensitively. What must
   * never vary is that the button exists: the contract is that /login exposes
   * exactly one Continue with Google control.
   */
  check("Google CTA present", /continue with google/i.test(text));

  if (bossLayout) {
    check("AuthLayout IDENTITY label present", text.includes("IDENTITY"));
    check("AuthLayout AUTH label present", text.includes("AUTH"));
    check("AuthLayout N° 00 present", text.includes("N° 00"));
    check("AuthLayout background word present", text.includes("MABIS"));
    check("auth entrance keyframe applied (not framer)", html2.includes("auth-rise"));
  } else {
    /*
     * Summer style drops the editorial furniture entirely (Novesce, Aug 2026).
     * Asserting its ABSENCE is the point: a regression that reinstated the
     * masthead here would otherwise pass every remaining check on this page.
     */
    check("Summer auth shell rendered", !!(root && root.querySelector(".summer-page")));
    check("editorial N° 00 meta absent in Summer style", !text.includes("N° 00"));
    check("editorial IDENTITY caption absent in Summer style", !text.includes("IDENTITY"));
    check("editorial auth entrance not used in Summer style", !html2.includes("auth-rise"));
  }
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
    !/continue with google/i.test(text),
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

  // Header controls: the avatar, first name and sign-out sit beside the
  // theme/settings buttons in both layouts. The boss bar upper-cases them as
  // technical labels; the default bar uses the original site's sentence case.
  const signOut = bossLayout ? "SIGN OUT" : "Sign Out";
  const firstName = bossLayout ? "PARITY" : "Parity";
  check("sign-out control rendered", textNow().includes(signOut));
  check("signed-in user's first name shown", textNow().includes(firstName),
    `expected the seeded user's first name as "${firstName}"`);
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

    /* The assertion that would have caught the original bug: not "is the class
       there" but "which declaration wins". */
    const card = root.querySelector(".mabis-widget");
    check("widget card resolves to a round corner",
      card && /1rem/.test(winningDeclaration(card, "border-radius")),
      card ? `winner: ${winningDeclaration(card, "border-radius")}` : "no widget rendered");

    /*
     * The point of this rule is that the radius stays a LIVE custom-property
     * reference. Tailwind v4 bakes `borderRadius.lg: 'var(--radius)'` from the
     * JS config into a fixed px value, which freezes every theme that
     * redefines --radius; index.css works around that by re-declaring the
     * three radius keys in @theme.
     *
     * That workaround adds one hop — the utility now emits var(--radius-lg),
     * which @theme defines as var(--radius) — so accept either spelling and
     * verify the hop actually resolves. A baked "16px" still fails, which is
     * the regression this exists to catch.
     */
    const innerControl = root.querySelector(".mabis-widget .rounded-lg");
    const innerRadius = innerControl ? winningDeclaration(innerControl, "border-radius") : "";
    const radiusHopResolves = /--radius-lg: *var\(--radius\)/.test(builtCss);
    check("inner controls resolve to the original radius token",
      innerControl
      && (/var\(--radius\)/.test(innerRadius)
        || (/var\(--radius-lg\)/.test(innerRadius) && radiusHopResolves)),
      innerControl
        ? `winner: ${innerRadius}${radiusHopResolves ? "" : " (and --radius-lg is not defined as var(--radius))"}`
        : "none found");
    check("the default layout redefines --radius to the original 0.75rem",
      /\.summer-home\{[^}]*--radius: *\.75rem/.test(builtCss),
      "rounded-lg/md/sm map onto --radius, which the editorial system sets to 2px");
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
} else if (route === "/" && bossLayout) {
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
} else if (route === "/") {
  /*
   * Summer style's splash (the default). A port of the ORIGINAL MABIS landing
   * — app 6a7f1d91128253fcdbf4f5a2 — not of the editorial one above.
   *
   * The performance assertions are the point of this block. The original drove
   * 216 elements from framer-motion on repeat:Infinity, each carrying a
   * blurred box-shadow, and that is what made it unusable on a phone. The port
   * animates transform and opacity from one shared CSS keyframe instead. A
   * regression back to per-element JS animation, or to box-shadow glows, would
   * look identical in a screenshot and would be invisible to every other check
   * in this file — so it is pinned directly.
   */
  check("title present", text.includes("SECONDARY COMMUNITY") && text.includes("MEETING APP"));
  check("CTA present", /start|log in/i.test(text));
  check("Summer splash field rendered", !!(root && root.querySelector(".summer-splash")));
  check("centre glow rendered", !!(root && root.querySelector(".summer-splash-glow")));

  const motes = root ? [...root.querySelectorAll(".summer-splash-dot")] : [];
  check("motes rendered", motes.length > 0, `found ${motes.length}`);
  check("mote count is bounded well under the original 216",
    motes.length <= 120,
    `found ${motes.length} — the original shipped 216 to every device`);

  check("motes carry no box-shadow (glow is a gradient, not a blur pass)",
    motes.every((m) => !/box-shadow/i.test(m.getAttribute("style") || "")));
  check("motes drive motion through CSS custom properties, not inline transforms",
    motes.every((m) => {
      const s = m.getAttribute("style") || "";
      return s.includes("--dx") && s.includes("--dy") && !/(^|;)\s*transform:/i.test(s);
    }));

  check("editorial splash furniture absent in Summer style",
    !text.includes("N° 02") && !html2.includes("corner-bracket") && !html2.includes("huge-crop"));
  check("no marquee on the Summer splash", !html2.includes("MABIS BANGKOK"));
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
/*
 * Inverted deliberately. The shell used to mount a 2px scroll-progress bar
 * here, and the boss layout a right-edge section counter; both redrew
 * themselves on every scroll frame. Scrolling belongs to the browser, so the
 * assertion is now that they stay gone — re-adding either would put a
 * per-frame style write back on every scroll of every route.
 */
check("no scroll-driven chrome in the shell",
  !shellHtml().includes("--palette-gradient"),
  "the scroll-progress bar is back in App.jsx");

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
  /*
   * The auto-scanner only annotates strings that have NO explicit companion.
   * Summer style's splash gives every string one through <JapaneseText>, so an
   * empty result there is the correct outcome rather than a dead observer —
   * and demanding annotations would push future work toward leaving strings
   * untranslated just to satisfy this check.
   *
   * The scanner stays pinned regardless: the /login ja run does carry
   * unannotated strings, so a genuinely broken MutationObserver still fails
   * the suite there.
   */
  check("auto-companion annotated the tree where there was work to do",
    annotated.length > 0 || route === "/",
    "no [data-ja-companion] attributes — the MutationObserver scan never ran");
  check("annotations carry a layout hint",
    [...annotated].every((el) => el.hasAttribute("data-ja-layout")));
  check("annotations are non-empty Japanese",
    [...annotated].every((el) => /[぀-ヿ一-龯]/.test(el.getAttribute("data-ja-companion"))));
  /* However it got there — scanner or explicit prop — Japanese must be on the
     page when the companion is enabled. This is the assertion that matches the
     user-visible promise, and it holds on every route. */
  check("Japanese companion text is on the page", /[぀-ヿ一-龥]/.test(text));
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
