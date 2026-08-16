export const SECTION_DESCRIPTIONS_STORAGE_KEY = "mabis_section_descriptions_enabled";
export const SECTION_DESCRIPTIONS_EVENT = "mabis-section-descriptions-change";

/*
 * The explanatory line under each Home section heading.
 *
 * Default OFF. The headings already name the section, so for anyone who knows
 * the app the descriptions are noise between them and the widget. They stay
 * available for new members and for the Japanese companion text, which is why
 * this is a preference rather than a deletion.
 *
 * Stored under a "mabis" key so prefs_sync mirrors it onto the account for
 * free, and applied as a class on <html> so the CSS in index.css can hide the
 * lines before first paint — gating in the component would show them for a
 * frame and then rip them out, which is worse than either state.
 */
export function sectionDescriptionsEnabled() {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(SECTION_DESCRIPTIONS_STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function applySectionDescriptionsPreference(enabled = sectionDescriptionsEnabled()) {
  if (typeof document === "undefined") return;
  document.documentElement.classList.toggle("section-descriptions-shown", Boolean(enabled));
}

export function setSectionDescriptionsEnabled(enabled) {
  const normalized = Boolean(enabled);
  try {
    localStorage.setItem(SECTION_DESCRIPTIONS_STORAGE_KEY, String(normalized));
  } catch {
    /* storage blocked: keep the preference for this session */
  }
  applySectionDescriptionsPreference(normalized);
  window.dispatchEvent(new CustomEvent(SECTION_DESCRIPTIONS_EVENT, { detail: normalized }));
}
