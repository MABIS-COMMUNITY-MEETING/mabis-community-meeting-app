import { createSignal, onMount, For, Show } from "solid-js";
import { JapaneseText } from "~/components/primitives";
import { createVisibility, createReveal } from "~/lib/perf";

const EASE_CSS = "cubic-bezier(0.16, 1, 0.3, 1)";

/* ── LazySection ───────────────────────────────────────────────────────────
 * Same contract as the React version — mount on approach, never unmount — but
 * with two low-level differences:
 *
 *   · it uses the ONE shared IntersectionObserver (lib/perf.js) instead of
 *     allocating a new observer per section;
 *   · the placeholder carries contain-intrinsic-size so the reserved space is
 *     a real layout contract rather than a min-height guess, which keeps the
 *     scrollbar stable when the real content swaps in.
 */
export function LazySection(props) {
  const [ref, visible] = createVisibility();

  return (
    <div ref={ref}>
      <Show
        when={visible()}
        fallback={
          <div
            class="lazy-section-placeholder"
            style={{
              "--lazy-min-height": `${props.minHeight ?? 480}px`,
              "contain-intrinsic-size": `auto ${props.minHeight ?? 480}px`,
            }}
            aria-hidden
          />
        }
      >
        {props.children}
      </Show>
    </div>
  );
}

/* ── EditorialSection ──────────────────────────────────────────────────────
 * 1:1 with src/components/home/EditorialSection.jsx, plus the single biggest
 * scroll win available on a ten-section page:
 *
 *   content-visibility: auto  — the browser skips layout AND paint for any
 *   section that is off screen. On a long page this is the difference between
 *   compositing ten heavy sections every frame and compositing the one or two
 *   actually visible. It implies contain: layout style paint, so style
 *   recalculation inside a section can never invalidate its siblings.
 *
 *   contain-intrinsic-size: auto <h>  — reserves the height up front so
 *   skipping does not collapse the page or make the scrollbar jump, and the
 *   `auto` keyword makes the browser remember the real size once measured.
 *
 * The framer whileInView stagger becomes a CSS transition driven by the same
 * shared observer, so the reveal costs one class flip instead of a JS
 * animation per child.
 */
export function EditorialSection(props) {
  // Two signals on purpose: `visible` mounts the section well ahead of the
  // viewport so nothing is blank when reached; `revealed` fires as it actually
  // comes into view so the entrance is seen rather than played off-screen.
  const [ref, revealed] = createReveal();
  const index = () => props.index ?? "00";
  const flag = () => `var(--flag-${((parseInt(index(), 10) || 1) % 8) + 1}, hsl(var(--primary)))`;

  const reveal = (delay) => ({
    opacity: revealed() ? 1 : 0,
    transform: revealed() ? "translateY(0)" : "translateY(8px)",
    transition: `opacity 0.55s ${EASE_CSS} ${delay}s, transform 0.55s ${EASE_CSS} ${delay}s`,
  });

  return (
    <section
      ref={ref}
      id={`sec-${index()}`}
      data-gp-section
      tabindex={-1}
      aria-label={`${index()} ${props.label ?? ""}`}
      class="cv-section relative grid scroll-mt-20 grid-cols-1 gap-x-8 outline-none lg:grid-cols-[6.5rem_1fr]"
      style={{ "contain-intrinsic-size": `auto ${props.intrinsicHeight ?? 640}px` }}
    >
      <div class="hidden lg:flex flex-col items-end select-none">
        <span class="jp-index text-[3.8rem] leading-[0.85] font-light text-foreground/12" style={reveal(0)}>
          {index()}
        </span>
        <span
          class="mt-5 w-px flex-1 min-h-[3rem] origin-top opacity-45"
          style={{
            background: flag(),
            transform: revealed() ? "scaleY(1)" : "scaleY(0)",
            transition: `transform 0.65s ${EASE_CSS}`,
          }}
        />
      </div>

      <div class="min-w-0">
        <header
          class="mb-4 grid grid-cols-[auto_1fr] items-start gap-x-3 border-t pt-3 jp-rule sm:mb-5 sm:grid-cols-[4rem_1fr_auto] sm:gap-x-5"
          style={reveal(0.06)}
        >
          <span class="tech-label tabular-nums" style={{ color: flag() }}>{index()}</span>
          <div class="min-w-0">
            <h2 class="break-words font-display text-[clamp(1.45rem,7vw,2rem)] font-medium leading-[1.02] tracking-[-0.045em] sm:text-[2.15rem]">
              <JapaneseText ja={props.jaLabel}>{props.label}</JapaneseText>
            </h2>
            <Show when={props.description}>
              <JapaneseText
                ja={props.jaDescription}
                data-section-description
                class="mt-2 block max-w-[54ch] text-[0.8125rem] leading-[1.6] tracking-[0.02em] text-muted-foreground sm:text-sm"
                japaneseClass="mt-1 block text-[0.9em]"
              >
                {props.description}
              </JapaneseText>
            </Show>
          </div>
          <JapaneseText
            ja="MABIS セクション"
            class="hidden sm:block jp-kicker text-right"
            japaneseClass="text-[0.82em]"
          >
            MABIS SECTION
          </JapaneseText>
        </header>

        <div class="-mx-4 sm:mx-0" style={reveal(0.12)}>
          {props.children}
        </div>
      </div>
    </section>
  );
}

