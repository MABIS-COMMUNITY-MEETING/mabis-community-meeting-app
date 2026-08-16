import { createEffect, onCleanup, createMemo } from "solid-js";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import { isHackerMode } from "@/lib/hacker";
import { useAuth } from "~/lib/AuthContext";

const HEARTBEAT_MS = 20000;
const ACTIVE_WINDOW_MS = 45000;

/*
 * Presence — Solid port of src/hooks/usePresence.js.
 *
 * Behaviour is 1:1, including the two details that are easy to lose:
 *   · hacker mode writes no heartbeat, so a ghost session leaves no trace;
 *   · unmount and beforeunload both backdate last_seen, so closing the tab
 *     marks you offline immediately rather than leaving you "active" for the
 *     full 45s window.
 */
export function usePresenceHeartbeat() {
  const auth = useAuth();

  createEffect(() => {
    const user = auth.user();
    if (!user?.email || isHackerMode()) return;
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

    const markOffline = () => {
      base44.entities.Presence.filter({ user_email: email })
        .then((r) => {
          if (r[0]) {
            base44.entities.Presence.update(r[0].id, {
              last_seen: new Date(Date.now() - 120000).toISOString(),
            });
          }
        })
        .catch(() => {});
    };

    upsert();
    const interval = setInterval(upsert, HEARTBEAT_MS);
    window.addEventListener("beforeunload", markOffline);

    onCleanup(() => {
      clearInterval(interval);
      window.removeEventListener("beforeunload", markOffline);
      markOffline();
    });
  });
}

/** Accessor returning a Set of lowercased emails currently active. */
export function useActivePresence() {
  const queryClient = useQueryClient();

  const presenceQuery = useQuery(() => ({
    queryKey: ["presence"],
    queryFn: () => base44.entities.Presence.list("-last_seen", 200),
    refetchInterval: 15000,
  }));

  createEffect(() => {
    const unsub = base44.entities.Presence.subscribe(() => {
      queryClient.invalidateQueries({ queryKey: ["presence"] });
    });
    onCleanup(() => unsub?.());
  });

  return createMemo(() => {
    const active = new Set();
    const now = Date.now();
    for (const p of presenceQuery.data || []) {
      if (!p.user_email || !p.last_seen) continue;
      if (now - new Date(p.last_seen).getTime() <= ACTIVE_WINDOW_MS) {
        active.add(p.user_email.toLowerCase());
      }
    }
    return active;
  });
}
