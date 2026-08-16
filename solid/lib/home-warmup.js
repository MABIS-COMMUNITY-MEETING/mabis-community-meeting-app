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
export async function warmHomeRoute(onProgress) {
  const constrained = isConstrainedNetwork();

  const modules = (constrained ? SECTION_MODULES.slice(0, 3) : SECTION_MODULES)
    .map(({ label, load }) => ({ label, run: load }));
  const data = constrained ? dataTasks().slice(0, 4) : dataTasks();
  const tasks = [...modules, ...data];

  let complete = 0;
  onProgress?.({
    progress: 14,
    detail: constrained ? "ADAPTIVE / FIRST VIEW" : "SECTIONS 01–10",
  });

  await Promise.allSettled(tasks.map(async ({ label, run }) => {
    try {
      await run();
    } finally {
      complete += 1;
      onProgress?.({
        progress: 14 + Math.round((complete / tasks.length) * 80),
        detail: label,
      });
    }
  }));
}
