const STORAGE_KEY = "mabis_custom_cursor_enabled";
export const CURSOR_EVENT = "mabis-cursor-change";

export function customCursorEnabled() {
    try {
        return localStorage.getItem(STORAGE_KEY) !== "false";
    } catch {
        return true;
    }
}

export function applyCursorPreference(enabled = customCursorEnabled()) {
    const disabled = !enabled;
    document.documentElement.classList.toggle("custom-cursor-disabled", disabled);
    document.body?.classList.toggle("custom-cursor-disabled", disabled);
    window.dispatchEvent(new CustomEvent(CURSOR_EVENT, { detail: enabled }));
}

export function setCustomCursorEnabled(enabled) {
    try {
        localStorage.setItem(STORAGE_KEY, String(Boolean(enabled)));
    } catch {
        /* storage blocked: keep the preference for this session */
    }
    applyCursorPreference(Boolean(enabled));
}
