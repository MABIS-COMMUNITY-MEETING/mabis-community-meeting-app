import { createSignal, createMemo, onMount, Show, For, Index } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import { Eye, Star, MessageSquare, Users, Monitor } from "lucide-solid";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { displayName } from "@/lib/names";
import { detectOS } from "@/lib/detectOS";
import { JapaneseText } from "~/components/primitives";

const CHART_PRIMARY = "hsl(var(--primary))";
const CHART_SECONDARY = "hsl(var(--secondary))";

/**
 * Minimal column chart.
 *
 * This replaced Recharts in the React build, which cost ~102 KiB gzip (plus a
 * lodash isEqual chunk) to render two static bar charts. Recharts measures its
 * container with a ResizeObserver and re-renders an SVG tree on every resize
 * tick; these bars are plain flex children whose heights are a single
 * percentage, so the browser lays them out natively and nothing re-renders.
 *
 * Colours are theme tokens, not fixed hex, so all themes stay correct.
 */
function Columns(props) {
  const max = () => Math.max(1, ...props.data.map((d) => d.value));

  return (
    <div class="flex items-stretch gap-1" style={{ height: `${props.height ?? 220}px` }} role="img" aria-label={props.label}>
      <For each={props.data}>
        {(d) => (
          <div class="flex min-w-0 flex-1 flex-col items-center gap-1">
            <span class="text-[10px] tabular-nums text-muted-foreground">{d.value || ""}</span>
            <div class="flex w-full flex-1 items-end">
              <div
                class="w-full rounded-t-sm"
                style={{
                  height: `${(d.value / max()) * 100}%`,
                  background: props.color,
                  "min-height": d.value > 0 ? "2px" : "0",
                }}
                title={`${d.title || d.label}: ${d.value}`}
              />
            </div>
            <span class="w-full truncate text-center text-[10px] text-muted-foreground">{d.label}</span>
          </div>
        )}
      </For>
    </div>
  );
}

