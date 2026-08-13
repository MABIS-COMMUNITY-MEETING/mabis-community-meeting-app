import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/AuthContext";
import { applyStoredPrefs, pullPrefs, pushPrefs, PREF_EVENTS } from "@/lib/prefs_sync";

/**
 * Keeps theme / colour / font / motion preferences on the user account so they
 * survive reloads and follow the user to another machine.
 */
export default function PrefsSync() {
  const { user } = useAuth();
  const ready = useRef(false);
  const timer = useRef(null);

  useEffect(() => {
    // Apply the device's saved font before any account/network round trip so
    // the interface never boots in a stale fallback face.
    applyStoredPrefs();
  }, []);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    pullPrefs()
      .catch(() => {})
      .finally(() => { if (!cancelled) ready.current = true; });
    return () => { cancelled = true; ready.current = false; };
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    const onChange = () => {
      if (!ready.current) return;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => { pushPrefs().catch(() => {}); }, 800);
    };
    PREF_EVENTS.forEach(e => window.addEventListener(e, onChange));
    return () => {
      PREF_EVENTS.forEach(e => window.removeEventListener(e, onChange));
      clearTimeout(timer.current);
    };
  }, [user?.id]);

  return null;
}