const STORAGE_KEY = "mabis_animations_disabled";
export const MOTION_EVENT = "mabis-motion-change";

export function animationsDisabled() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function applyAnimationPreference(disabled = animationsDisabled()) {
  document.documentElement.classList.toggle("animations-disabled", disabled);
  document.body.classList.toggle("animations-disabled", disabled);
}

export function setAnimationsDisabled(disabled) {
  try {
    localStorage.setItem(STORAGE_KEY, String(disabled));
  } catch {
    /* storage blocked — preference still applies for this session */
  }
  applyAnimationPreference(disabled);
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: disabled }));
}