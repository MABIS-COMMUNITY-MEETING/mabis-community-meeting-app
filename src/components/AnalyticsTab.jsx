import React, { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Eye, Star, MessageSquare, Users, Monitor } from "lucide-react";
import { format } from "date-fns";
import { displayName } from "@/lib/names";
import { base44 } from "@/api/base44Client";
import { detectOS } from "@/lib/detectOS";
import JapaneseText from "@/components/JapaneseText";

const CHART_PRIMARY = "hsl(var(--primary))";
const CHART_SECONDARY = "hsl(var(--secondary))";

/**
 * Minimal column chart.
 *
 * This replaced Recharts, which cost ~102 KiB gzip (plus a lodash isEqual
 * chunk) to render two static bar charts. Recharts measures its container with
 * a ResizeObserver and re-renders an SVG tree on every resize tick; these bars
 * are plain flex children whose heights are a single percentage, so the
 * browser lays them out natively and nothing re-renders on resize.
 *
 * Colours are theme tokens, not fixed hex, so all 133 themes stay correct —
 * the previous fixed #951E3A / #EACE54 bars and Recharts' default white
 * tooltip ignored the active theme entirely.
 */
function Columns({ data, color, height = 220, emptyLabel }) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex items-stretch gap-1" style={{ height }} role="img" aria-label={emptyLabel}>
      {data.map((d) => (
        <div key={d.label} className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="text-[10px] tabular-nums text-muted-foreground">{d.value || ""}</span>
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-t-sm"
              style={{ height: `${(d.value / max) * 100}%`, background: color, minHeight: d.value > 0 ? 2 : 0 }}
              title={`${d.title || d.label}: ${d.value}`}
            />
          </div>
          <span className="w-full truncate text-center text-[10px] text-muted-foreground">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsTab({ feedback, members = [] }) {
  const [visits, setVisits] = useState(0);

  useEffect(() => {
    const count = parseInt(localStorage.getItem("feedback_visits") || "0") + 1;
    localStorage.setItem("feedback_visits", String(count));
    setVisits(count);
  }, []);

  // One VisitLog record per browser session (not per render/tab-switch), so
  // the OS breakdown reflects real people rather than re-renders.
  useEffect(() => {
    if (sessionStorage.getItem("mabis_visit_logged")) return;
    sessionStorage.setItem("mabis_visit_logged", "1");
    base44.entities.VisitLog.create({ os: detectOS() }).catch(() => {});
  }, []);

  const { data: visitLogs = [] } = useQuery({
    queryKey: ["visit-logs"],
    queryFn: () => base44.entities.VisitLog.list("-created_date", 2000),
  });

  const osCounts = {};
  visitLogs.forEach((v) => { osCounts[v.os] = (osCounts[v.os] || 0) + 1; });
  const osStats = Object.entries(osCounts)
    .map(([os, count]) => ({ os, count }))
    .sort((a, b) => b.count - a.count);
  const osTotal = osStats.reduce((sum, s) => sum + s.count, 0);

  const ratedFeedback = feedback.filter(f => f.rating != null);
  const avgRating = ratedFeedback.length > 0
    ? (ratedFeedback.reduce((sum, f) => sum + f.rating, 0) / ratedFeedback.length).toFixed(1)
    : "—";
  const feedbackCount = feedback.filter(f => f.type === "feedback").length;
  const bugCount = feedback.filter(f => f.type === "bug").length;

  // Per-member breakdown from feedback
  const submitterMap = {};
  feedback.forEach(f => {
    const name = f.submitted_by_name || "Anonymous";
    if (!submitterMap[name]) submitterMap[name] = { name, total: 0, feedback: 0, bugs: 0, ratings: [], member: members.find(m => displayName(m) === name) };
    submitterMap[name].total++;
    if (f.type === "feedback") {
      submitterMap[name].feedback++;
      if (f.rating != null) submitterMap[name].ratings.push(f.rating);
    } else {
      submitterMap[name].bugs++;
    }
  });
  const memberStats = Object.values(submitterMap).map(s => ({
    ...s,
    avg: s.ratings.length > 0 ? (s.ratings.reduce((a, b) => a + b, 0) / s.ratings.length).toFixed(1) : "—",
  })).sort((a, b) => b.total - a.total);

  const ratingData = [1,2,3,4,5,6,7,8,9,10].map(r => ({
    rating: `${r}`,
    count: ratedFeedback.filter(f => f.rating === r).length,
  }));

  // Feedback over last 8 weeks — real dates
  const now = new Date();
  const weekData = Array.from({ length: 8 }, (_, i) => {
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (7 - i - 1) * 7);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);
    const count = feedback.filter(f => {
      const d = new Date(f.created_date);
      return d >= weekStart && d < weekEnd;
    }).length;
    return { week: format(weekStart, "dd/MM"), weekLabel: format(weekStart, "dd/MM/yyyy"), count };
  }).reverse();

  return (
    <div className="space-y-6">
      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Eye className="w-4 h-4 text-primary" />
            <p className="text-xs font-bold text-muted-foreground uppercase">Page Visits</p>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{visits}</p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-amber-500" />
            <p className="text-xs font-bold text-muted-foreground uppercase">Avg Rating</p>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">
            {avgRating}<span className="text-base text-muted-foreground">/10</span>
          </p>
        </div>
        <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="w-4 h-4 text-blue-500" />
            <p className="text-xs font-bold text-muted-foreground uppercase">Feedback</p>
          </div>
          <p className="text-3xl font-display font-bold text-foreground">{feedbackCount}</p>
          <p className="text-[10px] text-red-500 mt-0.5">{bugCount} bugs</p>
        </div>
      </div>

      {/* OS breakdown — one VisitLog record per visitor session, aggregated across everyone, not just this device */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Monitor className="w-4 h-4 text-primary" />
          <JapaneseText as="p" ja="使用OSの内訳" className="text-sm font-bold text-foreground" japaneseClassName="text-[0.8em]">OS Usage</JapaneseText>
        </div>
        {osStats.length === 0 ? (
          <JapaneseText as="p" ja="まだデータはありません" className="text-muted-foreground text-sm text-center py-8" japaneseClassName="text-[0.85em] block mt-1">No data yet</JapaneseText>
        ) : (
          <div className="space-y-2.5">
            {osStats.map(({ os, count }) => (
              <div key={os} className="flex items-center gap-3">
                <span className="w-20 shrink-0 text-xs font-medium text-foreground">{os}</span>
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${osTotal > 0 ? (count / osTotal) * 100 : 0}%` }}
                  />
                </div>
                <span className="w-16 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
                  {count} · {osTotal > 0 ? Math.round((count / osTotal) * 100) : 0}%
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Rating distribution chart */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <p className="text-sm font-bold text-foreground mb-4">Rating Distribution</p>
        {ratedFeedback.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No ratings yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={ratingData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="rating" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip cursor={{ fill: CHART_CURSOR_FILL }} contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" fill={CHART_PRIMARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Feedback over time */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <p className="text-sm font-bold text-foreground mb-4">Feedback Activity (Last 8 Weeks)</p>
        {feedback.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No feedback yet</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weekData}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_GRID} />
              <XAxis dataKey="week" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
              <Tooltip cursor={{ fill: CHART_CURSOR_FILL }} contentStyle={TOOLTIP_STYLE} formatter={(v) => [v, "Feedback"]} labelFormatter={(l, payload) => payload?.[0]?.payload?.weekLabel || l} />
              <Bar dataKey="count" fill={CHART_SECONDARY} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Per-member breakdown */}
      <div className="bg-card rounded-xl border border-border p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground">Member Activity</p>
        </div>
        {memberStats.length === 0 ? (
          <p className="text-muted-foreground text-sm text-center py-8">No data yet</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Member</th>
                  <th className="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Total</th>
                  <th className="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Feedback</th>
                  <th className="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Bugs</th>
                  <th className="text-center py-2 px-2 text-xs font-bold text-muted-foreground uppercase">Avg Rating</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {memberStats.map(s => (
                  <tr key={s.name} className="hover:bg-muted">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span className="text-primary-foreground text-[9px] font-bold">{s.name[0]}</span>
                        </div>
                        <span className="font-medium text-foreground text-xs">{s.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-2 font-bold text-foreground">{s.total}</td>
                    <td className="text-center py-2 px-2 text-blue-600">{s.feedback}</td>
                    <td className="text-center py-2 px-2 text-red-500">{s.bugs}</td>
                    <td className="text-center py-2 px-2 font-semibold text-amber-600">{s.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}