export default function AnalyticsTab(props) {
  const [visits, setVisits] = createSignal(0);

  onMount(() => {
    const count = parseInt(localStorage.getItem("feedback_visits") || "0") + 1;
    localStorage.setItem("feedback_visits", String(count));
    setVisits(count);

    // One VisitLog record per browser session (not per render), so the OS
    // breakdown reflects real people rather than re-renders.
    if (!sessionStorage.getItem("mabis_visit_logged")) {
      sessionStorage.setItem("mabis_visit_logged", "1");
      base44.entities.VisitLog.create({ os: detectOS() }).catch(() => {});
    }
  });

  const visitLogsQuery = useQuery(() => ({
    queryKey: ["visit-logs"],
    queryFn: () => base44.entities.VisitLog.list("-created_date", 2000),
  }));

  const feedback = () => props.feedback || [];
  const members = () => props.members || [];

  const osStats = createMemo(() => {
    const counts = {};
    for (const v of visitLogsQuery.data || []) counts[v.os] = (counts[v.os] || 0) + 1;
    return Object.entries(counts).map(([os, count]) => ({ os, count })).sort((a, b) => b.count - a.count);
  });
  const osTotal = () => osStats().reduce((sum, s) => sum + s.count, 0);

  const ratedFeedback = createMemo(() => feedback().filter((f) => f.rating != null));
  const avgRating = () => {
    const rated = ratedFeedback();
    return rated.length > 0
      ? (rated.reduce((sum, f) => sum + f.rating, 0) / rated.length).toFixed(1)
      : "—";
  };
  const feedbackCount = () => feedback().filter((f) => f.type === "feedback").length;
  const bugCount = () => feedback().filter((f) => f.type === "bug").length;

  const memberStats = createMemo(() => {
    const map = {};
    for (const f of feedback()) {
      const name = f.submitted_by_name || "Anonymous";
      if (!map[name]) {
        map[name] = { name, total: 0, feedback: 0, bugs: 0, ratings: [], member: members().find((m) => displayName(m) === name) };
      }
      map[name].total++;
      if (f.type === "feedback") {
        map[name].feedback++;
        if (f.rating != null) map[name].ratings.push(f.rating);
      } else {
        map[name].bugs++;
      }
    }
    return Object.values(map)
      .map((s) => ({
        ...s,
        avg: s.ratings.length > 0 ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1) : "—",
      }))
      .sort((a, b) => b.total - a.total);
  });

  const ratingData = createMemo(() =>
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((r) => ({
      label: `${r}`,
      title: `Rating ${r}`,
      value: ratedFeedback().filter((f) => f.rating === r).length,
    })));

  // Feedback over the last 8 weeks — real dates.
  const weekData = createMemo(() => {
    const now = new Date();
    return Array.from({ length: 8 }, (_, i) => {
      const weekStart = new Date(now);
      weekStart.setDate(now.getDate() - (7 - i - 1) * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 7);
      const count = feedback().filter((f) => {
        const d = new Date(f.created_date);
        return d >= weekStart && d < weekEnd;
      }).length;
      return { label: format(weekStart, "dd/MM"), title: format(weekStart, "dd/MM/yyyy"), value: count };
    }).reverse();
  });

  return (
    <div class="space-y-6">
      {/* Stats cards */}
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div class="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div class="flex items-center gap-2 mb-1">
            <Eye class="w-4 h-4 text-primary" />
            <p class="text-xs font-bold text-muted-foreground uppercase">Page Visits</p>
          </div>
          <p class="text-3xl font-display font-bold text-foreground">{visits()}</p>
        </div>
        <div class="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div class="flex items-center gap-2 mb-1">
            <Star class="w-4 h-4 text-amber-500" />
            <p class="text-xs font-bold text-muted-foreground uppercase">Avg Rating</p>
          </div>
          <p class="text-3xl font-display font-bold text-foreground">
            {avgRating()}<span class="text-base text-muted-foreground">/10</span>
          </p>
        </div>
        <div class="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div class="flex items-center gap-2 mb-1">
            <MessageSquare class="w-4 h-4 text-blue-500" />
            <p class="text-xs font-bold text-muted-foreground uppercase">Feedback</p>
          </div>
          <p class="text-3xl font-display font-bold text-foreground">{feedbackCount()}</p>
          <p class="text-[10px] text-red-500 mt-0.5">{bugCount()} bugs</p>
        </div>
      </div>

      {/* OS breakdown — one VisitLog per visitor session, across everyone */}
      <div class="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
          <Monitor class="w-4 h-4 text-primary" />
          <JapaneseText as="p" ja="使用OSの内訳" class="block text-sm font-bold text-foreground" japaneseClass="text-[0.8em]">
            OS Usage
          </JapaneseText>
        </div>
        <Show
          when={osStats().length > 0}
          fallback={
            <JapaneseText as="p" ja="まだデータはありません" class="block text-muted-foreground text-sm text-center py-8" japaneseClass="text-[0.85em] block mt-1">
              No data yet
            </JapaneseText>
          }
        >
          <div class="space-y-2.5">
            <For each={osStats()}>
              {({ os, count }) => (
                <div class="flex items-center gap-3">
                  <span class="w-20 shrink-0 text-xs font-medium text-foreground">{os}</span>
                  <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full bg-primary" style={{ width: `${osTotal() > 0 ? (count / osTotal()) * 100 : 0}%` }} />
                  </div>
                  <span class="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                    {count} · {osTotal() > 0 ? Math.round((count / osTotal()) * 100) : 0}%
                  </span>
                </div>
              )}
            </For>
          </div>
        </Show>
      </div>

      {/* Rating distribution */}
      <div class="bg-card rounded-xl border border-border p-5 shadow-sm">
        <p class="text-sm font-bold text-foreground mb-4">Rating Distribution</p>
        <Show
          when={ratedFeedback().length > 0}
          fallback={<p class="text-muted-foreground text-sm text-center py-8">No ratings yet</p>}
        >
          <Columns data={ratingData()} color={CHART_PRIMARY} height={230} label="Rating distribution" />
        </Show>
      </div>

      {/* Feedback over time */}
      <div class="bg-card rounded-xl border border-border p-5 shadow-sm">
        <p class="text-sm font-bold text-foreground mb-4">Feedback Activity (Last 8 Weeks)</p>
        <Show
          when={feedback().length > 0}
          fallback={<p class="text-muted-foreground text-sm text-center py-8">No feedback yet</p>}
        >
          <Columns data={weekData()} color={CHART_SECONDARY} height={190} label="Feedback activity over the last 8 weeks" />
        </Show>
      </div>

      {/* Per-member breakdown */}
      <div class="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div class="flex items-center gap-2 mb-4">
          <Users class="w-4 h-4 text-primary" />
          <p class="text-sm font-bold text-foreground">Member Activity</p>
        </div>
        <Show
          when={memberStats().length > 0}
          fallback={<p class="text-muted-foreground text-sm text-center py-8">No data yet</p>}
        >
          <div class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b border-border">
                  <th class="text-left py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Member</th>
                  <th class="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Total</th>
                  <th class="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Feedback</th>
                  <th class="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Bugs</th>
                  <th class="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Avg Rating</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-border">
                <For each={memberStats()}>
                  {(s) => (
                    <tr class="hover:bg-muted">
                      <td class="py-2 px-2">
                        <div class="flex items-center gap-2">
                          <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                            <span class="text-primary-foreground text-[9px] font-bold">{s.name[0]}</span>
                          </div>
                          <span class="font-medium text-foreground text-xs">{s.name}</span>
                        </div>
                      </td>
                      <td class="text-center py-2 px-2 font-bold text-foreground">{s.total}</td>
                      <td class="text-center py-2 px-2 text-blue-600">{s.feedback}</td>
                      <td class="text-center py-2 px-2 text-red-500">{s.bugs}</td>
                      <td class="text-center py-2 px-2 font-semibold text-amber-600">{s.avg}</td>
                    </tr>
                  )}
                </For>
              </tbody>
            </table>
          </div>
        </Show>
      </div>
    </div>
  );
}
