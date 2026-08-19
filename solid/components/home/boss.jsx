import { lazy, Suspense, For } from "solid-js";
import { EditorialSection, HomeSectionIndex, HomeMasthead } from "~/components/home/shell";
import SiteHeader from "~/components/SiteHeader";
import BirthdayBanner from "~/components/BirthdayBanner";
import { PageFooter } from "~/components/page-chrome";
import { unlockCustomColorsLocally, isCustomColorsUnlockedLocally } from "@/lib/custom-color-access";
import { toast } from "~/lib/toast";
/*
 * Every rule in here is gated on `html.home-layout-boss`, so the default
 * layout matched none of it while still paying to download and parse it from
 * the entry. Imported from the chunk it belongs to, it ships only to the
 * visitors who chose this layout, and arrives with the chunk so nothing
 * flashes. check-design-contract.mjs requires this import to exist somewhere
 * in the app, not in a named file, so the layer can travel with its layout.
 */
import "@/styles/editorial-home.css";

/*
 * The boss layout, whole, in one lazily-loaded chunk.
 *
 * Home defaults to the original MABIS interface, so everything in here — the
 * glass site header and its full-screen index overlay, the masthead, the
 * section index, the editorial section frame, the scrolling type band, the
 * scale ritual — is code the default layout never runs. Statically imported
 * from Home it was still downloaded, parsed and evaluated on every visit to
 * reach a branch that was false.
 *
 * Splitting it here is the single biggest saving available to the default
 * layout, and it costs the boss layout nothing that matters: the chunk is
 * fetched alongside Home's own widget chunks, and the service worker keeps it
 * cached for anyone who has actually chosen this layout (see
 * syncHomeLayoutCache in src/lib/layout-preference.js).
 *
 * The widgets are NOT in here. Home builds them with one renderWidget()
 * handed to both layouts, so widget work cannot land in one and miss the
 * other — see "The two Home layouts" in README.md.
 */

const ScrollVelocity = lazy(() => import("~/components/ScrollVelocity"));
const ScrollScaleRitual = lazy(() => import("~/components/home/ScrollScaleRitual"));

// Custom color access is normally one named account (custom-color-access.js).
// This is the second door: 19 clicks on the colophon logo, boss style only —
// a plain component-level counter, not persisted, so it resets on reload same
// as any other "tap N times" secret. Only the eventual unlock itself is
// persisted (localStorage, in unlockCustomColorsLocally). Deliberately not
// wired into SummerHome's footer too: the request was specifically for boss
// style, and PageFooter's onLogoClick is opt-in per caller for exactly this
// reason — see page-chrome.jsx.
const UNLOCK_TAPS = 19;
let logoTapCount = 0;

function handleLogoTap() {
  if (isCustomColorsUnlockedLocally()) return;
  logoTapCount += 1;
  if (logoTapCount < UNLOCK_TAPS) return;
  logoTapCount = 0;
  unlockCustomColorsLocally();
  toast({ title: "Custom colors unlocked", description: "Open the color picker — \u201cMake your own colors\u201d is there now." });
}

/**
 * @param sections   the shared section list from Home
 * @param controls   Home's control slot, as a function (SiteHeader renders it
 *                   twice — desktop bar and mobile drawer — and in Solid the
 *                   same nodes cannot occupy both places)
 * @param children   Home's renderWidget, taking one section
 */
export default function BossHome(props) {
  return (
    <>
      <SiteHeader rightSlot={props.controls} />

      <main class="mx-auto max-w-[1600px] px-4 pb-8 pt-20 sm:px-10 sm:pt-32">
        <HomeMasthead weekLabel={props.weekLabel} dateLabel={props.dateLabel} date={props.date} />

        <div class="pb-6 pt-5 sm:pb-10 sm:pt-8">
          <HomeSectionIndex />
        </div>

        <Suspense fallback={null}>
          <div class="-mx-4 overflow-hidden border-b py-3 jp-rule sm:-mx-10 sm:py-5">
            <ScrollVelocity
              items={["MABIS", "COMMUNITY", "FRIDAY", "BANGKOK"]}
              class="font-display font-light tracking-[-0.035em] text-foreground/16 text-[clamp(1.35rem,7vw,2.15rem)] sm:text-[4.2vw]"
            />
          </div>
          <ScrollScaleRitual />
        </Suspense>

        <div class="pb-8 pt-4 sm:pb-14 sm:pt-6">
          <BirthdayBanner />
        </div>

        <div class="space-y-12 sm:space-y-24">
          <For each={props.sections}>
            {(section) => (
              <EditorialSection
                index={section.index}
                label={section.label}
                jaLabel={section.jaLabel}
                description={section.description}
                jaDescription={section.jaDescription}
                intrinsicHeight={section.height + 160}
              >
                {props.children(section)}
              </EditorialSection>
            )}
          </For>
        </div>

        <PageFooter onLogoClick={handleLogoTap} />
      </main>
    </>
  );
}
