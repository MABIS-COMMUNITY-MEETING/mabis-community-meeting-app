import { createMemo, Show, For } from "solid-js";
import { createStore } from "solid-js/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { ChevronDown, ChevronRight, Trash2, Users } from "lucide-solid";
import { isFriday } from "date-fns";
import { base44 } from "@/api/base44Client";
import { historyWeeks, minutesByWeek, topicsToMinutesHtml, isBlankDocument } from "@/lib/minutes-format";
import { weekLabelToDate, formatWeekFull, getWeekLabel } from "~/lib/weeks";
import { PageNav, PageFooter, OpenMoji } from "~/components/page-chrome";
import { JapaneseText } from "~/components/primitives";

/*
 * History — Solid port of src/pages/History.jsx.
 *
 * The week helpers come from ~/lib/weeks rather than being redefined here.
 * The React file carries its own private copies of getCurrentWeekLabel,
 * weekLabelToDate and formatWeekFull — the same three functions also exist in
 * DiscussionWidget and lib/weekHistory, and they had already drifted apart.
 * One shared copy is the whole reason lib/weeks.js exists.
 *
 * `openWeeks` is a STORE, not a signal holding an object: expanding one week
 * should not invalidate the accordion state of the others.
 *
 * Every week renders as ONE document, mirroring what DiscussionWidget's
 * normal view shows on Home — which is document-only now, no separate topic
 * cards. A week with a saved `__meeting_notes__` record uses that HTML
 * verbatim; a week that never had its document opened (so nothing was ever
 * saved) is synthesised on the fly with the same topicsToMinutesHtml() that
 * MeetingMinutes.jsx uses to seed a week's editor the first time it opens —
 * so an unopened week reads exactly as it WOULD if someone opened it live,
 * not as a separate "legacy topic card" layout. There is deliberately no
 * second rendering path here to drift out of sync with the live document.
 */
