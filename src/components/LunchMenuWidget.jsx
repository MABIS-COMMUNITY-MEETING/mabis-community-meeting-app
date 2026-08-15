import React, { useState, useEffect } from "react";
import JapaneseText from "@/components/JapaneseText";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UtensilsCrossed, Loader2, Save } from "lucide-react";
import { isFriday, nextFriday, getISOWeek, getYear, format } from "date-fns";

const DAYS = [
  ["monday", "Mon"],
  ["tuesday", "Tue"],
  ["wednesday", "Wed"],
  ["thursday", "Thu"],
  ["friday", "Fri"],
];

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function fridayOfCurrentWeek() {
  const today = new Date();
  return isFriday(today) ? today : nextFriday(today);
}

export default function LunchMenuWidget({ isAdmin }) {
  const weekLabel = getCurrentWeekLabel();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState({});

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["lunchmenu", weekLabel],
    queryFn: () => base44.entities.LunchMenu.filter({ week_label: weekLabel }),
  });
  const record = records[0];

  useEffect(() => {
    const d = {};
    DAYS.forEach(([key]) => {
      d[`${key}_snack`] = record?.[`${key}_snack`] || "";
      d[`${key}_lunch`] = record?.[`${key}_lunch`] || "";
    });
    setDraft(d);
  }, [record?.id]);

  const upsertMutation = useMutation({
    mutationFn: async (data) => {
      if (record) return base44.entities.LunchMenu.update(record.id, data);
      return base44.entities.LunchMenu.create({ week_label: weekLabel, ...data });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lunchmenu"] }),
  });

  const setVal = (field, val) => setDraft(d => ({ ...d, [field]: val }));

  return (
    <div className="mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="mabis-widget-header bg-primary px-4 py-4 flex items-center gap-3 sm:px-6">
        <UtensilsCrossed className="w-5 h-5 text-primary-foreground" />
        <div>
          <h2 className="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Snacks &amp; Lunch</h2>
          <JapaneseText
            as="p"
            ja={`${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(fridayOfCurrentWeek())}の週`}
            className="text-primary-foreground-muted text-xs mt-0.5"
            japaneseClassName="block mt-0.5 text-[0.9em]"
          >
            Week of {format(fridayOfCurrentWeek(), "d MMMM yyyy")}
          </JapaneseText>
        </div>
      </div>

      <div className="mabis-widget-body p-4 sm:p-5">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="mobile-horizontal-scroll flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:grid-cols-5">
              {DAYS.map(([key, label]) => (
                <div key={key} className="w-[82vw] max-w-[18rem] shrink-0 snap-start overflow-hidden rounded-xl border border-border sm:w-auto sm:max-w-none">
                  <div className="bg-primary/10 px-3 py-2 text-center">
                    <span className="text-xs font-bold text-primary uppercase tracking-wide">{label}</span>
                  </div>
                  <div className="p-3 space-y-2.5">
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Snack</p>
                      {isAdmin ? (
                        <textarea value={draft[`${key}_snack`] || ""} onChange={(e) => setVal(`${key}_snack`, e.target.value)} rows={2}
                          placeholder="—" className="w-full text-sm rounded-lg border border-border px-2.5 py-2 resize-none focus:outline-none focus:border-primary/50" />
                      ) : (
                        <p className="text-sm text-foreground min-h-[2.5rem] whitespace-pre-wrap">{draft[`${key}_snack`] || "—"}</p>
                      )}
                    </div>
                    <div>
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase mb-1">Lunch</p>
                      {isAdmin ? (
                        <textarea value={draft[`${key}_lunch`] || ""} onChange={(e) => setVal(`${key}_lunch`, e.target.value)} rows={2}
                          placeholder="—" className="w-full text-sm rounded-lg border border-border px-2.5 py-2 resize-none focus:outline-none focus:border-primary/50" />
                      ) : (
                        <p className="text-sm text-foreground min-h-[2.5rem] whitespace-pre-wrap">{draft[`${key}_lunch`] || "—"}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {isAdmin && (
              <div className="flex justify-stretch mt-4 sm:justify-end">
                <button onClick={() => upsertMutation.mutate(draft)} disabled={upsertMutation.isPending}
                  className="flex w-full items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-60 sm:w-auto">
                  {upsertMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Menu
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}