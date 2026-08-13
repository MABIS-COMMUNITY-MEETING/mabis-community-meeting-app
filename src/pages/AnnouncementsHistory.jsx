import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight } from "lucide-react";
import PageNav from "@/components/PageNav";
import { format } from "date-fns";
import { formatWeekFull, groupByWeek } from "@/lib/weekHistory";
import PageFooter from "@/components/PageFooter";

export default function AnnouncementsHistory() {
  const [openWeeks, setOpenWeeks] = useState({});

  const { data: allAnnouncements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 500),
  });

  const weeks = groupByWeek(allAnnouncements.map(a => ({ ...a, archive_date: a.published_date || a.created_date })), "archive_date");

  return (
    <div className="min-h-screen bg-background">
      <PageNav label=" N°03 — ANNOUNCEMENTS" />

      <main className="mx-auto max-w-7xl px-4 pb-2 pt-20 sm:px-8 sm:pt-32">
        <div className="mb-10 sm:mb-14">
          <div className="tech-label text-primary mb-4"> ARCHIVE — 03</div>
          <h1 className="font-display text-[clamp(2.45rem,12vw,4.5rem)] font-light leading-[0.9] tracking-ultra sm:text-7xl md:text-8xl">
            ANNOUNCE-<br />MENTS
          </h1>
          <div className="mt-6 flex flex-wrap items-center gap-3 tech-label text-muted-foreground">
            <span>{allAnnouncements.length} POSTS</span><span className="h-1 w-1 bg-primary" /><span>GROUPED BY WEEK</span><span className="h-1 w-1 bg-primary" /><span>MABIS</span>
          </div>
        </div>
        {weeks.length === 0 && (
          <div className="border border-gray-200 bg-white p-8 text-center sm:rounded-2xl sm:p-16">
            <p className="text-gray-400 text-lg">No announcements yet</p>
            <p className="text-gray-300 text-sm mt-1">Posted announcements will be grouped here by week</p>
          </div>
        )}

        <div className="space-y-3">
          {weeks.map(([week, items]) => {
            const isOpen = openWeeks[week];
            const pinned = items.filter(a => a.pinned).length;
            return (
              <div key={week} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button className="flex w-full flex-col items-stretch gap-3 px-4 py-4 text-left transition-colors hover:bg-gray-50 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  onClick={() => setOpenWeeks(p => ({ ...p, [week]: !p[week] }))}>
                  <div className="flex items-center gap-2 sm:gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-base">{formatWeekFull(week)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{items.length} announcement{items.length !== 1 ? "s" : ""}{pinned > 0 ? ` · ${pinned} pinned` : ""}</p>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="space-y-3 border-t border-gray-100 px-4 py-4 sm:px-6">
                    {items.map(a => (
                      <div key={a.id} className="rounded-xl border border-gray-100 p-3 bg-white">
                        <div className="mb-0.5 flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-sm text-gray-800">{a.title}</span>
                          {a.pinned && <span className="text-[10px] font-bold bg-[#951E3A] text-white px-1.5 py-0.5 rounded-full uppercase">Pinned</span>}
                          <span className="text-xs text-gray-400 ml-auto">{a.published_date || a.created_date ? format(new Date(a.published_date || a.created_date), "d MMM yyyy") : ""}</span>
                        </div>
                        {a.body && <p className="text-sm text-gray-600">{a.body}</p>}
                        {a.image_url && <img src={a.image_url} alt={a.title} className="mt-2 rounded-lg max-h-40 object-cover" />}
                        {a.video_url && <video src={a.video_url} controls className="mt-2 rounded-lg max-h-40 w-full" />}
                        <p className="text-[11px] text-gray-400 mt-0.5">— {a.author_name}</p>
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