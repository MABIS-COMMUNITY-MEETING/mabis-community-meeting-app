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

/* Still exported: other modules read the version even though the colophon
   card that used to display the logo is gone. */
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
      {/* The colophon card — logo, rule and app name — is gone at Novesce's
          request. The version chip below is what remains of the footer. */}
      <div class="mb-5 mt-6 flex justify-center">
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
