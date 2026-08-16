import { base44 } from "@/api/base44Client";
import { isConstrainedNetwork } from "@/lib/performance-tier";
import { queryClientInstance } from "~/lib/query-client";
import { getWeekLabel } from "~/lib/weeks";

/*
 * What the "CACHING STUFF" screen is actually for.
 *
 * The loading screen was showing that label while doing nothing: Home's chunk
 * downloaded, the screen went away, and only THEN did ten widgets mount and
 * fire sixteen queries — so every widget started from zero at the moment the
 * user could finally see them. The wait happened after the loading screen
 * rather than during it.
 *
 * This warms both halves of that cost while the screen is up:
 *
 *   · the widget chunks, so mounting is not a download; and
 *   · the first read each widget performs, primed into the query cache under
 *     the EXACT key that widget uses.
 *
 * The keys below must match the widgets character for character. A prefetch
 * under ["topics"] when the widget asks for ["topics", "2026-W34"] is a wasted
 * request that caches nothing — the widget still starts from zero and the warm
 * up has made the page slower, not faster. Anything changed here has to be
 * changed in the widget too.
 *
 * Everything runs through Promise.allSettled: a warm-up is an optimisation, so
 * one failing request must never keep the user on the loading screen.
 *
 * dataTasks() is deliberately the SAME five reads as the React source
 * (src/lib/home-route-warmup.js): Members, Birthdays, Announcements,
 * Discussion, Attendance — "first-view critical" only. An earlier revision of
 * this file had grown to eleven, adding Jobs/Rotation/Schedule/Lost and
 * Found/Lunch Menu/News/Calendar on top — none of which are needed for first
 * paint, and all of them racing the five that ARE against the same bandwidth
 * and backend capacity. That's a real cost, not just a longer list: with ten
 * section-module imports also in flight, twenty-one concurrent tasks meant
 * every one of them — including Members — sat and waited its turn more often
 * than the tuned five-task set ever did. The seven removed reads still
 * happen — each of those widgets fetches for itself on mount, same as any
 * cache miss — they just don't get to hold up the loading screen doing it.
 */

const SECTION_MODULES = [
  /*
   * Section 01 is Start Meeting — the first thing on the page, and it was the
   * only widget missing from this list, so the one widget guaranteed to be
   * on screen was the one guaranteed not to be warmed.
   */
  { label: "SECTION 01 / 10", load: () => import("~/components/MeetingModeWidget") },
  { label: "SECTION 02 / 10", load: () => import("~/components/AnnouncementsWidget") },
  { label: "SECTION 03 / 10", load: () => import("~/components/DiscussionWidget") },
  { label: "SECTION 04 / 10", load: () => import("~/components/JobsWidget") },
  { label: "SECTION 05 / 10", load: () => import("~/components/CalendarWidget") },
  { label: "SECTION 06 / 10", load: () => import("~/components/ScheduleWidget") },
  { label: "SECTION 07 / 10", load: () => import("~/components/MissingItemsWidget") },
  { label: "SECTION 08 / 10", load: () => import("~/components/LunchMenuWidget") },
  { label: "SECTION 09 / 10", load: () => import("~/components/NewsWidget") },
  { label: "SECTION 10 / 10", load: () => import("~/components/MembersWidget") },
  /*
   * Not one of the 10 numbered sections — these two are nested lazy imports
   * *inside* section 03. DiscussionWidget above is warmed like every other
   * section, but it unconditionally renders <MeetingMinutes>, which
   * unconditionally renders <DocsEditor> (Quill) — neither is gated behind
   * scroll or interaction, so once DiscussionWidget mounts both start
   * downloading anyway, just as a two-step network waterfall (mount →
   * discover MeetingMinutes needs fetching → fetch it → discover DocsEditor
   * needs fetching → fetch that) instead of in parallel with everything else
   * during the loading screen. Warming them here turns that waterfall into
   * one more concurrent download alongside the ten sections.
   *
   * Deliberately last in the list: on a constrained connection the slice(0, 3)
   * below still cuts them, same as section chunks 4–10 — DocsEditor alone is
   * ~70 KiB gzip, the single heaviest chunk in the app after the entry bundle,
   * and that's real bandwidth cost on a slow link, not something to force.
   */
  { label: "DISCUSSION / MINUTES EDITOR", load: () => import("~/components/MeetingMinutes") },
  { label: "DISCUSSION / DOCS ENGINE", load: () => import("~/components/DocsEditor") },
];

