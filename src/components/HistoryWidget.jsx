import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getISOWeek, getYear, nextFriday, isFriday } from "date-fns";

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function getNextWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  const nextFr = new Date(friday);
  nextFr.setDate(nextFr.getDate() + 7);
  return `${getYear(nextFr)}-W${String(getISOWeek(nextFr)).padStart(2, "0")}`;
}

function formatWeekLabel(label) {
  const [year, week] = label.split("-W");
  return `Week ${week} — ${year}`;
}

export default function HistoryWidget({ isAdmin }) {
  const [openWeeks, setOpenWeeks] = useState({});
  const queryClient = useQueryClient();
  const currentWeek = getCurrentWeekLabel();

  const { data: allTopics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  });

  const currentTopics = allTopics.filter((t) => t.week_label === currentWeek && !t.archived);
  const archivedWeeks = [...new Set(allTopics.filter((t) => t.archived).map((t) => t.week_label))].sort().reverse();

  const rolloverMutation = useMutation({
    mutationFn: async () => {
      const nextWeek = getNextWeekLabel();
      const updates = currentTopics.map((t) =>
        t.completed
          ? base44.entities.DiscussionTopic.update(t.id, { archived: true })
          : base44.entities.DiscussionTopic.update(t.id, { week_label: nextWeek })
      );
      await Promise.all(updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  });

  const toggleWeek = (week) => setOpenWeeks((prev) => ({ ...prev, [week]: !prev[week] }));

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-display font-semibold text-gray-700 text-lg">History</h2>
          <p className="text-gray-400 text-xs mt-0.5">Past meeting topics</p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs gap-1.5 text-gray-600 border-gray-300 hover:bg-gray-50"
            onClick={() => rolloverMutation.mutate()}
            disabled={rolloverMutation.isPending}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            {rolloverMutation.isPending ? "Rolling over..." : "End Week"}
          </Button>
        )}
      </div>

      <div className="p-5">
        {archivedWeeks.length === 0 && (
          <p className="text-center text-gray-400 text-sm py-6">No past meetings saved yet. They appear here once a meeting ends.</p>
        )}
        <div className="space-y-2">
          {archivedWeeks.map((week) => {
            const weekTopics = allTopics.filter((t) => t.week_label === week && t.archived);
            const done = weekTopics.filter(t => t.completed).length;
            const isOpen = openWeeks[week];
            return (
              <div key={week} className="border border-gray-100 rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                  onClick={() => toggleWeek(week)}
                >
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    <span className="text-sm font-medium text-gray-700">{formatWeekLabel(week)}</span>
                  </div>
                  <span className="text-xs text-gray-400">{done}/{weekTopics.length} done</span>
                </button>
                {isOpen && (
                  <div className="border-t border-gray-100 divide-y divide-gray-50">
                    {weekTopics.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className={`w-2 h-2 rounded-full shrink-0 ${t.completed ? "bg-green-400" : "bg-gray-300"}`} />
                        <span className={`text-sm flex-1 ${t.completed ? "line-through text-gray-400" : "text-gray-600"}`}>{t.title}</span>
                        <span className="text-xs text-gray-400">{t.submitted_by}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}