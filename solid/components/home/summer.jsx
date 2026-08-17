import { For } from "solid-js";
import { createReveal } from "~/lib/perf";
import BirthdayBanner from "~/components/BirthdayBanner";

/*
 * The default Home arrangement: the original MABIS interface.
 *
 * A sticky top bar, then the widgets stacked one after another in a single
 * column with nothing between them — no masthead, no index rail, no section
 * headings, no scrolling type. The widgets carry their own card styling, so
 * this file adds structure and spacing only; see src/styles/summer-home.css
 * for the two things that need paint.
 *
 * Every widget, every feature and every piece of behaviour is the same as in
 * the boss layout — Home passes the identical render function to both. Adding
 * something to one layout and not the other is a bug, not a variant; see "The
 * two Home layouts" in README.md.
 */

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";
export const APP_VERSION = "v6.9.9";

/**
 * One stacked module.
 *
 * No visible chrome of its own: the widget inside is the card. What this adds
 * is the same two things every section gets in the boss layout — a reserved
 * height so `content-visibility` can skip it off-screen without collapsing the
 * page, and the anchor id, so a deep link to a section still lands.
 */
function SummerModule(props) {
  const [ref, revealed] = createReveal();

  return (
    <section
      ref={ref}
      id={`sec-${props.index}`}
      data-gp-section
      aria-label={props.label}
      class="cv-section scroll-mt-20"
      classList={{ "cv-ready": revealed() }}
      style={{ "contain-intrinsic-size": `auto ${props.intrinsicHeight}px` }}
    >
      {props.children}
    </section>
  );
}

/** The original footer: logo plate on a primary-gradient panel, then version. */
function SummerFooter() {
  return (
    <>
      <div
        class="mt-4 overflow-hidden rounded-2xl shadow-xl"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--ring)))" }}
      >
        <div class="p-4">
          <div class="flex flex-col items-center gap-3 rounded-2xl bg-card p-6 shadow-inner">
            <img src={MABIS_LOGO} alt="MABIS" class="h-16 w-16 object-contain" />
            <div class="h-px w-16 bg-border" />
            <h2 class="text-center font-display text-xl font-black tracking-tight text-primary">
              Secondary Community Meeting App
            </h2>
          </div>
        </div>
      </div>
      <div class="mb-5 mt-3 flex justify-center">
        <div class="inline-flex items-center rounded-2xl bg-primary px-4 py-1.5 font-display text-sm font-bold tracking-wide text-primary-foreground shadow-md">
          Version: {APP_VERSION}
        </div>
      </div>
    </>
  );
}

/**
 * @param sections  the shared section list from Home
 * @param children  a function taking one section, returning its widget. Home
 *                  passes the same one to both layouts, which is what keeps
 *                  them from drifting apart.
 */
export function SummerHome(props) {
  return (
    <main data-summer-home class="mx-auto max-w-[1440px] space-y-6 px-4 py-6 sm:px-6">
      <BirthdayBanner />
      <For each={props.sections}>
        {(section) => (
          <SummerModule
            index={section.index}
            label={section.label}
            intrinsicHeight={section.height + 40}
          >
            {props.children(section)}
          </SummerModule>
        )}
      </For>
      <SummerFooter />
    </main>
  );
}
