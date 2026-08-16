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
 * Opt-in timing for the "CACHING STUFF" phase (?perf=1 only).
 *
 * Answers three things that cannot be inferred from source: how long each warm
 * task takes, whether it SUCCEEDS or fails, and — the open question — whether
 * prefetches fired before auth resolved come back 401. If they do, the warm-up
 * is issuing throwaway requests and then the widgets refetch, making a first
 * visit slower rather than faster.
 */
const TRACE = typeof window !== "undefined"
  && new URLSearchParams(window.location.search).get("perf") === "1";

const traceRows = [];

function traceTask(label, startedAt, error) {
  if (!TRACE) return;
  traceRows.push({
    task: label,
    ms: Math.round(performance.now() - startedAt),
    at: Math.round(startedAt),
    status: error ? (error.status ?? error?.response?.status ?? "FAILED") : "ok",
    reason: error ? String(error.message || error).slice(0, 60) : "",
  });
}

function traceReport(blockingCount) {
  if (!TRACE) return;
  const failed = traceRows.filter((r) => r.status !== "ok");
  const unauthorized = traceRows.filter((r) => r.status === 401 || r.status === 403);
  /* eslint-disable no-console */
  console.log("%c[warmup] CACHING STUFF breakdown", "font-weight:bold");
  console.table(traceRows.slice().sort((a, b) => b.ms - a.ms));
  console.log("[warmup] blocking tasks:", blockingCount,
    "| total tasks:", traceRows.length,
    "| failed:", failed.length,
    "| 401/403 (fired before auth?):", unauthorized.length);
  console.log("[warmup] slowest:", traceRows.slice().sort((a, b) => b.ms - a.ms)[0]);
  if (unauthorized.length) {
    console.warn("[warmup] prefetches were rejected as unauthenticated — these are "
      + "wasted requests and the widgets will refetch. The warm-up must wait for auth.");
  }
  /* eslint-enable no-console */
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
