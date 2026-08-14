export const MOTION_STORAGE_KEY = "mabis_animations_enabled";
export const MOTION_UPDATED_AT_KEY = "mabis_animations_updated_at";
export const LEGACY_MOTION_STORAGE_KEY = "mabis_animations_disabled";
export const MOTION_EVENT = "mabis-motion-change";

/**
 * Migrate the old negative preference to the new positive default. The legacy
 * value could be downloaded after a user enabled motion and flip it back off.
 */
export function normalizeAnimationPreference() {
  try {
    let changed = false;
    if (localStorage.getItem(MOTION_STORAGE_KEY) === null) {
      localStorage.setItem(MOTION_STORAGE_KEY, "true");
      changed = true;
    }
    if (localStorage.getItem(LEGACY_MOTION_STORAGE_KEY) !== null) {
      localStorage.removeItem(LEGACY_MOTION_STORAGE_KEY);
      changed = true;
    }
    return changed;
  } catch {
    return false;
  }
}

export function animationsDisabled() {
  try {
    normalizeAnimationPreference();
    return localStorage.getItem(MOTION_STORAGE_KEY) === "false";
  } catch {
    return false;
  }
}

export function applyAnimationPreference(disabled = animationsDisabled()) {
  document.documentElement.classList.toggle("animations-disabled", disabled);
  document.body.classList.toggle("animations-disabled", disabled);
}

export function setAnimationsDisabled(disabled) {
  const normalized = Boolean(disabled);
  try {
    localStorage.setItem(MOTION_STORAGE_KEY, String(!normalized));
    localStorage.setItem(MOTION_UPDATED_AT_KEY, String(Date.now()));
    localStorage.removeItem(LEGACY_MOTION_STORAGE_KEY);
  } catch {
    /* storage blocked — preference still applies for this session */
  }
  applyAnimationPreference(normalized);
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: normalized }));
}