function dataTasks() {
  const weekLabel = getWeekLabel(new Date());
  const prefetch = (queryKey, queryFn) => () =>
    queryClientInstance.prefetchQuery({ queryKey, queryFn });

  return [
    { label: "DATA / MEMBERS", run: prefetch(["members"], () => base44.entities.Member.list("name", 200)) },
    { label: "DATA / BIRTHDAYS", run: prefetch(["birthdays"], () => base44.entities.Birthday.list("name", 200)) },
    { label: "DATA / ANNOUNCEMENTS", run: prefetch(["announcements"], () => base44.entities.Announcement.list("-created_date", 50)) },
    {
      label: "DATA / DISCUSSION",
      run: prefetch(["topics", weekLabel], () => base44.entities.DiscussionTopic.filter(
        { week_label: weekLabel }, "-created_date", 100,
      )),
    },
    {
      // Matches AttendancePanel.jsx's own queryKey exactly — was missing
      // from this file entirely before, unlike the React source which has
      // always had it.
      label: "DATA / ATTENDANCE",
      run: prefetch(["attendance", weekLabel], () => base44.entities.Attendance.filter({ week_label: weekLabel })),
    },
  ];
}

/**
 * Warm Home's sections and prime their first reads.
 *
 * On a metered or slow connection this drops to the sections and data actually
 * visible first — speculatively pulling ten datasets over 2G would cost the
 * user more than the wait it saves.
 */
/*
 * Hand the main thread back between background kickoffs.
 *
 * The fetches themselves are async and cheap to start, but each resolved chunk
 * has to be EVALUATED and each response parsed — and firing thirteen of those
 * in one synchronous burst builds a long task that blocks input. The user is
 * reading Home while this runs; a tap landing during that burst waits for it.
 *
 * scheduler.yield() resumes at the FRONT of the queue, so unlike
 * setTimeout(0) the warm-up does not lose its place behind unrelated work —
 * it just stops hogging. Chrome 129+; the timeout path is the fallback and is
 * merely adequate.
 *
 * Blocking tasks deliberately do NOT yield: they gate the loading screen, so
 * spreading them out would delay the very paint they exist to bring forward.
 */
const yieldToBrowser = typeof scheduler !== "undefined" && typeof scheduler.yield === "function"
  ? () => scheduler.yield()
  : () => new Promise((resolve) => setTimeout(resolve, 0));

