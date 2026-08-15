import { createSignal, For, Show } from "solid-js";
import { Portal } from "solid-js/web";

/*
 * Minimal toast store.
 *
 * The React build uses the Radix-based shadcn toaster. Radix has no Solid
 * port, and this app only ever needs "tell the user a write failed" — so
 * rather than pull in a component library for one use case, this is a signal
 * plus a portal. Same visual language (theme tokens, tech-label, hard edges),
 * a fraction of the weight, and no focus-trap machinery for something that
 * never takes focus.
 */

const [toasts, setToasts] = createSignal([]);
let nextId = 1;

export function toast({ title, description, variant = "default", duration = 6000 }) {
  const id = nextId++;
  setToasts((list) => [...list, { id, title, description, variant }]);
  if (duration > 0) setTimeout(() => dismiss(id), duration);
  return id;
}

export function dismiss(id) {
  setToasts((list) => list.filter((t) => t.id !== id));
}

export function Toaster() {
  return (
    <Portal>
      <div
        class="pointer-events-none fixed bottom-4 right-4 z-[200] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
        role="region"
        aria-label="Notifications"
      >
        <For each={toasts()}>
          {(t) => (
            <div
              role="status"
              aria-live="polite"
              class={`pointer-events-auto border bg-card p-3 shadow-lg ${
                t.variant === "destructive" ? "border-destructive/50" : "border-border"
              }`}
            >
              <div class="flex items-start gap-3">
                <div class="min-w-0 flex-1">
                  <Show when={t.title}>
                    <p class={`tech-label ${t.variant === "destructive" ? "text-destructive" : "text-foreground"}`}>
                      {t.title}
                    </p>
                  </Show>
                  <Show when={t.description}>
                    <p class="mt-1 text-xs leading-relaxed text-muted-foreground">{t.description}</p>
                  </Show>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  aria-label="Dismiss"
                  class="shrink-0 px-1 text-muted-foreground transition-colors hover:text-foreground"
                >
                  ✕
                </button>
              </div>
            </div>
          )}
        </For>
      </div>
    </Portal>
  );
}
