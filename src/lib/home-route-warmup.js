import { getISOWeek, getYear, isFriday, nextFriday } from "date-fns";
import { base44 } from "@/api/base44Client";
import { queryClientInstance } from "@/lib/query-client";
import { isConstrainedNetwork } from "@/lib/performance-tier";

const HOME_SECTION_MODULES = [
  { label: "SECTION 02 / 10", load: () => import("@/components/AnnouncementsWidget") },
  { label: "SECTION 03 / 10", load: () => import("@/components/DiscussionWidget") },
  { label: "SECTION 04 / 10", load: () => import("@/components/JobsWidget") },
  { label: "SECTION 05 / 10", load: () => import("@/components/CalendarWidget") },
  { label: "SECTION 06 / 10", load: () => import("@/components/ScheduleWidget") },
  { label: "SECTION 07 / 10", load: () => import("@/components/MissingItemsWidget") },
  { label: "SECTION 08 / 10", load: () => import("@/components/LunchMenuWidget") },
  { label: "SECTION 09 / 10", load: () => import("@/components/NewsWidget") },
  { label: "SECTION 10 / 10", load: () => import("@/components/MembersWidget") },
];

function currentMeetingWeek() {
  const now = new Date();
  const friday = isFriday(now) ? now : nextFriday(now);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function criticalDataTasks() {
  const weekLabel = currentMeetingWeek();
  return [
    {
      label: "DATA / MEMBERS",
      run: () => queryClientInstance.prefetchQuery({
        queryKey: ["members"],
        queryFn: () => base44.entities.Member.list("name", 200),
      }),
    },
    {
      label: "DATA / BIRTHDAYS",
      run: () => queryClientInstance.prefetchQuery({
        queryKey: ["birthdays"],
        queryFn: () => base44.entities.Birthday.list("name", 200),
      }),
    },
    {
      label: "DATA / ANNOUNCEMENTS",
      run: () => queryClientInstance.prefetchQuery({
        queryKey: ["announcements"],
        queryFn: () => base44.entities.Announcement.list("-created_date", 50),
      }),
    },
    {
      label: "DATA / DISCUSSION",
      run: () => queryClientInstance.prefetchQuery({
        queryKey: ["topics", weekLabel],
        queryFn: () => base44.entities.DiscussionTopic.filter(
          { week_label: weekLabel },
          "-created_date",
          100,
        ),
      }),
    },
    {
      label: "DATA / ATTENDANCE",
      run: () => queryClientInstance.prefetchQuery({
        queryKey: ["attendance", weekLabel],
        queryFn: () => base44.entities.Attendance.filter({ week_label: weekLabel }),
      }),
    },
  ];
}

/**
 * Warms code for the numbered Home sections and primes only the first-view
 * read queries. LazySection still controls mounting/render cost. Save-Data and
 * 2G keep the warm-up to the immediately useful sections and smallest dataset.
 */
export async function warmHomeRoute(onProgress) {
  const constrained = isConstrainedNetwork();
  const moduleTasks = (constrained ? HOME_SECTION_MODULES.slice(0, 2) : HOME_SECTION_MODULES)
    .map(({ label, load }) => ({ label, run: load }));
  const dataTasks = criticalDataTasks();
  const tasks = [...moduleTasks, ...(constrained ? dataTasks.slice(0, 4) : dataTasks)];

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
