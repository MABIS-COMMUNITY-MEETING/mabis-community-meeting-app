/*
 * First-paint theme replay, without the theme catalogue.
 *
 * The problem this solves: applying one theme required importing
 * src/lib/themes.js, which drags in the whole catalogue plus the pride, GMK and
 * BFDI palettes and the contrast maths — roughly 117 KB of source — into the
 * boot chunk. All of that ran to set a few dozen CSS custom properties for the
 * single theme the user already had. On a slow machine that is parse and
 * execute time spent before anything is on screen.
 *
 * What applyTheme()/applyFont() actually produce is a style attribute on <html>
 * and a handful of classes on <body>. That output is small, so it is snapshotted
 * verbatim on every apply and replayed at boot. Replaying needs no catalogue and
 * no colour maths.
 *
 * The snapshot is a cache, never the source of truth. solid/index.html carries
 * a minimal blocking replay of the same validated snapshot so its critical
 * loading surface gets saved custom colors before the first paint. This module
 * replays again once body exists, then the caller loads the real theme module
 * after first paint to repair snapshots written by an older build.
 */

const SNAPSHOT_KEY = "mabis-theme-snapshot-v1";

/* Classes applyTheme()/applyFont() own on <body>. Anything not in this list is
   left alone, so replaying cannot clobber classes another module set. */
const OWNED_BODY_CLASSES = ["pride-active", "theme-is-dark", "mabis-unrestricted-document-colors"];

/**
 * The stored theme key, without importing the catalogue.
 *
 * themes.js exports getStoredTheme() too, but reaching for it costs the entire
 * catalogue — which is how one decorative background layer kept 117 KB of
 * palettes in the boot chunk. Anything that only needs the *key* uses this.
 */
export function getStoredThemeKey() {
  try {
    return localStorage.getItem("mabis-theme") || "default";
  } catch {
    return "default";
  }
}

function readSnapshot() {
  try {
    return JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || "null");
  } catch {
    return null;
  }
}

/**
 * Record what the real theme/font modules just applied.
 * Called at the end of applyTheme() and applyFont().
 */
export function saveThemeSnapshot(themeKey, fontKey) {
  if (typeof document === "undefined") return;
  try {
    const body = document.body;
    const previous = readSnapshot() || {};
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify({
      // The whole style attribute, so no property can be missed by an
      // out-of-date allow-list.
      style: document.documentElement.getAttribute("style") || "",
      bodyClasses: OWNED_BODY_CLASSES.filter((c) => body?.classList.contains(c)),
      // The app-authored body theme class, tracked by themes.js itself.
      themeClass: body?.dataset?.mabisThemeClass || "",
      themeKey: themeKey ?? previous.themeKey ?? "",
      fontKey: fontKey ?? previous.fontKey ?? "",
    }));
  } catch {
    /* storage blocked: the app still works, it just boots the slow way */
  }
}

/**
 * Replay the snapshot if it matches the stored preferences.
 *
 * Returns true when the page is now painted with the right theme and the
 * catalogue import can be deferred past first paint.
 */
export function applyThemeSnapshot() {
  if (typeof document === "undefined") return false;

  let storedTheme;
  let storedFont;
  try {
    storedTheme = localStorage.getItem("mabis-theme") || "default";
    storedFont = localStorage.getItem("mabis-font") || "";
  } catch {
    return false;
  }

  const snapshot = readSnapshot();
  if (!snapshot?.style) return false;
  // A snapshot for a different theme or font is not usable. Falling through to
  // the real modules is correct and only costs the boot we used to always pay.
  if (snapshot.themeKey !== storedTheme) return false;
  if (snapshot.fontKey !== storedFont) return false;

  const root = document.documentElement;
  root.setAttribute("style", snapshot.style);

  const body = document.body;
  if (body) {
    const wanted = new Set(snapshot.bodyClasses || []);
    for (const name of OWNED_BODY_CLASSES) body.classList.toggle(name, wanted.has(name));
    if (snapshot.themeClass) {
      body.classList.add(snapshot.themeClass);
      body.dataset.mabisThemeClass = snapshot.themeClass;
    }
  }
  return true;
}
