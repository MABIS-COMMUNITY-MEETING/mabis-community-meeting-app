import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import PageNav from "@/components/PageNav";
import { format } from "date-fns";
import { formatWeekFull, groupByWeek } from "@/lib/weekHistory";
import PageFooter from "@/components/PageFooter";

export default function NewsHistory() {
  const [openWeeks, setOpenWeeks] = useState({});

  const { data: allNews = [] } = useQuery({
    queryKey: ["news"],
    queryFn: () => base44.entities.NewsItem.list("-created_date", 500),
  });

  const weeks = groupByWeek(allNews.map(n => ({ ...n, archive_date: n.published_date || n.created_date })), "archive_date");

  return (
    <div className="min-h-screen bg-background">
      <PageNav label=" N°04 — NEWS" />

      <main className="mx-auto max-w-7xl px-4 pb-2 pt-20 sm:px-8 sm:pt-32">
        <div className="mb-10 sm:mb-14">
          <div className="tech-label text-primary mb-4"> ARCHIVE — 04</div>
          <h1 className="font-display text-[clamp(2.65rem,13vw,4.5rem)] font-light leading-[0.9] tracking-ultra sm:text-7xl md:text-8xl">
            NEWS<br />HISTORY
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 tech-label text-muted-foreground">
            <span>{allNews.length} ARTICLES</span><span className="h-1 w-1 bg-primary" /><span>GROUPED BY WEEK</span><span className="h-1 w-1 bg-primary" /><span>MABIS</span>
          </div>
        </div>
        {weeks.length === 0 && (
          <div className="border border-border bg-card p-8 text-center sm:rounded-2xl sm:p-16">
            <p className="text-muted-foreground text-lg">No news yet</p>
            <p className="text-muted-foreground text-sm mt-1">Published articles will be grouped here by week</p>
          </div>
        )}

        <div className="space-y-3">
          {weeks.map(([week, items]) => {
            const isOpen = openWeeks[week];
            return (
              <div key={week} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <button className="flex w-full flex-col items-stretch gap-3 px-4 py-4 text-left transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  onClick={() => setOpenWeeks(p => ({ ...p, [week]: !p[week] }))}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-base">{formatWeekFull(week)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{items.length} article{items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-border px-4 py-4 sm:px-6">
                    {items.map(n => (
                      <div key={n.id} className="rounded-xl border border-border p-3 bg-card">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-foreground">{n.title}</span>
                          <span className="text-xs text-muted-foreground ml-auto">{n.published_date || n.created_date ? format(new Date(n.published_date || n.created_date), "d MMM yyyy") : ""}</span>
                        </div>
                        {n.body && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</p>}
                        {n.image_url && <img src={n.image_url} alt={n.title} className="mt-2 rounded-lg max-h-40 object-cover" />}
                        {n.video_url && <video src={n.video_url} controls className="mt-2 rounded-lg max-h-40 w-full" />}
                        <p className="text-[11px] text-muted-foreground mt-0.5">— {n.author_name}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <PageFooter />
      </main>
    </div>
  );
}