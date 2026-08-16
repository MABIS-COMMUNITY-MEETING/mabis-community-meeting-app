/**
 * Solid migration parity check.
 *
 * A green `vite build` only proves the Solid port COMPILES. This mounts the
 * real built bundle in a DOM and asserts the rendered output against the React
 * source of truth, which is what actually catches a broken port: a component
 * that throws on mount, children rendered once instead of twice, a Tailwind
 * transform silently cancelled by an inline style, or a dropped class.
 *
 * Run: node scripts/check-solid-parity.mjs [route] [ja]   (default "/")
 *
 * Passing `ja` as the second argument flips the Japanese-companion preference
 * on before the bundle boots, which exercises the auto-translation scanner.
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
const japaneseMode = process.argv[3] === "ja";
const failures = [];
const checks = [];

function check(name, condition, detail = "") {
  checks.push(name);
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const html = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const entry = fs.readdirSync(path.join(dist, "assets")).find((f) => /^index-.*\.js$/.test(f));
if (!entry) {
  console.error("No Solid entry bundle found. Build first.");
  process.exit(1);
}

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
  check("home masthead rendered", text.includes("MABIS"));

  // MabisAIAssistant: lazy, inside IdleMount, so it appears only after the idle
  // callback fires and its chunk resolves.
  const fab = root && root.querySelector('button[title="MABIS Omni AI Assistant"]');
  check("assistant FAB mounted after idle", !!fab,
    "IdleMount never fired, or the lazy chunk failed to resolve");
  check("assistant panel closed on first paint",
    !text.includes("How can I help?"));

  if (fab) {
    fab.dispatchEvent(new window.MouseEvent("click", { bubbles: true }));
    await new Promise((r) => setTimeout(r, 150));
    const t2 = root.textContent.replace(/\s+/g, " ");
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
  check("CJK stylesheet requested once CJK text exists",
    !!window.document.getElementById("maple-mono-cjk-styles"));
  // Manual <JapaneseText> output must not be re-translated by the scanner.
  const skipped = root ? root.querySelectorAll("[data-ja-skip][data-ja-companion]") : [];
  check("scanner did not double-translate manual JapaneseText spans", skipped.length === 0,
    `${skipped.length} element(s) carry both data-ja-skip and a companion`);
} else {
  check("no Japanese annotations when the preference is off",
    !root || root.querySelectorAll("[data-ja-companion]").length === 0);
}

// ── theme engine parity ────────────────────────────────────────────────────
const rootStyle = window.document.documentElement.getAttribute("style") || "";
check("theme engine wrote CSS custom properties", /--primary/.test(rootStyle), rootStyle.slice(0, 120));
check("font stack applied by shared themes.js", /--font-body/.test(rootStyle));
check("ui-font-ready set (first-paint font bootstrap ran)",
  window.document.documentElement.classList.contains("ui-font-ready"));

const label = `${route}${japaneseMode ? " +ja" : ""}`;
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
