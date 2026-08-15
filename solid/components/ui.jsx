import { splitProps, Show } from "solid-js";

/*
 * Solid UI primitives.
 *
 * Button, Input, Textarea and Badge are the only shadcn components this app
 * uses that are NOT Radix-backed — they are plain elements with variant
 * classes. Porting them here (rather than pulling in Kobalte) unblocks most of
 * the remaining widgets for a few hundred bytes.
 *
 * Kobalte is still required, but only for the genuinely interactive
 * primitives: Dialog, Select, Tabs, Popover, DropdownMenu — the ones with
 * focus management, ARIA wiring and keyboard navigation that should never be
 * hand-rolled.
 *
 * Class strings are copied verbatim from the React components so the two
 * builds render identically.
 *
 * NOTE ON PROPS: Solid props are getters. `splitProps` is used instead of
 * destructuring because destructuring reads every prop once at setup and
 * freezes it, which silently breaks reactivity — the single most common bug
 * when porting React components to Solid.
 */

const BUTTON_BASE =
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

const BUTTON_VARIANTS = {
  default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
  destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
  outline: "border border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground",
  secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
  ghost: "hover:bg-accent hover:text-accent-foreground",
  link: "text-primary underline-offset-4 hover:underline",
};

const BUTTON_SIZES = {
  default: "h-9 px-4 py-2",
  sm: "h-8 rounded-md px-3 text-xs",
  lg: "h-10 rounded-md px-8",
  icon: "h-9 w-9",
};

export function Button(props) {
  const [local, rest] = splitProps(props, ["variant", "size", "class", "children"]);
  return (
    <button
      type={rest.type ?? "button"}
      class={`${BUTTON_BASE} ${BUTTON_VARIANTS[local.variant || "default"]} ${BUTTON_SIZES[local.size || "default"]} ${local.class || ""}`}
      {...rest}
    >
      {local.children}
    </button>
  );
}

export function Input(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <input
      class={`flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${local.class || ""}`}
      {...rest}
    />
  );
}

export function Textarea(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <textarea
      class={`flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${local.class || ""}`}
      {...rest}
    />
  );
}

const BADGE_VARIANTS = {
  default: "border-transparent bg-primary text-primary-foreground shadow hover:bg-primary/80",
  secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
  destructive: "border-transparent bg-destructive text-destructive-foreground shadow hover:bg-destructive/80",
  outline: "text-foreground",
};

export function Badge(props) {
  const [local, rest] = splitProps(props, ["variant", "class", "children"]);
  return (
    <div
      class={`inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${BADGE_VARIANTS[local.variant || "default"]} ${local.class || ""}`}
      {...rest}
    >
      {local.children}
    </div>
  );
}

/** Centred spinner used by widgets while their first query settles. */
export function WidgetSpinner(props) {
  return (
    <div class="flex justify-center py-8">
      <div
        class="h-6 w-6 animate-spin rounded-full border-2 border-primary/25 border-t-primary"
        role="status"
        aria-label={props.label || "Loading"}
      />
    </div>
  );
}

/** Empty state shared by the list widgets. */
export function EmptyState(props) {
  return (
    <div class="p-8 flex flex-col items-center justify-center text-center gap-3">
      <Show when={props.icon}>
        <div class="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">{props.icon}</div>
      </Show>
      {props.children}
    </div>
  );
}
