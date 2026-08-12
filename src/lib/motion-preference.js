const STORAGE_KEY = "mabis_animations_disabled";
export const MOTION_EVENT = "mabis-motion-change";

export function animationsDisabled() {
  return localStorage.getItem(STORAGE_KEY) === "true";
}

export function applyAnimationPreference(disabled = animationsDisabled()) {
  document.documentElement.classList.toggle("animations-disabled", disabled);
  document.body.classList.toggle("animations-disabled", disabled);
}

export function setAnimationsDisabled(disabled) {
  localStorage.setItem(STORAGE_KEY, String(disabled));
  applyAnimationPreference(disabled);
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: disabled }));
}