/* ── HomeSectionIndex ──────────────────────────────────────────────────────
 * Static list — rendered with <Index> rather than <For>. <For> is keyed and
 * carries per-item disposal/reconciliation machinery for reordering; this
 * list never reorders, so <Index> is strictly less work.
 */
const SECTIONS = [
  ["01", "Start meeting", "ミーティングを始める"],
  ["02", "Announcements", "お知らせ"],
  ["03", "Discussion topics", "話し合いのテーマ"],
  ["04", "Jobs", "係"],
  ["05", "Calendar", "カレンダー"],
  ["06", "Daily schedule", "一日の予定"],
  ["07", "Lost and found", "落とし物"],
  ["08", "Lunch menu", "ランチメニュー"],
  ["09", "News", "ニュース"],
  ["10", "People", "メンバー"],
];

export function HomeSectionIndex() {
  return (
    <nav aria-label="Jump to a Home section" class="border-y border-border">
      <div class="flex items-end justify-between gap-4 border-b border-border py-3">
        <div>
          <JapaneseText
            ja="ページ案内"
            class="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
            japaneseClass="text-[10px] tracking-normal"
          >
            Page guide
          </JapaneseText>
          <h2 class="mt-1 font-display text-xl font-medium tracking-tight text-foreground">
            <JapaneseText ja="行きたい場所を選ぶ">Choose where to go</JapaneseText>
          </h2>
        </div>
        <JapaneseText
          ja="すべての項目はこのページにあります。選んで移動するか、番号順にスクロールしてください。"
          class="hidden max-w-sm text-right text-xs leading-relaxed text-muted-foreground sm:block"
          japaneseClass="mt-1 block text-[0.9em]"
        >
          All sections are on this page. Choose one to jump there, or keep scrolling in number order.
        </JapaneseText>
      </div>
      <div class="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-5">
        <For each={SECTIONS}>
          {([number, label, jaLabel]) => (
            <a
              href={`#sec-${number}`}
              class="group flex min-h-12 items-center gap-3 bg-background px-3 py-2.5 text-left text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span class="text-[10px] font-bold tabular-nums text-muted-foreground group-hover:text-primary">{number}</span>
              <JapaneseText ja={jaLabel} class="text-sm font-semibold" japaneseClass="text-[0.78em]">{label}</JapaneseText>
            </a>
          )}
        </For>
      </div>
    </nav>
  );
}

/* ── HomeMasthead ──────────────────────────────────────────────────────────
 * Above the fold, so it mounts eagerly. The only reactive value is the date
 * pair, computed once at render — no signals, therefore no reactive work
 * after first paint.
 */
