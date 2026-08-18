import { Show, For } from "solid-js";
import { createStore } from "solid-js/store";
import { useQuery } from "@tanstack/solid-query";
import { ChevronDown, ChevronRight } from "lucide-solid";
import { format } from "date-fns";
import { formatWeekFull, groupByWeek } from "@/lib/weekHistory";
import { PageNav, PageFooter, SummerPageNav, SummerPageFooter } from "~/components/page-chrome";
import { JapaneseText } from "~/components/primitives";
import { useHomeLayout } from "~/lib/prefs";

/*
 * ArchivePage — shared implementation for the Announcements and News archives.
 *
 * The React build has these as two separate pages (AnnouncementsHistory 84
 * lines, NewsHistory 82) that are line-for-line identical apart from the
 * entity, the labels, and a "pinned" count that only announcements have. They
 * had already begun to drift — the two headline clamps differ
 * (2.45rem/12vw vs 2.65rem/13vw) for no design reason.
 *
 * One parameterised page removes that whole class of drift. Everything
 * genuinely different is a prop.
 *
 * `openWeeks` is a store so expanding one week does not invalidate the others.
 *
 * TWO STYLES, ONE PAGE. Boss style keeps the editorial treatment: the N°
 * caption, the oversized display title, the fixed nav. Summer style drops all
 * of that for the original MABIS bar — a sticky header carrying the title and
 * count, and nothing between it and the list.
 *
 * Only the chrome branches. The week accordion below is shared verbatim,
 * because it was already Summer's own card vocabulary (`bg-card rounded-2xl
 * border shadow-sm`) and the editorial layer never overrode it. Duplicating
 * it per style is how the two would drift apart.
 */
export default function ArchivePage(props) {
  const [openWeeks, setOpenWeeks] = createStore({});
  const layout = useHomeLayout();
  const boss = () => layout() === "boss";

  const query = useQuery(() => ({
    queryKey: [props.queryKey],
    queryFn: () => props.fetch(),
  }));

  const items = () => query.data || [];

  const weeks = () =>
    groupByWeek(
      items().map((r) => ({ ...r, archive_date: r.published_date || r.created_date })),
      "archive_date",
    );

  const itemCount = () => `${items().length} ${props.itemNoun}${items().length !== 1 ? "s" : ""}`;

  return (
    <div class={`min-h-screen ${boss() ? "bg-background" : "summer-page"}`}>
      <Show
        when={boss()}
        fallback={
          <SummerPageNav
            title={props.summerTitle}
            ja={props.subtitleJa}
            meta={`${itemCount()} · Secondary Community Meeting App`}
          />
        }
      >
        <PageNav label={props.navLabel} />
      </Show>

      <main
        class={
          boss()
            ? "mx-auto max-w-7xl px-4 pb-2 pt-20 sm:px-8 sm:pt-32"
            : "mx-auto max-w-7xl px-4 pb-2 pt-8 sm:px-5"
        }
      >
        {/* The editorial masthead. Summer style has none — its header already
            said what page this is, which is the whole point of the bar. */}
        <Show when={boss()}>
          <div class="mb-10 sm:mb-14">
            <JapaneseText
              as="div"
              ja={props.archiveJa}
              class="block tech-label text-primary mb-4"
              japaneseClass="text-[0.8em] normal-case tracking-normal"
            >
              {props.archiveLabel}
            </JapaneseText>

            <h1 class={`font-display ${props.titleClamp || "text-[clamp(2.65rem,13vw,4.5rem)]"} font-light leading-[0.9] tracking-ultra sm:text-7xl md:text-8xl`}>
              {props.title}
            </h1>

            <p lang="ja" class="mt-1 text-sm text-muted-foreground">{props.subtitleJa}</p>

            <div class="mt-6 flex flex-wrap items-center gap-3 tech-label text-muted-foreground">
              <span>
                {items().length}{" "}
                <span lang="ja" class="normal-case tracking-normal text-[0.8em]">{props.countJa}</span>
              </span>
              <span class="h-1 w-1 bg-primary" />
              <JapaneseText as="span" ja="週ごとにグループ化" japaneseClass="text-[0.8em] normal-case tracking-normal">
                GROUPED BY WEEK
              </JapaneseText>
              <span class="h-1 w-1 bg-primary" />
              <span>MABIS</span>
            </div>
          </div>
        </Show>

        <Show when={weeks().length === 0}>
          <div class="border border-border bg-card p-8 text-center sm:rounded-2xl sm:p-16">
            <JapaneseText as="p" ja={props.emptyJa} class="block text-muted-foreground text-lg" japaneseClass="text-[0.7em] block mt-1">
              {props.emptyText}
            </JapaneseText>
            <JapaneseText as="p" ja={props.emptyHintJa} class="block text-muted-foreground text-sm mt-1" japaneseClass="text-[0.8em] block mt-1">
              {props.emptyHint}
            </JapaneseText>
          </div>
        </Show>

        <div class="space-y-3">
          <For each={weeks()}>
            {([week, weekItems]) => {
              const isOpen = () => !!openWeeks[week];
              const pinned = () => weekItems.filter((a) => a.pinned).length;

              return (
                <div class="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <button
                    class="flex w-full flex-col items-stretch gap-3 px-4 py-4 text-left transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6"
                    onClick={() => setOpenWeeks(week, (v) => !v)}
                    aria-expanded={isOpen()}
                  >
                    <div class="flex items-center gap-2 sm:gap-3">
                      <Show when={isOpen()} fallback={<ChevronRight class="w-4 h-4 text-muted-foreground" />}>
                        <ChevronDown class="w-4 h-4 text-muted-foreground" />
                      </Show>
                      <div class="text-left">
                        <p class="font-semibold text-foreground text-base">{formatWeekFull(week)}</p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                          {weekItems.length} {props.itemNoun}{weekItems.length !== 1 ? "s" : ""}
                          <Show when={props.showPinned && pinned() > 0}>{` · ${pinned()} pinned`}</Show>
                        </p>
                      </div>
                    </div>
                  </button>

                  <Show when={isOpen()}>
                    <div class="space-y-3 border-t border-border px-4 py-4 sm:px-6">
                      <For each={weekItems}>
                        {(a) => (
                          <div class="rounded-xl border border-border p-3 bg-card">
                            <div class="mb-0.5 flex flex-wrap items-center gap-2">
                              <span class="font-semibold text-sm text-foreground">{a.title}</span>
                              <Show when={props.showPinned && a.pinned}>
                                <span class="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase">
                                  Pinned <span lang="ja" class="normal-case">ピン留め</span>
                                </span>
                              </Show>
                              <span class="text-xs text-muted-foreground ml-auto">
                                {a.published_date || a.created_date
                                  ? format(new Date(a.published_date || a.created_date), "d MMM yyyy")
                                  : ""}
                              </span>
                            </div>

                            <Show when={a.body}>
                              <p class="text-sm text-muted-foreground">{a.body}</p>
                            </Show>
                            <Show when={a.image_url}>
                              <img src={a.image_url} alt={a.title} loading="lazy" class="mt-2 rounded-lg max-h-40 object-cover" />
                            </Show>
                            <Show when={a.video_url}>
                              <video src={a.video_url} controls preload="none" class="mt-2 rounded-lg max-h-40 w-full" />
                            </Show>

                            <p class="text-[11px] text-muted-foreground mt-0.5">— {a.author_name}</p>
                          </div>
                        )}
                      </For>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <Show when={boss()} fallback={<SummerPageFooter />}>
          <PageFooter />
        </Show>
      </main>
    </div>
  );
}
