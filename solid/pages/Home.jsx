import { createSignal, onMount, onCleanup, lazy, Suspense, For, Show } from "solid-js";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import { LazySection, EditorialSection, HomeSectionIndex, HomeMasthead } from "~/components/home/shell";
import { useQuery } from "@tanstack/solid-query";
import { Settings, Palette } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { installScrollStateClass } from "~/lib/perf";
import { useAuth } from "~/lib/AuthContext";
import { usePresenceHeartbeat } from "~/lib/usePresence";
import SiteHeader from "~/components/SiteHeader";
import ThemeSwitcher from "~/components/ThemeSwitcher";
import IdleMount from "~/components/IdleMount";

const SettingsModal = lazy(() => import("~/components/SettingsModal"));
const MabisAIAssistant = lazy(() => import("~/components/MabisAIAssistant"));
const FeedbackWidget = lazy(() => import("~/components/FeedbackWidget"));
const ProfileEditor = lazy(() => import("~/components/ProfileEditor"));

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

const ROLE_COLOR_VARS = {
  student: "hsl(var(--role-student))",
  teacher: "hsl(var(--role-teacher))",
  chair: "hsl(var(--role-chair))",
  minutes: "hsl(var(--role-minutes))",
  admin: "hsl(var(--role-admin))",
  editor: "hsl(var(--role-editor))",
};

// Widgets are code-split individually, so a section that never scrolls into
// view never downloads its chunk. Combined with LazySection's shared observer
// this means first paint pays for the masthead and index only.
const LunchMenuWidget = lazy(() => import("~/components/LunchMenuWidget"));
const ScheduleWidget = lazy(() => import("~/components/ScheduleWidget"));
const JobsWidget = lazy(() => import("~/components/JobsWidget"));
const DiscussionWidget = lazy(() => import("~/components/DiscussionWidget"));
const CalendarWidget = lazy(() => import("~/components/CalendarWidget"));
const AnnouncementsWidget = lazy(() => import("~/components/AnnouncementsWidget"));
const NewsWidget = lazy(() => import("~/components/NewsWidget"));
const MeetingModeWidget = lazy(() => import("~/components/MeetingModeWidget"));
const MissingItemsWidget = lazy(() => import("~/components/MissingItemsWidget"));
const MembersWidget = lazy(() => import("~/components/MembersWidget"));

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
  "01": MeetingModeWidget,
  "02": AnnouncementsWidget,
  "03": DiscussionWidget,
  "04": JobsWidget,
  "05": CalendarWidget,
  "06": ScheduleWidget,
  "08": LunchMenuWidget,
  "07": MissingItemsWidget,
  "09": NewsWidget,
  "10": MembersWidget,
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

  const [showSettings, setShowSettings] = createSignal(false);
  const [editingProfile, setEditingProfile] = createSignal(false);

  const effectiveRole = () => auth.user()?.role_override || auth.user()?.role;
  const roleColor = () => ROLE_COLOR_VARS[effectiveRole()] || "hsl(var(--primary))";
  usePresenceHeartbeat();

  // Warm the Settings chunk on hover/focus so the first click is not spent
  // waiting on a network fetch — same fix applied to the React build.
  const preloadSettings = () => { void import("~/components/SettingsModal"); };

  // A function, not an element: SiteHeader renders this in two places
  // (desktop bar + mobile drawer), and in Solid the same nodes cannot occupy
  // both — they would move rather than duplicate.
  const controls = () => (
    <>
      <ThemeSwitcher />
      <button
        onMouseEnter={preloadSettings}
        onFocus={preloadSettings}
        onPointerDown={preloadSettings}
        onClick={() => setShowSettings(true)}
        data-cursor="SET"
        title="Settings"
        class="h-9 w-9 flex items-center justify-center border border-foreground/30 bg-background text-foreground hover:bg-foreground hover:text-background transition-colors"
      >
        <Settings class="w-4 h-4" />
      </button>

      <div class="flex items-center gap-2.5 pl-1">
        <div class="relative shrink-0">
          <div
            class="h-9 w-9 overflow-hidden flex items-center justify-center bg-card"
            style={{ border: `2px solid ${roleColor()}`, "box-sizing": "border-box" }}
          >
            <Show
              when={auth.user()?.avatar_url}
              fallback={<img src={MABIS_LOGO} alt="avatar" class="w-full h-full object-contain p-0.5" />}
            >
              <img src={auth.user().avatar_url} alt="avatar" class="w-full h-full object-cover" />
            </Show>
          </div>
          <button
            onClick={() => setEditingProfile(!editingProfile())}
            title="Customize Profile Picture"
            class="absolute -bottom-1 -right-1 h-5 w-5 flex items-center justify-center bg-card border border-foreground/30 text-primary"
          >
            <Palette class="w-3 h-3" />
          </button>
        </div>
        <span class="text-xs tech-label text-foreground hidden lg:inline">
          {auth.user()?.full_name?.split(" ")[0]?.toUpperCase() || "USER"}
        </span>
        <button
          onClick={() => auth.logout()}
          data-cursor="EXIT"
          class="liquid-btn tech-label px-3.5 py-2 border border-foreground/30 bg-background text-foreground"
        >
          SIGN OUT
        </button>
      </div>
    </>
  );

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
      <SiteHeader rightSlot={controls} />

      <Show when={editingProfile()}>
        <Suspense fallback={null}>
          <ProfileEditor open onClose={() => setEditingProfile(false)} />
        </Suspense>
      </Show>

      <Show when={showSettings()}>
        <Suspense fallback={null}>
          <SettingsModal open onClose={() => setShowSettings(false)} isAdmin={isAdmin()} />
        </Suspense>
      </Show>

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
                          return (
                            <W
                              isAdmin={isAdmin()}
                              members={members()}
                              canChangeRoles={isAdmin()}
                              canStart={isAdmin()}
                              onStartMeeting={() => window.dispatchEvent(new CustomEvent("startMeetingMode"))}
                            />
                          );
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

      {/* Deferred until the browser is idle, as in React. JobReminder belongs
          in here too once it is ported. */}
      <IdleMount timeout={1800}>
        <Suspense fallback={null}>
          <MabisAIAssistant />
          <FeedbackWidget />
        </Suspense>
      </IdleMount>
    </div>
  );
}
