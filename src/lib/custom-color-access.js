/**
 * Who may use the custom colour tools.
 *
 * The theme catalogue stays open to everyone. What is restricted here is the
 * "Make your own colors" surface and the saved palettes built with it —
 * arbitrary primary/secondary pairs, which sit outside the vetted palettes and
 * can be driven to combinations the contrast-safety maths cannot rescue.
 *
 * ONE predicate, in src/lib with the other preferences, because this has to be
 * asked in three unrelated places — the switcher UI, the boot-time replay, and
 * the account sync. Three inlined email comparisons would drift, and the one
 * that drifted would be the one still showing the controls.
 *
 * SCOPE, stated plainly: this is a UI availability rule, not a security
 * boundary. Custom colours are CSS custom properties in one browser's
 * localStorage; they affect nothing but that reader's own screen, are never
 * trusted by the backend, and anyone determined can set them from a console.
 * Gating the UI is the appropriate weight for a personal display preference —
 * do not mistake it for an authorisation check, and do not put anything behind
 * this that actually needs one.
 */

export const CUSTOM_COLOR_OWNER = "boss@montessoribkk.com";

/*
 * Second path to the same surface: a local, per-browser unlock instead of an
 * account check. Not a fallback for the owner account — an intentional
 * second door. "Do not put anything behind this that actually needs
 * [a security boundary]" above is exactly why a tap-gesture unlock is fair
 * game here where it would not be for anything that mattered: worst case
 * someone finds the custom color tools a little early.
 *
 * localStorage rather than a signal because it has to survive a reload —
 * the whole point of a discovered secret is that it stays discovered.
 */
const UNLOCK_KEY = "mabis-custom-colors-unlocked";
export const CUSTOM_COLORS_UNLOCKED_EVENT = "customColorsUnlocked";

export function isCustomColorsUnlockedLocally() {
  try {
    return localStorage.getItem(UNLOCK_KEY) === "true";
  } catch {
    return false;
  }
}

/** Flips the local unlock on and tells any mounted ThemeSwitcher right away —
 *  localStorage writes are not reactive, so without the event a switcher
 *  already open would not notice until its next mount. */
export function unlockCustomColorsLocally() {
  try {
    localStorage.setItem(UNLOCK_KEY, "true");
  } catch {
    // Private browsing / storage disabled: the unlock just does not persist
    // past this page load, same graceful degradation as everything else that
    // touches localStorage in this app.
  }
  window.dispatchEvent(new Event(CUSTOM_COLORS_UNLOCKED_EVENT));
}

/**
 * @param user the signed-in user, or null/undefined while auth is resolving
 * @returns true for the owning account, OR for anyone who has found the local
 *          unlock gesture (see boss.jsx's colophon logo)
 *
 * Unknown user resolves to false on the account path, same as before — the
 * local-unlock path does not depend on auth at all, so it is unaffected by
 * that probe either way.
 */
export function canUseCustomColors(user) {
  const email = user?.email;
  const isOwner = typeof email === "string" && email.trim().toLowerCase() === CUSTOM_COLOR_OWNER;
  return isOwner || isCustomColorsUnlockedLocally();
}