export function HomeMasthead(props) {
  const [shown, setShown] = createSignal(false);
  onMount(() => requestAnimationFrame(() => requestAnimationFrame(() => setShown(true))));

  const jaDate = () => {
    const d = props.date instanceof Date ? props.date : new Date(props.date);
    return isNaN(d.getTime()) ? "" : new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(d);
  };

  const rise = (delay) => ({
    transform: shown() ? "translateY(0)" : "translateY(102%)",
    transition: `transform 0.78s ${EASE_CSS} ${delay}s`,
  });

  return (
    <section class="relative grid min-h-0 grid-cols-1 items-end gap-x-12 gap-y-7 border-b pb-8 pt-5 jp-rule sm:min-h-[58vh] sm:gap-y-10 sm:pb-14 sm:pt-0 lg:grid-cols-[1fr_15rem]">
      <div class="min-w-0">
        <div class="mb-5 flex items-center gap-3 sm:mb-8" style={{ opacity: shown() ? 1 : 0, transition: "opacity 0.45s ease" }}>
          <span class="h-px w-10 bg-primary" />
          <span class="jp-kicker">COMMUNITY DASHBOARD</span>
        </div>

        <h1 class="font-display font-light tracking-[-0.065em] leading-[0.9]">
          <span class="reveal-mask block">
            <span class="-ml-[0.035em] block text-[clamp(2.75rem,13.7vw,5.5rem)] lg:text-[7.6vw]" style={rise(0.06)}>
              COMMUNITY
            </span>
          </span>
          <span class="reveal-mask block">
            <span class="-ml-[0.035em] block text-[clamp(2.75rem,13.7vw,5.5rem)] text-foreground/28 lg:text-[7.6vw]" style={rise(0.14)}>
              MEETING
            </span>
          </span>
        </h1>

        <div class="mt-7 flex max-w-2xl items-start gap-4 border-t jp-rule pt-4">
          <span class="tech-label shrink-0">01</span>
          <JapaneseText
            ja="ミーティング、お知らせ、スケジュール、係、メモ、コミュニティの記録をまとめて使える、みんなで使う作業スペースです。"
            class="block max-w-xl text-xs sm:text-sm leading-6 text-muted-foreground"
            japaneseClass="mt-1 block text-[0.9em]"
          >
            A shared working space for meetings, announcements, schedules, jobs, notes and community records.
          </JapaneseText>
        </div>
      </div>

      <aside
        class="border-t pt-4 jp-rule lg:border-l lg:border-t-0 lg:pb-1 lg:pl-6 lg:pt-0"
        style={{ opacity: shown() ? 1 : 0, transform: shown() ? "translateY(0)" : "translateY(12px)", transition: `opacity 0.55s ${EASE_CSS} 0.28s, transform 0.55s ${EASE_CSS} 0.28s` }}
      >
        <div class="mb-5 flex items-center justify-between lg:block">
          <span class="jp-kicker">BANGKOK TH</span>
          <span class="jp-roman lg:mt-2 lg:block">MABIS 2026</span>
        </div>
        <dl class="grid grid-cols-2 gap-x-5 gap-y-2.5 tech-label text-muted-foreground lg:block lg:space-y-2.5">
          <div class="flex justify-between gap-4"><dt>WEEK</dt><dd class="text-foreground tabular-nums">{props.weekLabel}</dd></div>
          <div class="flex justify-between gap-4">
            <dt>DATE</dt>
            <dd class="text-foreground tabular-nums">
              <JapaneseText ja={jaDate()} layout="inline" japaneseClass="ml-1 inline text-[0.7em] opacity-70">
                {props.dateLabel}
              </JapaneseText>
            </dd>
          </div>
          <div class="flex justify-between gap-4"><dt>CYCLE</dt><dd class="text-foreground">FRIDAY</dd></div>
          <div class="flex justify-between gap-4"><dt>INDEX</dt><dd class="text-foreground tabular-nums">10</dd></div>
        </dl>
        <div class="my-5 h-px bg-foreground/15" />
        <p class="jp-kicker">SCROLL TO CONTINUE</p>
      </aside>
    </section>
  );
}
