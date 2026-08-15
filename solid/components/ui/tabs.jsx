import { Tabs as KTabs } from "@kobalte/core/tabs";
import { splitProps } from "solid-js";

/* Tabs — Kobalte-backed replacement for the Radix/shadcn tabs. */

export const Tabs = KTabs;

export function TabsList(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <KTabs.List
      class={`inline-flex h-9 items-center justify-center rounded-lg bg-muted p-1 text-muted-foreground ${local.class || ""}`}
      {...rest}
    />
  );
}

export function TabsTrigger(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <KTabs.Trigger
      class={`inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[selected]:bg-background data-[selected]:text-foreground data-[selected]:shadow ${local.class || ""}`}
      {...rest}
    />
  );
}

export function TabsContent(props) {
  const [local, rest] = splitProps(props, ["class"]);
  return (
    <KTabs.Content
      class={`mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${local.class || ""}`}
      {...rest}
    />
  );
}

export default Tabs;
