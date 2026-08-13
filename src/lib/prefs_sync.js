import { base44 } from "@/api/base44Client";
import { applyTheme, applyCustomColors, applyFont, getStoredTheme, getStoredFont, getStoredCustomColors } from "@/lib/themes";
import { applyAnimationPreference, MOTION_EVENT } from "@/lib/motion-preference";
import { applyCursorPreference, CURSOR_EVENT } from "@/lib/cursor-preference";

/* Every UI preference the app stores locally lives under a "mabis" key.
   We mirror that whole bag onto the signed-in user so settings follow them
   to any browser or machine. */
const isPrefKey = (k) => k && k.toLowerCase().startsWith("mabis");

export function collectPrefs() {
  const out = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (isPrefKey(k)) out[k] = localStorage.getItem(k);
  }
  return out;
}

export function applyStoredPrefs() {
  applyTheme(getStoredTheme());
  const custom = getStoredCustomColors();
  if (custom) applyCustomColors(custom.primary, custom.secondary);
  applyFont(getStoredFont());
  applyAnimationPreference();
  applyCursorPreference();
}

/** Pull the user's saved preferences down and apply them. */
export async function pullPrefs() {
  const user = await base44.auth.me();
  const remote = user?.ui_prefs;
  let keepLocalFont = false;

  if (remote && typeof remote === "object") {
    const localFont = localStorage.getItem("mabis-font");
    const localPickerVersion = localStorage.getItem("mabis-font-picker-version");
    const localFontUpdatedAt = Number(localStorage.getItem("mabis-font-updated-at") || 0);
    const remoteFontUpdatedAt = Number(remote["mabis-font-updated-at"] || 0);

    keepLocalFont = Boolean(localFont && localPickerVersion)
      && (localFontUpdatedAt >= remoteFontUpdatedAt || remoteFontUpdatedAt === 0);

    Object.entries(remote).forEach(([k, v]) => {
      if (!isPrefKey(k) || typeof v !== "string") return;
      if (keepLocalFont && ["mabis-font", "mabis-font-picker-version", "mabis-font-updated-at"].includes(k)) return;
      localStorage.setItem(k, v);
    });
  }

  applyStoredPrefs();

  // Repair an older account-side font preference with the newer device choice.
  if (keepLocalFont) {
    await base44.auth.updateMe({ ui_prefs: collectPrefs() });
  }
}

/** Push the current local preferences up to the user record. */
export async function pushPrefs() {
  await base44.auth.updateMe({ ui_prefs: collectPrefs() });
}

export const PREF_EVENTS = ["themeChanged", "fontChanged", MOTION_EVENT, CURSOR_EVENT, "storage"];