import { onMount, onCleanup, lazy, Suspense, For, Show } from "solid-js";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { LazySection, EditorialSection, HomeSectionIndex, HomeMasthead } from "~/components/home/shell";
import { useQuery } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import { installScrollStateClass } from "~/lib/perf";
import { useAuth } from "~/lib/AuthContext";

// Widgets are code-split individually, so a section that never scrolls into
// view never downloads its chunk. Combined with LazySection's shared observer
// this means first paint pays for the masthead and index only.
const LunchMenuWidget = lazy(() => import("~/components/LunchMenuWidget"));
const ScheduleWidget = lazy(() => import("~/components/ScheduleWidget"));
const JobsWidget = lazy(() => import("~/components/JobsWidget"));
const DiscussionWidget = lazy(() => import("~/components/DiscussionWidget"));
const CalendarWidget = lazy(() => import("~/components/CalendarWidget"));

/**
 * Home — SolidJS port of src/pages/Home.jsx (shell).
 *
 * The ten editorial sections and their copy are carried over verbatim,
 * including the Japanese companion text. Widgets are mounted through
 * LazySection exactly as before; each one is its own migration task, so they
 * render as reserved placeholders here rather than being faked.
 *
 * Why this page is cheap to scroll:
 *   · every section is `content-visibility: auto`, so off-screen sections are
 *     skipped for layout and paint entirely;
 *   · one shared IntersectionObserver drives all ten sections, not ten;
 *   · the only scroll listener on the page is passive and rAF-coalesced, and
 *     it writes a class rather than touching the reactive graph;
 *   · nothing here reads layout (offsetTop/getBoundingClientRect) during
 *     scroll, so there is no forced synchronous layout.
 */

const SECTIONS = [
  {
    index: "01", label: "MEETING MODE", jaLabel: "ミーティング開始", height: 320,
    description: "Starts the Friday meeting for everyone at once. The chair or a teacher presses this — then the whole group follows the same screen.",
    jaDescription: "金曜日のミーティングを全員同時に始めます。司会か先生がボタンを押すと、みんなが同じ画面を見ながら進みます。",
  },
  {
    index: "02", label: "ANNOUNCEMENTS", jaLabel: "お知らせ", height: 360,
    description: "Short notices from teachers and staff. The newest one is always at the top.",
    jaDescription: "先生やスタッフからの短いお知らせです。新しいものが常に一番上に表示されます。",
  },
  {
    index: "03", label: "DISCUSSION", jaLabel: "話し合い", height: 560,
    description: "Anything you want the group to talk about on Friday. Anyone can add one — write your topic and pick your name.",
    jaDescription: "金曜日にみんなで話し合いたいことを書きます。誰でも追加できます。テーマを書いて名前を選んでください。",
  },
  {
    index: "04", label: "JOBS AND ROTATION", jaLabel: "係とローテーション", height: 560,
    description: "Who is doing which job, and when your turn comes round. Tick your job off once you have done it.",
    jaDescription: "誰がどの係をしているか、自分の番がいつ来るかがわかります。終わったらチェックを入れてください。",
  },
  {
    index: "05", label: "CALENDAR", jaLabel: "カレンダー", height: 620,
    description: "Events, holidays and birthdays coming up. Tap any day to see what is on.",
    jaDescription: "これからの予定・祝日・誕生日がわかります。日付をタップすると詳しい内容が見られます。",
  },
  {
    index: "06", label: "SCHEDULE", jaLabel: "スケジュール", height: 420,
    description: "The normal class timetable for the week.",
    jaDescription: "今週のふだんの時間割です。",
  },
  {
    index: "07", label: "LOST AND FOUND", jaLabel: "落とし物", height: 420,
    description: "Lost something? Add it here so people can look out for it. Found something? Check whether anyone is missing it.",
    jaDescription: "何かなくしましたか？ここに追加すると、みんなが気にかけてくれます。何かを見つけたら、探している人がいないか確認してください。",
  },
  {
    index: "08", label: "LUNCH MENU", jaLabel: "ランチメニュー", height: 420,
    description: "What is for snack and lunch on each day this week.",
    jaDescription: "今週の各曜日のおやつとランチの内容です。",
  },
  {
    index: "09", label: "NEWS", jaLabel: "ニュース", height: 480,
    description: "Longer stories and updates from around the school.",
    jaDescription: "学校のいろいろな出来事についての、少し長めの記事です。",
  },
  {
    index: "10", label: "MEMBERS", jaLabel: "メンバー", height: 560,
    description: "Everyone in the community, and the job or role each person has right now.",
    jaDescription: "コミュニティの全員と、それぞれが今担当している係や役割がわかります。",
  },
];

const WIDGETS = {
  "03": DiscussionWidget,
  "04": JobsWidget,
  "05": CalendarWidget,
  "06": ScheduleWidget,
  "08": LunchMenuWidget,
};

export default function Home() {
  const auth = useAuth();
  const isAdmin = () => {
    const role = auth.user()?.role_override || auth.user()?.role;
    return role === "admin" || role === "editor";
  };

  // Fetched once here and passed down, mirroring the React page: the widgets
  // that need the roster all share this single query rather than each issuing
  // its own.
  const membersQuery = useQuery(() => ({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 200),
  }));
  const members = () => membersQuery.data || [];

  onMount(() => {
    const stop = installScrollStateClass();
    onCleanup(stop);
  });

  // Computed once. Not signals — nothing here changes after mount, so putting
  // it in the reactive graph would only add cost.
  const now = new Date();
  const weekLabel = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  const dateLabel = format(now, "dd.MM.yyyy");

  return (
    <div class="editorial-home min-h-screen bg-background overflow-x-hidden">
      <main class="mx-auto max-w-[1600px] px-4 pb-8 pt-20 sm:px-10 sm:pt-32">
        <HomeMasthead weekLabel={weekLabel} dateLabel={dateLabel} date={now} />

        <div class="pb-6 pt-5 sm:pb-10 sm:pt-8">
          <HomeSectionIndex />
        </div>

        <div class="space-y-12 sm:space-y-24">
          <For each={SECTIONS}>
            {(s) => (
              <EditorialSection
                index={s.index}
                label={s.label}
                jaLabel={s.jaLabel}
                description={s.description}
                jaDescription={s.jaDescription}
                intrinsicHeight={s.height + 160}
              >
                <LazySection minHeight={s.height}>
                  {/* Ported widgets render here; the rest still reserve their
                      exact final height, so swapping one in shifts nothing. */}
                  <Show
                    when={WIDGETS[s.index]}
                    fallback={
                      <div
                        class="lazy-section-placeholder"
                        style={{
                          "--lazy-min-height": `${s.height}px`,
                          "contain-intrinsic-size": `auto ${s.height}px`,
                        }}
                        aria-hidden
                      />
                    }
                  >
                    {(Widget) => (
                      <Suspense
                        fallback={
                          <div
                            class="lazy-section-placeholder"
                            style={{ "--lazy-min-height": `${s.height}px` }}
                            aria-hidden
                          />
                        }
                      >
                        {(() => {
                          const W = Widget();
                          return <W isAdmin={isAdmin()} members={members()} />;
                        })()}
                      </Suspense>
                    )}
                  </Show>
                </LazySection>
              </EditorialSection>
            )}
          </For>
        </div>
      </main>
    </div>
  );
}
