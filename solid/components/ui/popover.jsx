import { Popover as KPopover } from "@kobalte/core/popover";
import { splitProps } from "solid-js";

/* Popover — Kobalte-backed replacement for the Radix/shadcn popover. */

export const Popover = KPopover;
export const PopoverTrigger = KPopover.Trigger;
export const PopoverAnchor = KPopover.Anchor;

export function PopoverContent(props) {
  const [local, rest] = splitProps(props, ["class", "align", "gutter"]);
  return (
    <KPopover.Portal>
      <KPopover.Content
        class={`z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${local.class || ""}`}
        {...rest}
      />
    </KPopover.Portal>
  );
}

export default Popover;
