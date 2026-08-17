import { createSignal, onCleanup, onMount, For, Show } from "solid-js";
import { A } from "@solidjs/router";
import { ChevronDown, Inbox } from "lucide-solid";
import { preloadRoute } from "~/lib/routes";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

/*
 * The original site's top bar, restored for the default layout.
 *
 * Structure, sizes and order are the original's: logo tile, two-line title,
 * then the controls on the right. Colours come from theme tokens rather than
 * the original hex values — under the default MABIS palette `bg-card` is that
 * white, `border-border` that grey and `bg-primary` that maroon, so it renders
 * identically while a theme change still works.
 *
 * One addition the original did not need: it was a single-page app, so it had
 * no navigation. This build has archive routes that were only reachable from
 * the editorial overlay menu, and dropping that menu would strand them. They
 * live in a plain dropdown here — a signal and one document listener, no
 * dependency, since it is four links.
 */

const PAGES = [
  { label: "Meeting History", to: "/history" },
  { label: "Announcements", to: "/history/announcements" },
  { label: "News", to: "/history/news" },
];

function PagesMenu() {
  const [open, setOpen] = createSignal(false);
  let root;

  onMount(() => {
    const close = (event) => {
      if (root && !root.contains(event.target)) setOpen(false);
    };
    const onKey = (event) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", close);
    document.addEventListener("keydown", onKey);
    onCleanup(() => {
      document.removeEventListener("pointerdown", close);
      document.removeEventListener("keydown", onKey);
    });
  });

  return (
    <div ref={root} class="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open()}
        aria-haspopup="menu"
        title="Other pages"
        class="flex h-9 items-center gap-1 rounded-lg border border-border bg-card px-2.5 text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-muted"
      >
        <span class="hidden sm:inline">Pages</span>
        <ChevronDown class="h-3.5 w-3.5" />
      </button>
      <Show when={open()}>
        <div
          role="menu"
          class="dropdown-pop absolute right-0 top-11 z-50 w-52 overflow-hidden rounded-xl border border-border bg-card py-1 shadow-lg"
        >
          <For each={PAGES}>
            {(page) => (
              <A
                href={page.to}
                role="menuitem"
                onClick={() => setOpen(false)}
                onPointerEnter={() => preloadRoute(page.to)}
                onFocus={() => preloadRoute(page.to)}
                class="block px-3 py-2 text-sm font-medium text-foreground hover:bg-muted"
              >
                {page.label}
              </A>
            )}
          </For>
        </div>
      </Show>
    </div>
  );
}

export default function SummerHeader(props) {
  return (
    <header class="sticky top-0 z-40 border-b border-border bg-card shadow-sm">
      <div class="mx-auto flex max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-5">
        <A href="/" data-cursor="HOME" class="group flex min-w-0 items-center gap-3">
          <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-card shadow-md ring-1 ring-border">
            <img src={LOGO} alt="MABIS" class="h-8 w-8 object-contain" />
          </span>
          <span class="min-w-0">
            <span class="block truncate font-display text-base font-bold leading-none text-foreground transition-colors group-hover:text-primary">
              MABIS Community Meeting
            </span>
            <span class="mt-0.5 block truncate text-[11px] text-muted-foreground">
              Secondary Community Meeting App
            </span>
          </span>
        </A>

        <div class="flex shrink-0 items-center gap-2 sm:gap-3">
          <Show when={props.canSeeInbox}>
            <A
              href="/feedback"
              title="View Feedback & Bug Reports"
              class="hidden h-8 w-8 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-sm transition-colors hover:bg-muted sm:flex"
            >
              <Inbox class="h-4 w-4" />
            </A>
          </Show>
          <PagesMenu />
          {props.rightSlot?.()}
        </div>
      </div>
    </header>
  );
}
