import { base44 } from "@/api/base44Client";
import { isConstrainedNetwork } from "@/lib/performance-tier";
import { queryClientInstance } from "~/lib/query-client";
import { getWeekLabel } from "~/lib/weeks";
import { runBurstOrdered } from "~/lib/burst-scheduler";

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
 * Bursty, not fair — mark a task as I/O so the scheduler fires it rather than
 * sequencing it.
 *
 * STARTING a fetch is microseconds. The expensive work is parsing the response,
 * and that happens later regardless of how the kickoffs were spaced. An earlier
 * version yielded between each kickoff and paid a real cost — thirteen trips
 * through the task queue, delaying the last request by that much — to avoid a
 * long task that was never in the kickoff loop to begin with.
 *
 * Firing them together also gets every request onto the wire immediately, so
 * they queue against the browser's connection limit instead of against each
 * other, and the whole batch finishes sooner.
 *
 * Chunk imports are NOT tagged: their cost is parse and evaluate, which really
 * does land on this thread, so they are worth sequencing and ordering.
 */
const asIo = (tasks) => tasks.map((task) => ({ ...task, io: true }));

/**
 * Start Home's chunk downloads WITHOUT waiting for auth.
 *
 * Nothing in this list needs a token — they are static JS files. The data
 * warm-up genuinely does need one (firing entity reads before auth resolves
 * sends them unauthenticated, which is a bug this file has already had once),
 * so only the modules move earlier.
 *
 * That matters because /home is gated on both auth round-trips resolving, so
 * the chunks could not even begin downloading until the network had been idle
 * for a full round-trip with nothing else to do.
 *
 * Safe to call more than once, and warmHomeRoute() calls the same loaders
 * again: dynamic import is idempotent, so the second call gets the in-flight
 * or already-resolved module out of the module registry rather than a second
 * download. No memoisation needed here — the platform already does it.
 *
 * Fired all at once rather than through the burst scheduler. Sequencing exists
 * to keep evaluation from blocking input, and there is no input to protect
 * here: the loading screen is up, and getting the requests onto the wire while
 * auth is in flight is the whole point.
 */
export function warmHomeModules() {
  const constrained = isConstrainedNetwork();
  const modules = constrained ? SECTION_MODULES.slice(0, 3) : SECTION_MODULES;

  // Return the real completion promise. ProtectedHome starts this while auth is
  // in flight; loadHomeRoute later awaits the same promise so every numbered
  // section chunk is settled before the loading screen stands down. Nested
  // editor engines stay in deferredModuleTasks() and never hold first paint.
  return Promise.allSettled(modules.map(({ load }) => {
    try {
      return load();
    } catch {
      return undefined;
    }
  }));
}

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
  const deferredData = constrained
    ? []
    : [...asIo(deferredDataTasks()), ...deferredModuleTasks()];
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

  /*
   * Everything below the first viewport, split by what its cost actually is.
   *
   * The reads are marked `io`: calling prefetchQuery is a few microseconds and
   * the wait belongs to the network, so the scheduler fires them all at once
   * and never sequences them. An earlier attempt to burst-order these made
   * things worse for exactly that reason — spacing a fetch only delays its
   * response, and the yields cost more than the ordering saved.
   *
   * The chunk imports are left unmarked, so they are sequenced. Their real
   * cost is parse and evaluate, which lands on the main thread; firing all of
   * them together means those evaluations arrive back-to-back as one
   * unbroken block, which is the pile-up the slice budget exists to break up.
   */
  const background = [
    ...modules.filter((t) => !FIRST_VIEW.has(t.label)),
    ...asIo(data.filter((t) => !FIRST_VIEW.has(t.label))),
    ...deferredData,
  ];

  /*
   * Fired, never awaited: these continue past the loading screen, ordered
   * cheapest-first from what previous visits measured (lib/burst-scheduler.js).
   */
  void runBurstOrdered(background);

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
