import { Show } from "solid-js";
import { JapaneseText } from "~/components/primitives";
import { createReveal } from "~/lib/perf";

/*
 * The default Home arrangement.
 *
 * This is the layout the community asked for: the same ten numbered sections
 * as the editorial front page, with the decoration between them removed. No
 * full-height masthead, no index rail, no scrolling type bands — a heading,
 * then the widget.
 *
 * It is a simplification, not a different design system. Same tokens, same
 * display face, same thin rules, same tabular index numbers, same Japanese
 * companion text. The editorial character comes from the typography and the
 * rules; only the scaffolding around it is gone.
 *
 * Anything added to a section here must also be added to EditorialSection in
 * ./shell.jsx — the two layouts are arrangements of one page, not two pages.
 */

const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/**
 * One numbered section: rule, index, heading, widget.
 *
 * Takes the same props as EditorialSection so Home can swap between them with
 * <Dynamic> rather than duplicating the section list. `intrinsicHeight` is
 * read for the same reason it is there — reserving the height keeps
 * content-visibility from collapsing the page while the section is skipped.
 */
export function SimpleSection(props) {
  const [ref, revealed] = createReveal();
  const index = () => props.index ?? "00";

  return (
    <section
      ref={ref}
      id={`sec-${index()}`}
      data-gp-section
      tabindex={-1}
      aria-label={`${index()} ${props.label ?? ""}`}
      class="cv-section scroll-mt-20 outline-none"
      classList={{ "cv-ready": revealed() }}
      style={{ "contain-intrinsic-size": `auto ${props.intrinsicHeight ?? 640}px` }}
    >
      <header class="mb-3 flex items-baseline gap-3 border-b pb-2 jp-rule sm:mb-4">
        <span class="tech-label tabular-nums text-primary">{index()}</span>
        <h2 class="min-w-0 break-words font-display text-[clamp(1.2rem,5.5vw,1.55rem)] font-medium leading-tight tracking-[-0.035em]">
          <JapaneseText ja={props.jaLabel}>{props.label}</JapaneseText>
        </h2>
      </header>

      <Show when={props.description}>
        <JapaneseText
          ja={props.jaDescription}
          data-section-description
          class="mb-3 block max-w-[54ch] text-[0.8125rem] leading-[1.6] text-muted-foreground"
          japaneseClass="mt-1 block text-[0.9em]"
        >
          {props.description}
        </JapaneseText>
      </Show>

      <div
        class="-mx-4 sm:mx-0"
        style={{
          opacity: revealed() ? 1 : 0,
          transition: `opacity 0.4s ${EASE_CSS}`,
        }}
      >
        {props.children}
      </div>
    </section>
  );
}

/**
 * The short masthead: kicker, title, and the week/date line.
 *
 * The editorial masthead reserves 58vh before the first widget. This one is a
 * few lines tall and carries the same three facts.
 *
 * `data-home-masthead` is what the parity harness waits on. Asserting on the
 * copy instead would be ambiguous — SiteHeader also says COMMUNITY MEETING.
 */
export function SimpleMasthead(props) {
  const jaDate = () => {
    const d = props.date instanceof Date ? props.date : new Date(props.date);
    return isNaN(d.getTime())
      ? ""
      : new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(d);
  };

  return (
    <section data-home-masthead class="border-b pb-5 jp-rule sm:pb-7">
      <div class="flex items-center gap-3">
        <span class="h-px w-8 bg-primary" />
        <JapaneseText ja="今週" class="jp-kicker" japaneseClass="text-[0.85em]">THIS WEEK</JapaneseText>
      </div>

      <h1 class="mt-3 font-display text-[clamp(1.85rem,8.5vw,2.9rem)] font-light leading-[0.95] tracking-[-0.055em]">
        <JapaneseText ja="コミュニティ・ミーティング" japaneseClass="mt-1 block text-[0.34em] tracking-normal">
          COMMUNITY MEETING
        </JapaneseText>
      </h1>

      <dl class="mt-4 flex flex-wrap gap-x-6 gap-y-1.5 tech-label text-muted-foreground">
        <div class="flex gap-2"><dt>WEEK</dt><dd class="text-foreground tabular-nums">{props.weekLabel}</dd></div>
        <div class="flex gap-2">
          <dt>DATE</dt>
          <dd class="text-foreground tabular-nums">
            <JapaneseText ja={jaDate()} layout="inline" japaneseClass="ml-1 inline text-[0.7em] opacity-70">
              {props.dateLabel}
            </JapaneseText>
          </dd>
        </div>
        <div class="flex gap-2"><dt>CYCLE</dt><dd class="text-foreground">FRIDAY</dd></div>
      </dl>
    </section>
  );
}
