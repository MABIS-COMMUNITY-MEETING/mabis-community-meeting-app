export const HOME_LAYOUT_STORAGE_KEY = "mabis-home-layout";
export const HOME_LAYOUT_EVENT = "mabis-home-layout-change";

/*
 * Which arrangement the Home page uses.
 *
 *   "simple"  the default. One column: a short masthead, the page guide, then
 *             each numbered section with its heading and its widget directly
 *             beneath. Nothing between the reader and the content.
 *
 *   "boss"    the art-directed editorial front page — full-height masthead,
 *             index rail, scrolling type bands, the scale ritual. Still the
 *             house style, now opt-in from Settings.
 *
 * Both layouts render the same ten sections, in the same order, with the same
 * numbering, tokens, type scale and Japanese companion text, and every feature
 * exists in both. What changes is how much page is spent before a widget.
 *
 * Stored under a "mabis" key so prefs_sync mirrors it onto the account for
 * free, and mirrored onto <html> as a class so CSS can react to the choice
 * without a re-render.
 */
export const HOME_LAYOUTS = ["simple", "boss"];
export const DEFAULT_HOME_LAYOUT = "simple";

export function homeLayout() {
  if (typeof window === "undefined") return DEFAULT_HOME_LAYOUT;
  try {
    const stored = localStorage.getItem(HOME_LAYOUT_STORAGE_KEY);
    return HOME_LAYOUTS.includes(stored) ? stored : DEFAULT_HOME_LAYOUT;
  } catch {
    return DEFAULT_HOME_LAYOUT;
  }
}

export function applyHomeLayoutPreference(layout = homeLayout()) {
  if (typeof document === "undefined") return;
  const boss = layout === "boss";
  document.documentElement.classList.toggle("home-layout-boss", boss);
  document.documentElement.classList.toggle("home-layout-simple", !boss);
}

export function setHomeLayout(layout) {
  const normalized = HOME_LAYOUTS.includes(layout) ? layout : DEFAULT_HOME_LAYOUT;
  try {
    localStorage.setItem(HOME_LAYOUT_STORAGE_KEY, normalized);
  } catch {
    /* storage blocked: keep the choice for this session */
  }
  applyHomeLayoutPreference(normalized);
  window.dispatchEvent(new CustomEvent(HOME_LAYOUT_EVENT, { detail: normalized }));
}
