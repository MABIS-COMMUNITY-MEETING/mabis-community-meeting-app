import { createSignal, createEffect, onMount, onCleanup, Show, Index } from "solid-js";
import { Portal } from "solid-js/web";
import { A, useNavigate, useLocation } from "@solidjs/router";
import { ArrowUpRight } from "lucide-solid";
import { playHover, playMenuOpen, playMenuClose } from "@/lib/sound";
import { preloadRoute } from "~/lib/routes";
import Glass from "~/components/Glass";
import SoundToggle from "~/components/SoundToggle";
import { JapaneseText } from "~/components/primitives";
import { lockBodyScroll } from "@/lib/scroll-lock";

const LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

const NAV = [
  { label: "Home", ja: "ホーム", to: "/home", n: "01" },
  { label: "Meeting History", ja: "ミーティング履歴", to: "/history", n: "02" },
  { label: "Announcements", ja: "お知らせ", to: "/history/announcements", n: "03" },
  { label: "News", ja: "ニュース", to: "/history/news", n: "04" },
  { label: "Feedback Inbox", ja: "フィードバック受信箱", to: "/feedback", n: "05" },
];

/*
 * SiteHeader — Solid port of src/components/SiteHeader.jsx.
 *
 * Three things carried over deliberately:
 *
 *  · The clock updates by writing textContent to a ref, not through state.
 *    The React comment explains why — "updating it directly avoids reconciling
 *    the entire header and its control slot every second". Solid would only
 *    update the one text node anyway, but the direct write is still the
 *    cheapest possible path and keeps a per-second timer off the graph.
 *
 *  · The long-label size clamp: "Meeting History" and "Feedback Inbox" would
 *    run past the rule on narrow phones, so labels over 12 characters get a
 *    smaller clamp.
 *
 *  · The hover label duplication (one copy slides up, a secondary-coloured
 *    copy slides in from below) is pure CSS transform, so it ports unchanged.
 *
 * framer's `layoutId="nav-active"` shared-element indicator has no Solid
 * equivalent — Motion One does not implement layout animation. The active
 * marker is a plain positioned bar here: it appears on the active item rather
 * than sliding between items. This is the one visible motion difference in the
 * whole port so far, and it is noted in docs/solid-migration.md.
 *
 * NOTE ON rightSlot: it is a FUNCTION, not an element. The header renders the
 * control slot twice — once in the desktop bar, once in the mobile "quick
 * controls" drawer. In React that is two element trees; in Solid a JSX
 * expression is real DOM, so rendering the same value twice MOVES the nodes
 * out of the first location instead of duplicating them. Calling a function
 * per location builds two independent subtrees, the same fix used in Marquee.
 */
