import { Dialog as KDialog } from "@kobalte/core/dialog";
import { X } from "lucide-solid";
import { splitProps } from "solid-js";

/*
 * Dialog — Kobalte-backed replacement for the Radix/shadcn dialog.
 *
 * Kobalte marks open state with `data-expanded` / `data-closed` rather than
 * Radix's `data-state=open|closed`, so the animate-in/out classes are
 * rewritten against those attributes. Visual result is identical to React.
 */

export const Dialog = KDialog;
export const DialogTrigger = KDialog.Trigger;
export const DialogClose = KDialog.CloseButton;

export function DialogPortal(props) {
  return <KDialog.Portal {...props} />;
}

export function DialogOverlay(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <KDialog.Overlay
      class={`fixed inset-0 z-50 bg-black/80 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 ${local.class || ""}`}
      {...rest}
    />
  );
}

export function DialogContent(props) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <DialogPortal>
      <DialogOverlay />
      <KDialog.Content
        class={`fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[closed]:slide-out-to-left-1/2 data-[closed]:slide-out-to-top-[48%] data-[expanded]:slide-in-from-left-1/2 data-[expanded]:slide-in-from-top-[48%] sm:rounded-lg ${local.class || ""}`}
        {...rest}
      >
        {local.children}
        <KDialog.CloseButton class="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X class="h-4 w-4" />
          <span class="sr-only">Close</span>
        </KDialog.CloseButton>
      </KDialog.Content>
    </DialogPortal>
  );
}

export function DialogHeader(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={`flex flex-col space-y-1.5 text-center sm:text-left ${local.class || ""}`} {...rest} />;
}

export function DialogFooter(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return <div class={`flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2 ${local.class || ""}`} {...rest} />;
}

export function DialogTitle(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return <KDialog.Title class={`text-lg font-semibold leading-none tracking-tight ${local.class || ""}`} {...rest} />;
}

export function DialogDescription(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return <KDialog.Description class={`text-sm text-muted-foreground ${local.class || ""}`} {...rest} />;
}

export default Dialog;
