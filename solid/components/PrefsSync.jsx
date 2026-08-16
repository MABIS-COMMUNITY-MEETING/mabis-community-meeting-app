import { createEffect, on, onCleanup } from "solid-js";
import { useAuth } from "~/lib/AuthContext";
import { pullPrefs, pushPrefs, PREF_EVENTS } from "@/lib/prefs_sync";

/**
 * Keeps theme / colour / font / motion preferences on the user account so they
 * survive reloads and follow the user to another machine.
 * 1:1 port of src/components/PrefsSync.jsx.
 *
 * `ready` gates the push side: without it, the pull that runs on sign-in fires
 * the very preference events this listens for, and the account would be
 * immediately overwritten with whatever was on this device.
 */
export default function PrefsSync() {
  const auth = useAuth();
  let ready = false;
  let timer;

  // Keyed on the user id, matching React's [user?.id] dependency: switching
  // account must re-pull, but an unrelated user-object update must not.
  createEffect(on(() => auth.user()?.id, (id) => {
    if (!id) return;
    let cancelled = false;
    pullPrefs()
      .catch(() => {})
      .finally(() => { if (!cancelled) ready = true; });
    onCleanup(() => { cancelled = true; ready = false; });
  }));

  createEffect(on(() => auth.user()?.id, (id) => {
    if (!id) return;
    const onChange = () => {
      if (!ready) return;
      clearTimeout(timer);
      timer = setTimeout(() => { pushPrefs().catch(() => {}); }, 800);
    };
    PREF_EVENTS.forEach((e) => window.addEventListener(e, onChange));
    onCleanup(() => {
      PREF_EVENTS.forEach((e) => window.removeEventListener(e, onChange));
      clearTimeout(timer);
    });
  }));

  return null;
}
