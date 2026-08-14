import { useSyncExternalStore } from "react";

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

export function useJapaneseText() {
  return useSyncExternalStore(subscribe, japaneseTextEnabled, () => false);
}
