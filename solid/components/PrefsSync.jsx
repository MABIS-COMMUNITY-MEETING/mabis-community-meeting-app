import { createEffect, on, onCleanup } from "solid-js";
import { useAuth } from "~/lib/AuthContext";
import { canUseCustomColors } from "@/lib/custom-color-access";

/**
 * Keeps theme / colour / font / motion preferences on the user account so they
 * survive reloads and follow the user to another machine.
 * Port of src/components/PrefsSync.jsx.
 *
 * `@/lib/prefs_sync` is imported dynamically, and that is the whole point of
 * this file's shape. It statically imports @/lib/themes, so a static import
 * here — from a component App.jsx mounts on every route — pinned the entire
 * theme catalogue and its palettes into the boot chunk. Nothing in here runs
 * before sign-in anyway, so it has no business on the first-paint path.
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
    // Registered synchronously — after an await it would land outside this
    // effect's tracking scope and never run.
    onCleanup(() => { cancelled = true; ready = false; });

    import("@/lib/prefs_sync").then(({ pullPrefs }) => {
      if (cancelled) return;
      pullPrefs()
        .catch(() => {})
        .finally(() => {
          if (cancelled) return;
          ready = true;
          dropCustomColoursUnlessOwned();
        });
    }).catch(() => {
      /* prefs_sync failed to load, so no pull will happen and nothing will
         overwrite local state. Reconcile anyway — the restriction must not
         depend on an optional chunk arriving. */
      if (!cancelled) dropCustomColoursUnlessOwned();
    });

    /*
     * Custom colours belong to one account (lib/custom-color-access.js).
     * Hiding the controls is not enough on its own: an account that set them
     * before the restriction — or that pulled them from another device a
     * moment ago — would keep colours it now has no way to change or reset.
     *
     * This runs AFTER pullPrefs, deliberately. Clearing first would simply be
     * overwritten by the pull landing a moment later, which is the version of
     * this that looks like it works and does not.
     *
     * themes.js is imported dynamically for the same reason the rest of this
     * file does: a static import drags the whole palette catalogue onto the
     * boot path.
     */
    function dropCustomColoursUnlessOwned() {
      if (canUseCustomColors(auth.user())) return;
      import("@/lib/themes")
        .then(({ getStoredCustomColors, clearCustomColors }) => {
          if (cancelled || !getStoredCustomColors()) return;
          clearCustomColors();
        })
        .catch(() => {});
    }
  }));

  createEffect(on(() => auth.user()?.id, (id) => {
    if (!id) return;
    let disposed = false;
    let detach;
    onCleanup(() => { disposed = true; detach?.(); clearTimeout(timer); });

    import("@/lib/prefs_sync").then(({ pushPrefs, PREF_EVENTS }) => {
      if (disposed) return;
      const onChange = () => {
        if (!ready) return;
        clearTimeout(timer);
        timer = setTimeout(() => { pushPrefs().catch(() => {}); }, 800);
      };
      PREF_EVENTS.forEach((e) => window.addEventListener(e, onChange));
      detach = () => PREF_EVENTS.forEach((e) => window.removeEventListener(e, onChange));
    }).catch(() => {});
  }));

  return null;
}
