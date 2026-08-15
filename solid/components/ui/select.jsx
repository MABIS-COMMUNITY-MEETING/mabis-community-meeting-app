import { Select as KSelect } from "@kobalte/core/select";
import { Check, ChevronDown } from "lucide-solid";
import { splitProps } from "solid-js";

/*
 * Select — Kobalte-backed replacement for the Radix/shadcn select.
 *
 * Radix has no Solid port, and this is exactly the kind of primitive that
 * should never be hand-rolled: it needs typeahead, roving focus, escape and
 * outside-click dismissal, scroll locking, collision-aware positioning and the
 * full listbox ARIA contract. Kobalte provides all of that.
 *
 * The API here is Kobalte's (a flat `options` array) rather than shadcn's
 * compound children, because adapting Kobalte to the compound shape means
 * re-implementing its collection handling — the part doing the real work. Call
 * sites in the Solid port use this shape directly.
 *
 * `options` accepts plain strings or { value, label } objects.
 */
function normalise(options) {
  return (options || []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}

export function Select(props) {
  const [local, rest] = splitProps(props, [
    "value", "onChange", "options", "placeholder", "class", "triggerClass", "disabled", "aria-label",
  ]);

  const items = () => normalise(local.options);
  const selected = () => items().find((o) => o.value === local.value) || null;

  return (
    <KSelect
      options={items()}
      optionValue="value"
      optionTextValue="label"
      value={selected()}
      onChange={(option) => local.onChange?.(option ? option.value : null)}
      placeholder={local.placeholder}
      disabled={local.disabled}
      itemComponent={(itemProps) => (
        <KSelect.Item
          item={itemProps.item}
          class="relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
        >
          <span class="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
            <KSelect.ItemIndicator>
              <Check class="h-4 w-4" />
            </KSelect.ItemIndicator>
          </span>
          <KSelect.ItemLabel>{itemProps.item.rawValue.label}</KSelect.ItemLabel>
        </KSelect.Item>
      )}
      {...rest}
    >
      <KSelect.Trigger
        aria-label={local["aria-label"]}
        class={`flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder-shown]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${local.triggerClass || local.class || ""}`}
      >
        <KSelect.Value class="truncate">
          {(state) => state.selectedOption()?.label}
        </KSelect.Value>
        <KSelect.Icon>
          <ChevronDown class="h-4 w-4 opacity-50" />
        </KSelect.Icon>
      </KSelect.Trigger>

      <KSelect.Portal>
        <KSelect.Content class="relative z-[120] min-w-[8rem] overflow-hidden rounded-md border border-border bg-popover text-popover-foreground shadow-md">
          <KSelect.Listbox class="max-h-72 overflow-y-auto p-1" />
        </KSelect.Content>
      </KSelect.Portal>
    </KSelect>
  );
}

export default Select;
