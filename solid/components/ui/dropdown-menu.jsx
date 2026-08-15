import { DropdownMenu as KDropdownMenu } from "@kobalte/core/dropdown-menu";
import { Check, ChevronRight, Circle } from "lucide-solid";
import { splitProps } from "solid-js";

/*
 * DropdownMenu — Kobalte-backed replacement for the Radix/shadcn dropdown
 * menu. Kobalte uses `data-highlighted` / `data-expanded` in place of Radix's
 * `data-[state]`, otherwise the class strings are copied verbatim.
 */

export const DropdownMenu = KDropdownMenu;
export const DropdownMenuTrigger = KDropdownMenu.Trigger;
export const DropdownMenuGroup = KDropdownMenu.Group;
export const DropdownMenuPortal = KDropdownMenu.Portal;
export const DropdownMenuSub = KDropdownMenu.Sub;
export const DropdownMenuRadioGroup = KDropdownMenu.RadioGroup;

export function DropdownMenuSubTrigger(props) {
  const [local, rest] = splitProps(props, ["class", "inset", "children"]);
  return (
    <KDropdownMenu.SubTrigger
      class={`flex cursor-default gap-2 select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent data-[expanded]:bg-accent [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 ${local.inset ? "pl-8" : ""} ${local.class || ""}`}
      {...rest}
    >
      {local.children}
      <ChevronRight class="ml-auto" />
    </KDropdownMenu.SubTrigger>
  );
}

export function DropdownMenuSubContent(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <KDropdownMenu.SubContent
      class={`z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-lg data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${local.class || ""}`}
      {...rest}
    />
  );
}

export function DropdownMenuContent(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <KDropdownMenu.Portal>
      <KDropdownMenu.Content
        class={`z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md data-[expanded]:animate-in data-[closed]:animate-out data-[closed]:fade-out-0 data-[expanded]:fade-in-0 data-[closed]:zoom-out-95 data-[expanded]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 ${local.class || ""}`}
        {...rest}
      />
    </KDropdownMenu.Portal>
  );
}

export function DropdownMenuItem(props) {
  const [local, rest] = splitProps(props, ["class", "inset"]);
  return (
    <KDropdownMenu.Item
      class={`relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:size-4 [&>svg]:shrink-0 ${local.inset ? "pl-8" : ""} ${local.class || ""}`}
      {...rest}
    />
  );
}

export function DropdownMenuCheckboxItem(props) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <KDropdownMenu.CheckboxItem
      class={`relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${local.class || ""}`}
      {...rest}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <KDropdownMenu.ItemIndicator>
          <Check class="h-4 w-4" />
        </KDropdownMenu.ItemIndicator>
      </span>
      {local.children}
    </KDropdownMenu.CheckboxItem>
  );
}

export function DropdownMenuRadioItem(props) {
  const [local, rest] = splitProps(props, ["class", "children"]);
  return (
    <KDropdownMenu.RadioItem
      class={`relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 ${local.class || ""}`}
      {...rest}
    >
      <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
        <KDropdownMenu.ItemIndicator>
          <Circle class="h-2 w-2 fill-current" />
        </KDropdownMenu.ItemIndicator>
      </span>
      {local.children}
    </KDropdownMenu.RadioItem>
  );
}

export function DropdownMenuLabel(props) {
  const [local, rest] = splitProps(props, ["class", "inset"]);
  return (
    <KDropdownMenu.GroupLabel
      class={`px-2 py-1.5 text-sm font-semibold ${local.inset ? "pl-8" : ""} ${local.class || ""}`}
      {...rest}
    />
  );
}

export function DropdownMenuSeparator(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return <KDropdownMenu.Separator class={`-mx-1 my-1 h-px bg-muted ${local.class || ""}`} {...rest} />;
}

export function DropdownMenuShortcut(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return <span class={`ml-auto text-xs tracking-widest opacity-60 ${local.class || ""}`} {...rest} />;
}

export default DropdownMenu;
