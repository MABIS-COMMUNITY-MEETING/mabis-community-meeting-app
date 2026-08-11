import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/AuthContext";

const HEARTBEAT_MS = 20000;
const ACTIVE_WINDOW_MS = 45000;

// Writes a heartbeat for the signed-in user so others can see they're online.
export function usePresenceHeartbeat() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.email) return;
    const email = user.email.toLowerCase();
    const upsert = async () => {
      try {
        const existing = await base44.entities.Presence.filter({ user_email: email });
        const now = new Date().toISOString();
        if (existing.length > 0) {
          await base44.entities.Presence.update(existing[0].id, { last_seen: now, user_name: user.full_name || "" });
        } else {
          await base44.entities.Presence.create({ user_email: email, user_name: user.full_name || "", last_seen: now });
        }
      } catch { /* ignore */ }
    };
    upsert();
    const interval = setInterval(upsert, HEARTBEAT_MS);
    const markOffline = () => {
      base44.entities.Presence.filter({ user_email: email }).then(r => {
        if (r[0]) base44.entities.Presence.update(r[0].id, { last_seen: new Date(Date.now() - 120000).toISOString() });
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", markOffline);
    return () => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    };
  }, [user?.email, user?.full_name]);
}

// Returns a Set of lowercased emails currently considered active on the app.
export function useActivePresence() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { data: presence = [] } = useQuery({
    queryKey: ["presence"],
    queryFn: () => base44.entities.Presence.list("-last_seen", 200),
    refetchInterval: 15000,
  });
  useEffect(() => {
    const unsub = base44.entities.Presence.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["presence"] });
    });
    return unsub;
  }, [queryClient]);
  const active = new Set();
  const now = Date.now();
  presence.forEach(p => {
    if (p.last_seen && now - new Date(p.last_seen).getTime() < ACTIVE_WINDOW_MS) {
      active.add((p.user_email || "").toLowerCase());
    }
  });
  // The signed-in user's own heartbeat is running, so always show themselves as active.
  if (user?.email) active.add(user.email.toLowerCase());
  return active;
}