export default function History() {
  const queryClient = useQueryClient();
  const [openWeeks, setOpenWeeks] = createStore({});

  const topicsQuery = useQuery(() => ({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  }));
  const attendanceQuery = useQuery(() => ({
    queryKey: ["attendance"],
    queryFn: () => base44.entities.Attendance.list("-created_date", 200),
  }));
  const membersQuery = useQuery(() => ({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 300),
  }));

  const allTopics = () => topicsQuery.data || [];
  const allAttendance = () => attendanceQuery.data || [];
  const allMembers = () => membersQuery.data || [];

  /*
   * Which weeks are history, and what each one left behind.
   *
   * Both live in lib/minutes-format.js rather than here — same reason
   * resolveMinutesDocument does. They are the rules that decide what a past
   * meeting IS, they are pure, and check-minutes-format.mjs exercises them
   * directly (including the week-ordering cases, which a component cannot be
   * tested for). This page just renders the answer.
   */
  const currentWeek = getWeekLabel(new Date());
  const minutesFor = createMemo(() => minutesByWeek(allTopics()));
  const pastWeeks = createMemo(() => historyWeeks(allTopics(), { currentWeek }));

  const deleteWeek = useMutation(() => ({
    mutationFn: async (weekLabel) => {
      const weekTopics = allTopics().filter((t) => t.week_label === weekLabel);
      await Promise.all(weekTopics.map((t) => base44.entities.DiscussionTopic.delete(t.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  }));

  return (
    <div class="min-h-screen bg-background">
      <PageNav label=" N°02 — MEETING HISTORY" />

      <main class="mx-auto max-w-7xl px-4 pb-2 pt-20 sm:px-8 sm:pt-32">
        <div class="mb-10 sm:mb-14">
          <JapaneseText
            as="div"
            ja="アーカイブ — 02"
            class="block tech-label text-primary mb-4"
            japaneseClass="text-[0.8em] normal-case tracking-normal"
          >
            {" ARCHIVE — 02"}
          </JapaneseText>
          <h1 class="font-display text-[clamp(2.65rem,13vw,4.5rem)] font-light leading-[0.9] tracking-ultra sm:text-7xl md:text-8xl">
            MEETING<br />HISTORY
          </h1>
          <p lang="ja" class="mt-1 text-sm text-muted-foreground">ミーティング履歴</p>
          <div class="mt-6 flex flex-wrap items-center gap-3 tech-label text-muted-foreground">
            <JapaneseText as="span" ja="過去のミーティング" japaneseClass="text-[0.8em] normal-case tracking-normal">PAST MEETINGS</JapaneseText>
            <span class="h-1 w-1 bg-primary" />
            <JapaneseText as="span" ja="毎週金曜日" japaneseClass="text-[0.8em] normal-case tracking-normal">WEEKLY FRIDAY</JapaneseText>
            <span class="h-1 w-1 bg-primary" />
            <span>MABIS</span>
          </div>
        </div>

        <Show when={pastWeeks().length === 0}>
          <div class="border border-border bg-card p-8 text-center sm:rounded-2xl sm:p-16">
            <JapaneseText
              as="p"
              ja="まだ過去のミーティングはありません。ミーティングが終了するとここに表示されます。"
              class="block text-muted-foreground text-lg"
              japaneseClass="text-[0.7em] block mt-1"
            >
              No past meetings yet. They appear here once a meeting ends.
            </JapaneseText>
            <JapaneseText
              as="p"
              ja="過去の週はミーティングの完全な記録としてここに表示されます"
              class="block text-muted-foreground text-sm mt-1"
              japaneseClass="text-[0.8em] block mt-1"
            >
              Past weeks will appear here as full meeting snapshots
            </JapaneseText>
          </div>
        </Show>

        <div class="space-y-3">
          <For each={pastWeeks()}>
            {(week) => {
              // Raw topic records feeding the count badge and, for a week with
              // no saved document, the synthesised minutes below. Never
              // rendered as cards directly anymore.
              const weekTopics = createMemo(() =>
                allTopics()
                  .filter((t) => t.week_label === week && t.title !== "__meeting_notes__" && t.title !== "__meeting_ended__"));

              const done = () => weekTopics().filter((t) => t.completed).length;
              // The document this week actually shows: its saved minutes if it
              // has any, otherwise the same on-the-fly conversion
              // MeetingMinutes.jsx would seed the editor with. isBlankDocument
              // guards an empty synthesised string the same way it guards a
              // stored one — "<p><br></p>" from an untouched editor must not
              // count as "there is a document" either.
              const displayHtml = createMemo(() => {
                const saved = minutesFor().get(week);
                if (!isBlankDocument(saved)) return saved;
                return topicsToMinutesHtml(allTopics(), week);
              });
              const hasDocument = () => !isBlankDocument(displayHtml());
              const isOpen = () => !!openWeeks[week];
              const att = () => allAttendance().find((a) => a.week_label === week);
              const presentNames = () => att()?.present_names || [];
              const missingMembers = () => allMembers().filter((m) => !presentNames().includes(m.name));

              return (
                <div class="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                  <div
                    role="button"
                    tabindex={0}
                    onClick={() => setOpenWeeks(week, (v) => !v)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setOpenWeeks(week, (v) => !v); }
                    }}
                    aria-expanded={isOpen()}
                    class="flex w-full cursor-pointer flex-col items-stretch gap-3 px-4 py-4 text-left transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  >
                    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                      <Show when={isOpen()} fallback={<ChevronRight class="w-4 h-4 text-muted-foreground" />}>
                        <ChevronDown class="w-4 h-4 text-muted-foreground" />
                      </Show>
                      <div class="text-left">
                        <p class="font-semibold text-foreground text-base">{formatWeekFull(week)}</p>
                        <p class="text-xs text-muted-foreground mt-0.5">
                          <Show when={hasDocument()}>
                            <JapaneseText ja="議事録あり" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Minutes</JapaneseText>
                            <span aria-hidden="true">{" · "}</span>
                          </Show>
                          {weekTopics().length} <span lang="ja">件のトピック</span> · {presentNames().length} <span lang="ja">出席</span>
                          <Show when={missingMembers().length > 0}>
                            {` · ${missingMembers().length} `}<span lang="ja">欠席</span>
                          </Show>
                        </p>
                      </div>
                    </div>

                    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                      {/* A document-only week has no topics to be done — "0/0
                          complete" reads as a failure rather than as nothing to
                          report. */}
                      <Show when={weekTopics().length > 0}>
                        <span class={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          done() === weekTopics().length ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>
                          {done()}/{weekTopics().length} <span lang="ja">完了</span>
                        </span>
                      </Show>

                      <Show when={att()?.meeting_date && !isFriday(new Date(att().meeting_date))}>
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground">
                          <JapaneseText ja="日付変更" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Date moved</JapaneseText>
                        </span>
                      </Show>

                      <Show when={att() && missingMembers().length > 0}>
                        <span class="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">
                          {missingMembers().length} <span lang="ja">欠席</span>
                        </span>
                      </Show>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          /* This deletes every DiscussionTopic row for the week,
                             and any saved minutes live in one of those rows
                             (__meeting_notes__). The old wording said "all
                             topics", which did not warn anyone that the written
                             minutes go with them. */
                          const warning = !isBlankDocument(minutesFor().get(week))
                            ? `Delete the minutes AND all topics from ${formatWeekFull(week)}? This cannot be undone.`
                            : `Delete all topics from ${formatWeekFull(week)}? This cannot be undone.`;
                          if (window.confirm(warning)) deleteWeek.mutate(week);
                        }}
                        class="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={!isBlankDocument(minutesFor().get(week)) ? "Delete this week's minutes and topics" : "Delete this week"}
                        aria-label={`Delete the record of ${formatWeekFull(week)}`}
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <Show when={isOpen()}>
                    <div class="border-t border-border">
                      <Show when={att()}>
                        <div class="border-b border-border bg-red-50/40 px-4 py-4 sm:px-6">
                          <p class="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1.5">
                            <Users class="w-3.5 h-3.5" /> Missing ({missingMembers().length}) · {presentNames().length} present
                            <span lang="ja" class="normal-case text-[0.85em] font-normal">
                              欠席（{missingMembers().length}）・{presentNames().length}名出席
                            </span>
                          </p>
                          <Show
                            when={missingMembers().length > 0}
                            fallback={
                              <p class="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                                <JapaneseText ja="全員出席です" layout="inline" japaneseClass="ml-1 inline text-[0.9em]">Everyone present</JapaneseText>
                                <OpenMoji hexcode="1F389" class="h-4 w-4" />
                              </p>
                            }
                          >
                            <div class="flex flex-wrap gap-1.5">
                              <For each={missingMembers()}>
                                {(m) => (
                                  <span class="text-xs bg-card text-red-600 px-2 py-1 rounded-full border border-red-200 line-through">
                                    {m.name}
                                  </span>
                                )}
                              </For>
                            </div>
                          </Show>
                        </div>
                      </Show>

                      {/*
                        The single document for this week — saved minutes if it
                        has any, otherwise the same conversion the live editor
                        would seed itself with (see topicsToMinutesHtml, above).
                        Rendered on the same .docs-editor-content /
                        .theme-rich-text surface the editor uses, so a week
                        reads here exactly as it was written, or exactly as it
                        would look the moment someone opened it.
                      */}
                      <Show
                        when={hasDocument()}
                        fallback={
                          <div class="px-4 py-6 sm:px-6">
                            <JapaneseText
                              as="p"
                              ja="この週の議事録もトビックも残っていません。"
                              class="block text-sm text-muted-foreground"
                              japaneseClass="mt-1 block text-[0.9em]"
                            >
                              Nothing was written for this week.
                            </JapaneseText>
                          </div>
                        }
                      >
                        <div class="border-b border-border px-4 py-4 sm:px-6">
                          <p class="text-xs font-bold text-primary uppercase mb-3">
                            Minutes <span lang="ja" class="normal-case text-[0.85em] font-normal">議事録</span>
                          </p>
                          <div
                            class="docs-editor-content theme-rich-text rounded-lg border border-border px-4 py-3 text-sm leading-relaxed [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                            innerHTML={displayHtml()}
                          />
                        </div>
                      </Show>
                    </div>
                  </Show>
                </div>
              );
            }}
          </For>
        </div>

        <PageFooter />
      </main>
    </div>
  );
}
