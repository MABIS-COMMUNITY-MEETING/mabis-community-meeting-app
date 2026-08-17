import { Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Plus } from "lucide-solid";
import { JapaneseText } from "~/components/primitives";
import { useHomeLayout } from "~/lib/prefs";

/*
 * Summer style's auth shell — the original centred card.
 *
 * None of the editorial furniture survives here: no 22vw background wordmark,
 * no technical frame, no crosshairs, no "N° 00" meta row, no two-column split
 * with an 8xl extralight headline. Summer put a single rounded white card in
 * the middle of a light page, and that is all this is.
 *
 * The prop contract is identical, so pages do not know which shell they are
 * in — which is what keeps the two from drifting.
 */
function SummerAuthLayout(props) {
  return (
    <div class="summer-page flex min-h-screen w-full items-center justify-center px-4 py-12">
      <div class="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div class="flex flex-col items-center text-center">
          <Show
            when={props.logo}
            fallback={
              <div class="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-primary">
                <Dynamic component={props.icon} class="h-7 w-7 text-primary-foreground" aria-hidden="true" />
              </div>
            }
          >
            <div class="mb-4 inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl border border-border bg-card">
              {props.logo}
            </div>
          </Show>

          <h1 class="font-display text-2xl font-bold leading-none text-foreground">{props.title}</h1>
          <Show when={props.jaTitle}>
            <p lang="ja" class="mt-1.5 text-sm text-muted-foreground">{props.jaTitle}</p>
          </Show>
          <Show when={props.subtitle}>
            <JapaneseText as="p" ja={props.jaSubtitle} class="mt-2 block text-sm text-muted-foreground" japaneseClass="text-[0.9em]">
              {props.subtitle}
            </JapaneseText>
          </Show>
        </div>

        <div class="mt-8">
          {props.children}
          <Show when={props.footer}>
            <p class="mt-6 text-center text-xs text-muted-foreground">{props.footer}</p>
          </Show>
        </div>
      </div>
    </div>
  );
}

/**
 * Editorial auth shell — 1:1 port of src/components/AuthLayout.jsx.
 *
 * Oversized background numeral, thin technical frame, crosshair decorations
 * and a glass content card. Preserves the same
 * { icon, title, jaTitle, subtitle, jaSubtitle, footer, logo, children }
 * contract used by all auth pages.
 *
 * Two deliberate differences from the React original, both invisible:
 *
 *  1. framer-motion's entrance is a CSS keyframe (`auth-rise`) instead of a JS
 *     animation. Same 0.6s curve and same y/opacity values, but it runs on the
 *     compositor and ships no animation runtime on the auth critical path.
 *  2. `icon` is rendered through Dynamic rather than being called as <Icon />,
 *     because in Solid a prop holding a component must not be destructured or
 *     captured — reading it through Dynamic keeps it reactive.
 */
function EditorialAuthLayout(props) {
  return (
    <div class="relative min-h-screen w-full overflow-hidden bg-bone text-foreground">
      <div class="grid-bg absolute inset-0 opacity-60" />

      {/* oversized background word */}
      <span class="pointer-events-none absolute -bottom-6 -right-4 select-none font-display font-thin tracking-ultra text-foreground/5 text-[22vw] leading-none">
        MABIS
      </span>

      {/* frame + crosshairs */}
      <div class="pointer-events-none absolute inset-4 sm:inset-6 border border-foreground/15" />
      <Plus class="absolute top-4 left-4 sm:top-6 sm:left-6 h-3 w-3 text-foreground/30" />
      <Plus class="absolute top-4 right-4 sm:top-6 sm:right-6 h-3 w-3 text-foreground/30" />
      <Plus class="absolute bottom-4 left-4 sm:bottom-6 sm:left-6 h-3 w-3 text-foreground/30" />
      <Plus class="absolute bottom-4 right-4 sm:bottom-6 sm:right-6 h-3 w-3 text-foreground/30" />

      {/* top meta row */}
      <div class="absolute top-6 sm:top-9 left-0 right-0 flex items-center justify-between px-8 sm:px-14">
        <JapaneseText ja="認証" as="span" class="tech-label text-muted-foreground" japaneseClass="text-[0.8em] normal-case tracking-normal"> AUTH</JapaneseText>
        <span class="tech-label text-muted-foreground">N° 00</span>
      </div>

      <div class="relative z-10 mx-auto flex min-h-screen max-w-[1440px] items-center px-8 sm:px-14 py-24">
        <div class="auth-rise grid w-full grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-16">
          <div class="lg:col-span-6 lg:col-start-1">
            <JapaneseText ja="本人確認" as="div" class="tech-label text-primary mb-4" japaneseClass="text-[0.8em] normal-case tracking-normal"> IDENTITY</JapaneseText>
            <Show
              when={props.logo}
              fallback={
                <div class="mb-6 inline-flex h-14 w-14 items-center justify-center bg-primary">
                  <Dynamic component={props.icon} class="h-7 w-7 text-primary-foreground" aria-hidden="true" />
                </div>
              }
            >
              <div class="mb-6 inline-flex h-16 w-16 items-center justify-center border border-foreground/20 bg-card overflow-hidden">
                {props.logo}
              </div>
            </Show>
            <h1 class="font-display font-extralight tracking-ultra leading-[0.9] text-5xl sm:text-7xl lg:text-8xl">
              {props.title}
            </h1>
            <Show when={props.jaTitle}>
              <p lang="ja" class="mt-2 text-lg text-muted-foreground">{props.jaTitle}</p>
            </Show>
            <Show when={props.subtitle}>
              <JapaneseText as="p" ja={props.jaSubtitle} class="mt-3 text-sm text-muted-foreground" japaneseClass="text-[0.9em]">
                {props.subtitle}
              </JapaneseText>
            </Show>
          </div>

          <div class="lg:col-span-5 lg:col-start-8">
            <div class="border-t border-foreground/20 pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-10">
              {props.children}
              <Show when={props.footer}>
                <p class="mt-8 text-xs tech-label text-muted-foreground">
                  {props.footer}
                </p>
              </Show>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * The auth shell for whichever style is selected.
 *
 * Routed through <Show> rather than an early return: an early return would
 * read the preference once at construction and never again, so switching
 * style in Settings would leave the old shell mounted until a reload.
 */
export default function AuthLayout(props) {
  const layout = useHomeLayout();
  return (
    <Show when={layout() === "boss"} fallback={<SummerAuthLayout {...props} />}>
      <EditorialAuthLayout {...props} />
    </Show>
  );
}
