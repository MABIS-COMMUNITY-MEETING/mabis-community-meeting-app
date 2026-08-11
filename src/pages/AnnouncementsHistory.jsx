import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ArrowLeft, Megaphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { formatWeekFull, groupByWeek } from "@/lib/weekHistory";
import PageFooter from "@/components/PageFooter";

export default function AnnouncementsHistory() {
  const navigate = useNavigate();
  const [openWeeks, setOpenWeeks] = useState({});

  const { data: allAnnouncements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 500),
  });

  const weeks = groupByWeek(allAnnouncements, "created_date");

  return (
    <div className="min-h-screen bg-[#f7f7f8]">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="font-display font-semibold text-gray-800 text-base leading-none flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-[#951E3A]" /> Announcements History
              </h1>
              <p className="text-gray-400 text-[11px] mt-0.5">{allAnnouncements.length} posts · Secondary Community Meeting App</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-5 py-8 pb-2">
        {weeks.length === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-16 text-center">
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
                <button className="w-full flex items-center justify-between px-6 py-4 hover:bg-gray-50 transition-colors"
                  onClick={() => setOpenWeeks(p => ({ ...p, [week]: !p[week] }))}>
                  <div className="flex items-center gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <div className="text-left">
                      <p className="font-semibold text-gray-800 text-base">{formatWeekFull(week)}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{items.length} announcement{items.length !== 1 ? "s" : ""}{pinned > 0 ? ` · ${pinned} pinned` : ""}</p>
                    </div>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 px-6 py-4 space-y-3">
                    {items.map(a => (
                      <div key={a.id} className="rounded-xl border border-gray-100 p-3 bg-white">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-sm text-gray-800">{a.title}</span>
                          {a.pinned && <span className="text-[10px] font-bold bg-[#951E3A] text-white px-1.5 py-0.5 rounded-full uppercase">Pinned</span>}
                          <span className="text-xs text-gray-400 ml-auto">{a.created_date ? format(new Date(a.created_date), "d MMM yyyy") : ""}</span>
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