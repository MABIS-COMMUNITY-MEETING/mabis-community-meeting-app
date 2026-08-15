import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, Trash2, Users } from "lucide-react";
import PageNav from "@/components/PageNav";
import { getISOWeek, getYear, nextFriday, isFriday, format, parseISO } from "date-fns";
import PageFooter from "@/components/PageFooter";
import OpenMoji from "@/components/OpenMoji";
import JapaneseText from "@/components/JapaneseText";

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function weekLabelToDate(label) {
  const [year, weekPart] = label.split("-W");
  const week = parseInt(weekPart);
  const jan4 = new Date(parseInt(year), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const result = new Date(startOfWeek1);
  result.setDate(startOfWeek1.getDate() + (week - 1) * 7 + 4);
  return result;
}

function formatWeekFull(label) {
  try {
    const d = weekLabelToDate(label);
    return format(d, "MMMM do, yyyy");
  } catch {
    const [year, week] = label.split("-W");
    return `Week ${week}, ${year}`;
  }
}

const PRIORITY_DOT = {
  1: "bg-red-800", 2: "bg-red-600", 3: "bg-red-400", 4: "bg-red-300", 5: "bg-red-200",
};

// Does a timestamp fall within the Monday–Friday of the given meeting week?
function inWeek(dateStr, weekLabel) {
  if (!dateStr) return false;
  try {
    const d = new Date(dateStr);
    const friday = weekLabelToDate(weekLabel);
    const monday = new Date(friday);
    monday.setDate(friday.getDate() - 4);
    monday.setHours(0, 0, 0, 0);
    const fridayEnd = new Date(friday);
    fridayEnd.setHours(23, 59, 59, 999);
    return d >= monday && d <= fridayEnd;
  } catch { return false; }
}

// Does a birthday (annual) land within the Mon–Fri of the given meeting week?
function birthdayInWeek(birthDateStr, weekLabel) {
  if (!birthDateStr) return false;
  try {
    const friday = weekLabelToDate(weekLabel);
    const bd = parseISO(birthDateStr);
    bd.setFullYear(friday.getFullYear());
    const monday = new Date(friday);
    monday.setDate(friday.getDate() - 4);
    monday.setHours(0, 0, 0, 0);
    const fridayEnd = new Date(friday);
    fridayEnd.setHours(23, 59, 59, 999);
    return bd >= monday && bd <= fridayEnd;
  } catch { return false; }
}

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday"];

export default function History() {
  const [openWeeks, setOpenWeeks] = useState({});
  const queryClient = useQueryClient();
  const currentWeek = getCurrentWeekLabel();

  const { data: allTopics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  });
  const { data: allAttendance = [] } = useQuery({
    queryKey: ["attendance"],
    queryFn: () => base44.entities.Attendance.list("-created_date", 200),
  });
  const { data: allMembers = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 300),
  });

  // Show every week that has meeting content — past weeks, plus the current week
  // once its meeting has been ended (archived topics). Everything is saved to history.
  // Only weeks with archived (completed-then-ended) topics count as history.
  const pastWeeks = [...new Set(
    allTopics
      .filter(t => t.week_label && t.title !== "__meeting_notes__" && t.archived)
      .map(t => t.week_label)
  )].sort().reverse();

  const deleteWeekMutation = useMutation({
    mutationFn: async (weekLabel) => {
      const weekTopics = allTopics.filter(t => t.week_label === weekLabel);
      await Promise.all(weekTopics.map(t => base44.entities.DiscussionTopic.delete(t.id)));
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  });

  return (
    <div className="min-h-screen bg-background">
      <PageNav label=" N°02 — MEETING HISTORY" />

      <main className="mx-auto max-w-7xl px-4 pb-2 pt-20 sm:px-8 sm:pt-32">
        <div className="mb-10 sm:mb-14">
          <JapaneseText ja="アーカイブ — 02" as="div" className="tech-label text-primary mb-4" japaneseClassName="text-[0.8em] normal-case tracking-normal"> ARCHIVE — 02</JapaneseText>
          <h1 className="font-display text-[clamp(2.65rem,13vw,4.5rem)] font-light leading-[0.9] tracking-ultra sm:text-7xl md:text-8xl">
            MEETING<br />HISTORY
          </h1>
          <p lang="ja" className="mt-1 text-sm text-muted-foreground">ミーティング履歴</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 tech-label text-muted-foreground">
            <JapaneseText ja="過去のミーティング" as="span" japaneseClassName="text-[0.8em] normal-case tracking-normal">PAST MEETINGS</JapaneseText><span className="h-1 w-1 bg-primary" /><JapaneseText ja="毎週金曜日" as="span" japaneseClassName="text-[0.8em] normal-case tracking-normal">WEEKLY FRIDAY</JapaneseText><span className="h-1 w-1 bg-primary" /><span>MABIS</span>
          </div>
        </div>
        {pastWeeks.length === 0 && (
          <div className="border border-border bg-card p-8 text-center sm:rounded-2xl sm:p-16">
            <JapaneseText as="p" ja="まだ過去のミーティングはありません。ミーティングが終了するとここに表示されます。" className="text-muted-foreground text-lg" japaneseClassName="text-[0.7em] block mt-1">No past meetings yet. They appear here once a meeting ends.</JapaneseText>
            <JapaneseText as="p" ja="過去の週はミーティングの完全な記録としてここに表示されます" className="text-muted-foreground text-sm mt-1" japaneseClassName="text-[0.8em] block mt-1">Past weeks will appear here as full meeting snapshots</JapaneseText>
          </div>
        )}

        <div className="space-y-3">
          {pastWeeks.map((week) => {
            // History shows the full meeting snapshot — all topics (completed + uncompleted),
            // identical to what was shown in the meeting. The __meeting_ended__ marker is excluded.
            const weekTopics = allTopics
              .filter(t => t.week_label === week && t.title !== "__meeting_notes__" && t.title !== "__meeting_ended__")
              .sort((a, b) => (!!a.completed === !!b.completed) ? (a.priority || 3) - (b.priority || 3) : (a.completed ? 1 : -1));
            // History saves EVERYTHING that happened in the meeting — archived or not.
            const done = weekTopics.filter(t => t.completed).length;
            const isOpen = openWeeks[week];
            const att = allAttendance.find(a => a.week_label === week);
            const presentNames = att?.present_names || [];
            const missingMembers = allMembers.filter(m => !presentNames.includes(m.name));
            return (
              <div key={week} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
                <button
                  className="flex w-full flex-col items-stretch gap-3 px-4 py-4 text-left transition-colors hover:bg-muted sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  onClick={() => setOpenWeeks(p => ({ ...p, [week]: !p[week] }))}>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    {isOpen ? <ChevronDown className="w-4 h-4 text-muted-foreground" /> : <ChevronRight className="w-4 h-4 text-muted-foreground" />}
                    <div className="text-left">
                      <p className="font-semibold text-foreground text-base">{formatWeekFull(week)}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {weekTopics.length} <span lang="ja">件のトピック</span> · {presentNames.length} <span lang="ja">出席</span>{missingMembers.length > 0 ? ` · ${missingMembers.length} `: ""}{missingMembers.length > 0 && <span lang="ja">欠席</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${done === weekTopics.length ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"}`}>{done}/{weekTopics.length} <span lang="ja">完了</span></span>
                    {att?.meeting_date && !isFriday(new Date(att.meeting_date)) && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary text-primary-foreground"><JapaneseText ja="日付変更" layout="inline" japaneseClassName="text-[0.85em]">Date moved</JapaneseText></span>
                    )}
                    {att && missingMembers.length > 0 && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-red-100 text-red-700">{missingMembers.length} <span lang="ja">欠席</span></span>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete all topics from ${formatWeekFull(week)}?`)) deleteWeekMutation.mutate(week); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete this week">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-border">
                    {/* Attendance — who is missing */}
                    {att && (
                      <div className="border-b border-border bg-red-50/40 px-4 py-4 sm:px-6">
                        <p className="text-xs font-bold text-red-700 uppercase mb-2 flex items-center gap-1.5">
                          <Users className="w-3.5 h-3.5" /> Missing ({missingMembers.length}) · {presentNames.length} present <span lang="ja" className="normal-case text-[0.85em] font-normal">欠席（{missingMembers.length}）・{presentNames.length}名出席</span>
                        </p>
                        {missingMembers.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5">
                            {missingMembers.map(m => (
                              <span key={m.id} className="text-xs bg-card text-red-600 px-2 py-1 rounded-full border border-red-200 line-through">{m.name}</span>
                            ))}
                          </div>
                        ) : (
                          <p className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                            <JapaneseText ja="全員出席です" layout="inline" japaneseClassName="text-[0.9em]">Everyone present</JapaneseText>
                            <OpenMoji hexcode="1F389" className="h-4 w-4" />
                          </p>
                        )}
                      </div>
                    )}

                    {/* Discussion topics */}
                    <div className="border-b border-border px-4 py-4 sm:px-6">
                      <p className="text-xs font-bold text-primary uppercase mb-3">Discussion Topics <span lang="ja" className="normal-case text-[0.85em] font-normal">議題</span></p>
                      <div className="space-y-2">
                        {weekTopics.map(t => (
                          <div key={t.id} className="flex items-start gap-3 p-3 rounded-xl border border-border bg-card">
                            <div className={`w-1 self-stretch rounded-full shrink-0 ${PRIORITY_DOT[t.priority || 3]}`} />
                            <span className={`mt-1 w-4 h-4 rounded shrink-0 flex items-center justify-center text-[10px] ${t.completed ? "bg-green-400 text-primary-foreground" : "border-2 border-border"}`}>
                              {t.completed ? "✓" : ""}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-primary mb-0.5">{t.submitted_by}</p>
                              <p className={`font-semibold text-base leading-snug ${t.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{t.title}</p>
                              {t.description && (
                                <div className="mt-2 pt-2 border-t border-border text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none
                                  [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
                                  dangerouslySetInnerHTML={{ __html: t.description }} />
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>


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