import { Show } from "solid-js";
import { useLocation } from "@solidjs/router";
import { useQuery } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import { ArrowUpRight } from "lucide-solid";

/**
 * 404 — 1:1 port of src/lib/PageNotFound.jsx (lives under pages/ here because
 * it is a route component, not a library helper).
 *
 * framer's opacity fade on the ERROR label becomes the `fade-in` keyframe in
 * solid-motion.css: same 0.5s, but no JS animation runtime on a page whose
 * whole job is to render fast and get out of the way.
 *
 * The user query reuses the ["user"] key the auth layer already populates, so
 * in practice this reads from cache and never hits the network.
 */
export default function NotFound() {
  const location = useLocation();
  const pageName = () => location.pathname.substring(1);

  const authQuery = useQuery(() => ({
    queryKey: ["user"],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return { user, isAuthenticated: true };
      } catch {
        return { user: null, isAuthenticated: false };
      }
    },
  }));

  const showAdminNote = () =>
    authQuery.isFetched &&
    authQuery.data?.isAuthenticated &&
    authQuery.data?.user?.role === "admin";

  return (
    <div class="relative min-h-screen w-full overflow-hidden bg-bone text-foreground flex items-center justify-center px-6 py-16">
      <div class="grid-bg absolute inset-0 opacity-50" />
      <div class="relative z-10 w-full max-w-xl text-center">
        <div class="fade-in tech-label text-primary mb-6"> ERROR 404</div>
        <h1 class="font-display font-thin tracking-ultra leading-none text-8xl sm:text-[12rem]">
          404
        </h1>
        <div class="mx-auto my-8 h-px w-24 bg-foreground/30" />
        <h2 class="font-display font-light tracking-tight text-2xl mb-3">Page Not Found</h2>
        <p class="text-sm text-muted-foreground max-w-sm mx-auto">
          The coordinate <span class="text-foreground">{pageName()}</span> does not exist within this application.
        </p>

        <Show when={showAdminNote()}>
          <div class="mt-8 border border-foreground/20 bg-card p-4 text-left max-w-md mx-auto">
            <div class="flex items-start gap-3">
              <div class="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary animate-pulse" />
              <div class="space-y-1">
                <p class="tech-label text-foreground"> ADMIN NOTE</p>
                <p class="text-xs text-muted-foreground leading-relaxed">
                  This page may not be implemented yet — request it in the chat.
                </p>
              </div>
            </div>
          </div>
        </Show>

        <button
          onClick={() => { window.location.href = "/"; }}
          data-cursor="HOME"
          class="group mt-10 inline-flex items-center gap-3 border border-foreground/30 bg-card px-6 py-3 tech-label hover:bg-foreground hover:text-bone transition-colors"
        >
          RETURN HOME
          <ArrowUpRight class="h-4 w-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </button>
      </div>
    </div>
  );
}
