import { createSignal, Show } from "solid-js";
import { Dialog as KDialog } from "@kobalte/core/dialog";
import { Lock, X } from "lucide-solid";
import { DialogPortal, DialogOverlay } from "~/components/ui/dialog";

const getAdminCode = () => localStorage.getItem("mabis_admin_code") || "10260";

/*
 * PasswordModal — Solid port of src/components/PasswordModal.jsx.
 *
 * Kobalte replaces the hand-rolled portal + backdrop-click handler. That
 * matters here more than anywhere else in the app: this dialog is the one
 * gating admin actions, and the React version had no focus trap — Tab moved
 * focus behind the overlay into the page underneath while it was open.
 * Kobalte traps focus, restores it to the trigger on close, and wires Escape.
 *
 * `autofocus` is kept via Kobalte's autoFocus on the input.
 */
export default function PasswordModal(props) {
  const [code, setCode] = createSignal("");
  const [error, setError] = createSignal(false);

  const close = () => {
    setCode("");
    setError(false);
    props.onClose?.();
  };

  const submit = () => {
    if (code() === getAdminCode()) {
      setError(false);
      setCode("");
      props.onSuccess?.();
      close();
    } else {
      setError(true);
    }
  };

  return (
    <KDialog open={props.open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogPortal>
        <DialogOverlay class="mobile-sheet-backdrop z-[100] bg-black/50 backdrop-blur-sm" />
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4" data-native-cursor>
          <KDialog.Content class="mobile-sheet-panel w-full max-w-sm rounded-2xl bg-card p-4 shadow-2xl sm:p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center gap-2">
                <div class="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Lock class="w-4 h-4 text-primary" />
                </div>
                <KDialog.Title class="font-display font-bold text-foreground text-sm">
                  {props.title || "Enter Admin Code"}
                </KDialog.Title>
              </div>
              <KDialog.CloseButton class="text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-muted">
                <X class="w-4 h-4" />
                <span class="sr-only">Close</span>
              </KDialog.CloseButton>
            </div>

            <input
              type="password"
              autofocus
              value={code()}
              onInput={(e) => { setCode(e.currentTarget.value); setError(false); }}
              onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
              placeholder="Enter code..."
              aria-invalid={error()}
              class={`w-full h-11 rounded-xl border-2 bg-background text-foreground placeholder:text-muted-foreground px-4 text-sm font-semibold tracking-widest text-center outline-none transition-colors ${
                error() ? "border-destructive bg-destructive/5" : "border-border focus:border-primary/40"}`}
            />

            <Show when={error()}>
              <p role="alert" class="text-destructive text-xs font-semibold mt-2 text-center">
                Incorrect code, try again.
              </p>
            </Show>

            <div class="flex flex-col gap-2 mt-4">
              <button
                onClick={close}
                class="w-full h-10 rounded-xl border border-border text-muted-foreground text-sm font-bold hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submit}
                class="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </KDialog.Content>
        </div>
      </DialogPortal>
    </KDialog>
  );
}