export async function warmHomeRoute(onProgress) {
  const constrained = isConstrainedNetwork();

  const modules = (constrained ? SECTION_MODULES.slice(0, 3) : SECTION_MODULES)
    .map(({ label, load }) => ({ label, run: load }));
  /*
   * Data tasks stay un-sliced even when constrained. dataTasks() is already
   * the trimmed-down, first-view-critical set (see the comment above it) —
   * five small JSON reads, not chunk downloads. Slicing to the first four
   * used to silently drop Attendance (index 4 of 5), which meant the one
   * connection class this warm-up exists for was the one where Attendance
   * always paid for a cold fetch after mount instead of reading warm from
   * cache like the other four. The module list above is where the real
   * bandwidth cost lives, and that's still trimmed on constrained networks.
   */
  const data = dataTasks();

  /*
   * The remaining widget reads. These are NOT awaited — see below — so they
   * cost nothing up front, but they mean Jobs, Lunch, News, Lost and Found and
   * Calendar are warm by the time anyone scrolls to them instead of each
   * paying a cold fetch on mount.
   *
   * Skipped entirely on a constrained link, where speculative reads cost the
   * user more than the wait they save.
   */
  const deferredData = constrained ? [] : [...deferredDataTasks(), ...deferredModuleTasks()];
  const tasks = [...modules, ...data];

  let complete = 0;
  onProgress?.({
    progress: 14,
    detail: constrained ? "ADAPTIVE / FIRST VIEW" : "SECTIONS 01–10",
  });

  /*
   * Only the first viewport is worth WAITING for.
   *
   * Awaiting every task meant the loading screen stayed up while section 10's
   * member list downloaded, despite section 10 being nine screens away. These
   * three sections and their reads are what is actually on screen when Home
   * paints; the rest keep warming behind it.
   */
  const FIRST_VIEW = new Set([
    "SECTION 01 / 10", "SECTION 02 / 10", "SECTION 03 / 10",
    "DATA / MEMBERS", "DATA / ANNOUNCEMENTS", "DATA / DISCUSSION",
    "DATA / BIRTHDAYS", "DATA / ATTENDANCE",
  ]);

  const blocking = tasks.filter((t) => FIRST_VIEW.has(t.label));
  const background = [...tasks.filter((t) => !FIRST_VIEW.has(t.label)), ...deferredData];

  /*
   * Fired, never awaited: these continue past the loading screen. Kicked off
   * one at a time with a yield between, so starting thirteen of them cannot
   * become a single long task while the user is trying to interact.
   */
  void (async () => {
    for (const { run } of background) {
      try { void Promise.resolve(run()).catch(() => {}); } catch { /* best effort */ }
      await yieldToBrowser();
    }
  })();

  await Promise.allSettled(blocking.map(async ({ label, run }) => {
    try {
      await run();
    } finally {
      complete += 1;
      onProgress?.({
        progress: 14 + Math.round((complete / blocking.length) * 80),
        detail: label,
      });
    }
  }));
}

/* Everything below the first viewport. Same prefetch contract as dataTasks():
   the keys must match the widgets exactly or the read is wasted. */
/*
 * Chunks that sit BELOW a warmed section and so are never reached by warming
 * that section.
 *
 * DocsEditor is the case that matters: section 03 is warmed, but the editor is
 * lazy inside MeetingMinutes inside DiscussionWidget, so warming the section
 * stops one level short. It is ~236 KB with Quill, and IdleMount only starts
 * fetching it once the page is interactive — which is exactly when the user is
 * most likely to look at the minutes.
 *
 * Background, never blocking: it must not delay first paint, it just needs to
 * be in cache before IdleMount asks for it.
 */
function deferredModuleTasks() {
  return [
    { label: "EDITOR / MINUTES", run: () => import("~/components/MeetingMinutes") },
    { label: "EDITOR / DOCUMENT", run: () => import("~/components/DocsEditor") },
  ];
}

function deferredDataTasks() {
  const weekLabel = getWeekLabel(new Date());
  const prefetch = (queryKey, queryFn) => () =>
    queryClientInstance.prefetchQuery({ queryKey, queryFn });

  return [
    { label: "DATA / JOBS", run: prefetch(["assignments"], () => base44.entities.JobAssignment.list("-created_date", 500)) },
    { label: "DATA / ROTATION", run: prefetch(["job-definitions"], () => base44.entities.JobDefinition.list("title", 100)) },
    { label: "DATA / LOST AND FOUND", run: prefetch(["missing-items"], () => base44.entities.MissingItem.list("-created_date", 200)) },
    { label: "DATA / LUNCH MENU", run: prefetch(["lunchmenu", weekLabel], () => base44.entities.LunchMenu.filter({ week_label: weekLabel })) },
    { label: "DATA / NEWS", run: prefetch(["news"], () => base44.entities.NewsItem.list("-created_date", 100)) },
    { label: "DATA / CALENDAR", run: prefetch(["calendarevents"], () => base44.entities.CalendarEvent.list("-created_date", 500)) },
  ];
}
