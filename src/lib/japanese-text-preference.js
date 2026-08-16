export const JAPANESE_TEXT_STORAGE_KEY = "mabis-japanese-text-enabled";
export const JAPANESE_TEXT_UPDATED_AT_KEY = "mabis-japanese-text-updated-at";
export const JAPANESE_TEXT_EVENT = "japaneseTextChanged";

export function japaneseTextEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(JAPANESE_TEXT_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function applyJapaneseTextPreference() {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("japanese-text-enabled", japaneseTextEnabled());
}

export function setJapaneseTextEnabled(enabled) {
  const normalized = Boolean(enabled);
  try {
    localStorage.setItem(JAPANESE_TEXT_STORAGE_KEY, String(normalized));
    localStorage.setItem(JAPANESE_TEXT_UPDATED_AT_KEY, String(Date.now()));
  } catch {
    return;
  }
  applyJapaneseTextPreference();
  window.dispatchEvent(new CustomEvent(JAPANESE_TEXT_EVENT, { detail: { enabled: normalized } }));
}

function subscribe(listener) {
  if (typeof window === "undefined") return () => {};
  const update = () => {
    applyJapaneseTextPreference();
    listener();
  };
  window.addEventListener(JAPANESE_TEXT_EVENT, update);
  window.addEventListener("storage", update);
  return () => {
    window.removeEventListener(JAPANESE_TEXT_EVENT, update);
    window.removeEventListener("storage", update);
  };
}

/*
 * The React hook that used to live here is gone with the React UI. Solid reads
 * this preference through useJapaneseText() in solid/lib/motion.js, which wraps
 * the same subscribe/japaneseTextEnabled pair in a signal.
 *
 * Removing it matters beyond tidiness: this module is imported at boot, so its
 * `import { useSyncExternalStore } from "react"` was pulling React itself into
 * the shipped entry chunk of an app that no longer uses React.
 */

