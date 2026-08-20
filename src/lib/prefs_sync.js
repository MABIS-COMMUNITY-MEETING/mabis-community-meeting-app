import { base44 } from "@/api/base44Client";
import {
  applyTheme,
  applyCustomColors,
  applyMaterialSeed,
  applyFont,
  getStoredTheme,
  getStoredFont,
  getStoredCustomColors,
  getStoredMaterialSeed,
  getStoredMaterialMode,
  SAVED_THEMES_CHANGED_EVENT,
} from "@/lib/themes";
import {
  applyAnimationPreference,
  LEGACY_MOTION_STORAGE_KEY,
  MOTION_EVENT,
  MOTION_STORAGE_KEY,
  MOTION_UPDATED_AT_KEY,
  normalizeAnimationPreference,
} from "@/lib/motion-preference";
import { applyCursorPreference, CURSOR_EVENT } from "@/lib/cursor-preference";
import {
  applyJapaneseTextPreference,
  JAPANESE_TEXT_EVENT,
  JAPANESE_TEXT_STORAGE_KEY,
  JAPANESE_TEXT_UPDATED_AT_KEY,
} from "@/lib/japanese-text-preference";
import {
  applySectionDescriptionsPreference,
  SECTION_DESCRIPTIONS_EVENT,
} from "@/lib/section-descriptions-preference";
import {
  applyHomeLayoutPreference,
  HOME_LAYOUT_EVENT,
} from "@/lib/layout-preference";

/* Every UI preference the app stores locally lives under a "mabis" key.
   We mirror that whole bag onto the signed-in user so settings follow them
   to any browser or machine. */
const isPrefKey = (k) => k && k.toLowerCase().startsWith("mabis");

export function collectPrefs() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (isPrefKey(k) && k !== LEGACY_MOTION_STORAGE_KEY) out[k] = localStorage.getItem(k);
  }
  return out;
}

export function applyStoredPrefs(user) {
  applyTheme(getStoredTheme(user), { persist: false });
  const materialSeed = getStoredMaterialSeed();
  if (materialSeed) {
    applyMaterialSeed(materialSeed, {
      persist: false,
      dark: getStoredMaterialMode() === "dark",
    });
  } else {
    const custom = getStoredCustomColors();
    if (custom) applyCustomColors(custom.primary, custom.secondary);
  }
  applyFont(getStoredFont());
  const animationPreferenceChanged = normalizeAnimationPreference();
  applyAnimationPreference();
  applyCursorPreference();
  applyJapaneseTextPreference();
  applySectionDescriptionsPreference();
  applyHomeLayoutPreference();
  return animationPreferenceChanged;
}

/** Pull the user's saved preferences down and apply them. */
export async function pullPrefs() {
  const user = await base44.auth.me();
  const remote = user?.ui_prefs;
  let keepLocalFont = false;
  let keepLocalMotion = false;
  let keepLocalJapaneseText = false;

  if (remote && typeof remote === "object") {
    const localFont = localStorage.getItem("mabis-font");
    const localPickerVersion = localStorage.getItem("mabis-font-picker-version");
    const localFontUpdatedAt = Number(localStorage.getItem("mabis-font-updated-at") || 0);
    const remoteFontUpdatedAt = Number(remote["mabis-font-updated-at"] || 0);

    keepLocalFont = Boolean(localFont && localPickerVersion)
      && (localFontUpdatedAt >= remoteFontUpdatedAt || remoteFontUpdatedAt === 0);

    const localMotionUpdatedAt = Number(localStorage.getItem(MOTION_UPDATED_AT_KEY) || 0);
    const remoteMotionUpdatedAt = Number(remote[MOTION_UPDATED_AT_KEY] || 0);
    keepLocalMotion = localMotionUpdatedAt > 0 && localMotionUpdatedAt >= remoteMotionUpdatedAt;

    const localJapaneseUpdatedAt = Number(localStorage.getItem(JAPANESE_TEXT_UPDATED_AT_KEY) || 0);
    const remoteJapaneseUpdatedAt = Number(remote[JAPANESE_TEXT_UPDATED_AT_KEY] || 0);
    keepLocalJapaneseText = localStorage.getItem(JAPANESE_TEXT_STORAGE_KEY) !== null
      && localJapaneseUpdatedAt > 0
      && localJapaneseUpdatedAt >= remoteJapaneseUpdatedAt;

    Object.entries(remote).forEach(([k, v]) => {
      if (!isPrefKey(k) || typeof v !== "string") return;
      if (keepLocalFont && ["mabis-font", "mabis-font-picker-version", "mabis-font-updated-at"].includes(k)) return;
      if (keepLocalMotion && [MOTION_STORAGE_KEY, MOTION_UPDATED_AT_KEY].includes(k)) return;
      if (keepLocalJapaneseText && [JAPANESE_TEXT_STORAGE_KEY, JAPANESE_TEXT_UPDATED_AT_KEY].includes(k)) return;
      localStorage.setItem(k, v);
    });

    /*
     * The account is authoritative for theme IDENTITY.
     *
     * The loop above only ever writes keys the account HAS. A key the account
     * does not have was left untouched, so a theme or a colour pair set once
     * on a device outlived the account forever — there was no value that could
     * be stored centrally to undo it, and no amount of resetting someone's
     * record would put their browser back on the house palette.
     *
     * Clearing the personal theme keys when the account omits them makes the
     * record the single source of truth: getStoredTheme() falls back to
     * "default", while Material seeds and named saved themes cannot leak from
     * another account that previously used the same browser.
     *
     * Deliberately just these theme keys. The rest of the "mabis" bag holds
     * device-local state that was never meant to round-trip — burst-scheduler
     * timings, per-week meeting flags — and deleting those because the account
     * has not seen them would throw away working data to fix a palette.
     */
    for (const key of [
      "mabis-theme",
      "mabis-custom-colors",
      "mabis-material-seed",
      "mabis-material-mode",
      "mabis-saved-themes",
      "mabis-theme-snapshot-v1",
    ]) {
      if (!(key in remote)) localStorage.removeItem(key);
    }
  }

  const animationPreferenceChanged = applyStoredPrefs(user);

  // Repair older account-side preferences with the current device choice.
  if (keepLocalFont || keepLocalMotion || keepLocalJapaneseText || animationPreferenceChanged) {
    await base44.auth.updateMe({ ui_prefs: collectPrefs() });
  }
}

/** Push the current local preferences up to the user record. */
export async function pushPrefs() {
  await base44.auth.updateMe({ ui_prefs: collectPrefs() });
}

export const PREF_EVENTS = [
  "themeChanged",
  SAVED_THEMES_CHANGED_EVENT,
  "fontChanged",
  MOTION_EVENT,
  CURSOR_EVENT,
  JAPANESE_TEXT_EVENT,
  SECTION_DESCRIPTIONS_EVENT,
  HOME_LAYOUT_EVENT,
  "storage",
];