export default function SiteHeader(props) {
  const navigate = useNavigate();
  const location = useLocation();

  const [open, setOpen] = createSignal(false);
  let clockEl;

  onMount(() => {
    const tick = () => {
      if (clockEl) {
        clockEl.textContent = new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit", minute: "2-digit", second: "2-digit",
        });
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    onCleanup(() => clearInterval(id));

    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    onCleanup(() => window.removeEventListener("keydown", onKey));
  });

  // Close on navigation.
  createEffect(() => {
    location.pathname;
    setOpen(false);
  });

  // Lock background scroll while the overlay is up. Reference-counted — see
  // lib/scroll-lock.js for why doing this inline leaves scrolling dead.
  createEffect(() => {
    if (!open()) return;
    onCleanup(lockBodyScroll());
  });

  const go = (to) => { setOpen(false); navigate(to); };

  return (
    <>
      {/* Mount persistent navigation at the document root. Route entrance
          wrappers temporarily animate with transforms; keeping a fixed header
          inside one makes it scroll with that wrapper on some compositors. */}
      <Portal>
      <header class="site-header-shell fixed top-0 left-0 right-0 z-50">
        <Glass variant="navigation" tone="light" contentClass="flex items-center justify-between gap-3 px-3 py-3 sm:px-8 sm:py-4">
          <A href="/" data-cursor="HOME" class="group flex items-center gap-3">
            <span class="relative flex h-9 w-9 items-center justify-center overflow-hidden border border-foreground/30 bg-background">
              <img src={LOGO} alt="MABIS" class="h-6 w-6 object-contain transition-transform duration-500 group-hover:scale-110" />
            </span>
            <span class="hidden sm:flex flex-col leading-none">
              <span class="tech-label text-foreground">MABIS</span>
              <JapaneseText ja="コミュニティ・ミーティング" class="block tech-label text-muted-foreground" japaneseClass="text-[0.78em]">
                COMMUNITY MEETING
              </JapaneseText>
            </span>
          </A>

          <div class="flex items-center gap-2 sm:gap-5">
            <SoundToggle class="sm:hidden" />
            <div class="hidden items-center gap-3 sm:flex sm:gap-5">
              <span ref={clockEl} class="hidden md:inline tech-label text-muted-foreground tabular-nums" />
              <SoundToggle />
              {props.rightSlot?.()}
            </div>

            <button
              onClick={() => setOpen((v) => { const next = !v; (next ? playMenuOpen : playMenuClose)(); return next; })}
              data-cursor={open() ? "CLOSE" : "MENU"}
              class="relative flex h-9 items-center gap-2 border border-foreground/30 bg-background px-3 tech-label text-foreground hover:bg-foreground hover:text-background transition-colors"
              aria-label={open() ? "Close menu" : "Open menu"}
              aria-expanded={open()}
            >
              <span class="relative flex h-3 w-4 flex-col justify-between">
                <span
                  class="block h-px w-full bg-current transition-transform duration-300"
                  style={{ transform: open() ? "rotate(45deg) translateY(6px)" : "none" }}
                />
                <span
                  class="block h-px w-full bg-current transition-opacity duration-300"
                  style={{ opacity: open() ? 0 : 1 }}
                />
                <span
                  class="block h-px w-full bg-current transition-transform duration-300"
                  style={{ transform: open() ? "rotate(-45deg) translateY(-6px)" : "none" }}
                />
              </span>
              <span class="hidden sm:inline">{open() ? "CLOSE" : "MENU"}</span>
            </button>
          </div>
        </Glass>
        <span class="lg-scroll-edge" aria-hidden="true" />
      </header>
      </Portal>

      <Show when={open()}>
        <Portal>
          <div class="site-nav-overlay fixed inset-0 z-40 bg-ink text-bone">
          <div class="grid-bg absolute inset-0 opacity-15" />

          <span
            class="vert-text pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display font-thin tracking-ultra text-bone leading-none select-none whitespace-nowrap"
            style={{ "font-size": "26vw", opacity: 0.035 }}
          >
            INDEX
          </span>

          <div class="site-nav-panel relative flex h-full flex-col gap-7 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-24 sm:justify-between sm:gap-0 sm:px-8 sm:pb-8 sm:pt-28">
            <div class="flex items-start justify-between">
              <div class="flex items-center gap-3">
                <span class="block h-px w-10 bg-secondary origin-left" />
                <span class="tech-label text-bone/50">SELECTED NAVIGATION</span>
              </div>
              <span class="tech-label vert-text text-bone/50 sm:hidden">MENU</span>
            </div>

            <nav class="mt-1 flex shrink-0 flex-col gap-1 sm:mt-0 sm:gap-2">
              <Index each={NAV}>
                {(item, i) => {
                  const active = () => location.pathname === item().to;
                  // Long labels ("Meeting History", "Feedback Inbox") would run
                  // past the rule on narrow phones — scale them down to fit.
                  const size = () => item().label.length > 12
                    ? "text-[clamp(1.45rem,7vw,2.15rem)]"
                    : "text-[clamp(1.7rem,8.5vw,2.5rem)]";

                  return (
                    <button
                      onClick={() => go(item().to)}
                      onPointerEnter={() => preloadRoute(item().to)}
                      onFocus={() => preloadRoute(item().to)}
                      onMouseEnter={playHover}
                      data-cursor="OPEN"
                      class="nav-item group relative flex shrink-0 items-baseline gap-3 text-left sm:gap-8"
                      style={{ "animation-delay": `${0.12 + i * 0.07}s` }}
                    >
                      <span class="w-7 pt-2 tech-label text-bone/40 sm:w-10 sm:pt-4">{item().n}</span>
                      <span class="relative flex-1 flex items-center gap-3 border-b border-bone/15 py-2 sm:py-3 overflow-hidden">
                        <Show when={active()}>
                          <span class="absolute left-0 top-0 bottom-0 w-[3px] bg-secondary" />
                        </Show>
                        <span class="relative block overflow-hidden pb-[0.32em] -mb-[0.32em]">
                          <span class={`block whitespace-nowrap ${size()} sm:text-5xl md:text-6xl font-display font-light tracking-[-0.055em] leading-[1.45] transition-transform duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)] group-hover:-translate-y-[125%]`}>
                            <JapaneseText ja={item().ja} japaneseClass="text-[0.28em] font-normal tracking-normal">{item().label}</JapaneseText>
                          </span>
                          <span class={`absolute inset-0 block whitespace-nowrap ${size()} sm:text-5xl md:text-6xl font-display font-light tracking-[-0.055em] leading-[1.45] text-secondary translate-y-[125%] transition-transform duration-500 [transition-timing-function:cubic-bezier(.16,1,.3,1)] group-hover:translate-y-0`}>
                            <JapaneseText ja={item().ja} japaneseClass="text-[0.28em] font-normal tracking-normal">{item().label}</JapaneseText>
                          </span>
                        </span>
                        <ArrowUpRight class="ml-auto h-5 w-5 sm:h-7 sm:w-7 opacity-0 -translate-x-2 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0" />
                      </span>
                    </button>
                  );
                }}
              </Index>
            </nav>

            <div class="border-t border-bone/15 pt-4 sm:hidden">
              <p class="tech-label text-bone/45">QUICK CONTROLS</p>
              <div class="mobile-nav-controls mt-3 flex flex-wrap items-center gap-2">
                <SoundToggle />
                {props.rightSlot?.()}
              </div>
            </div>

            <div class="mt-auto flex items-end justify-between pt-2 sm:mt-0 sm:pt-0">
              <JapaneseText
                ja="セカンダリー・コミュニティ・ミーティング・アプリ 2026"
                class="block tech-label text-bone/40"
                japaneseClass="mt-1 block normal-case tracking-normal text-[0.85em]"
              >
                SECONDARY COMMUNITY<br />MEETING APP 2026
              </JapaneseText>
              <div class="tech-label text-bone/40 text-right">
                EST. MABIS<br />BANGKOK TH
              </div>
            </div>
          </div>
          </div>
        </Portal>
      </Show>
    </>
  );
}
