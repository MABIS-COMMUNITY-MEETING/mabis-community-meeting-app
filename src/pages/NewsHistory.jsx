import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ArrowLeft } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
import { formatWeekFull, groupByWeek } from "@/lib/weekHistory";
import PageFooter from "@/components/PageFooter";

export default function NewsHistory() {
  const navigate = useNavigate();
  const [openWeeks, setOpenWeeks] = useState({});

  const { data: allNews = [] } = useQuery({
    queryKey: ["news"],
    queryFn: () => base44.entities.NewsItem.list("-created_date", 500),
  });

  const weeks = groupByWeek(allNews, "created_date");

  return (
    <div className="min-h-screen bg-background">
      <header className="fixed top-0 left-0 right-0 z-40 bg-bone/90 backdrop-blur-sm">
        <div className="flex items-center justify-between px-5 sm:px-8 py-4">
          <button onClick={() => navigate(-1)} data-cursor="BACK" className="group flex items-center gap-3">
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span className="tech-label text-muted-foreground">／ BACK</span>
          </button>
          <span className="hidden sm:block tech-label text-primary">／ N°04 — NEWS</span>
          <Link to="/home" data-cursor="HOME" className="tech-label text-muted-foreground ul-grow">HOME</Link>
        </div>
        <div className="h-px w-full bg-foreground/12" />
      </header>

      <main className="max-w-7xl mx-auto px-5 sm:px-8 pt-28 sm:pt-32 pb-2">
        <div className="mb-10 sm:mb-14">
          <div className="tech-label text-primary mb-4">／ ARCHIVE — 04</div>
          <h1 className="font-display font-light tracking-ultra text-5xl sm:text-7xl md:text-8xl leading-[0.9]">
            NEWS<br />HISTORY
          </h1>
          <div className="mt-6 flex items-center gap-3 tech-label text-muted-foreground">
            <span>{allNews.length} ARTICLES</span><span className="h-1 w-1 bg-primary" /><span>GROUPED BY WEEK</span><span className="h-1 w-1 bg-primary" /><span>MABIS</span>
          </div>
        </div>
        {weeks.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
            <p className="text-gray-400 text-lg">No news yet</p>
            <p className="text-gray-300 text-sm mt-1">Published articles will be grouped here by week</p>
          </div>
        )}

        <div className="space-y-3">
          {weeks.map(([week, items]) => {
            const isOpen = openWeeks[week];
            return (
              <div key={week} className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenWeeks(p => ({ ...p, [week]: !p[week] }))}>
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-base">{formatWeekFull(week)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{items.length} article{items.length !== 1 ? "s" : ""}</p>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-6 py-4 space-y-3">
                    {items.map(n => (
                      <div key={n.id} className="rounded-xl border border-gray-100 p-3 bg-white">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-gray-800">{n.title}</span>
                          <span className="text-xs text-gray-400 ml-auto">{n.created_date ? format(new Date(n.created_date), "d MMM yyyy") : ""}</span>
                        </div>
                        {n.body && <p className="text-sm text-gray-600 whitespace-pre-wrap">{n.body}</p>}
                        {n.image_url && <img src={n.image_url} alt={n.title} className="mt-2 rounded-lg max-h-40 object-cover" />}
                        {n.video_url && <video src={n.video_url} controls className="mt-2 rounded-lg max-h-40 w-full" />}
                        <p className="text-[11px] text-gray-400 mt-0.5">— {n.author_name}</p>
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