import React, { lazy, startTransition, Suspense, useDeferredValue, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import PageNav from "@/components/PageNav";
import { useAuth } from "@/lib/AuthContext";
import { Star, Bug, CheckCircle2, Eye, Loader2, BarChart3, Trash2, Archive } from "lucide-react";
import JapaneseText from "@/components/JapaneseText";
const AnalyticsTab = lazy(() => import("@/components/AnalyticsTab"));
const PasswordModal = lazy(() => import("@/components/PasswordModal"));

export default function Feedback() {
  const { user } = useAuth();
  const isSummerOrBenjamin = user?.email === "summer@montessoribkk.com" || /benjamin/i.test(user?.full_name || "") || /benjamin/i.test(user?.email || "");
  const userRole = user?.role_override || user?.role;
  const isAdmin = userRole === "admin" || userRole === "editor" || (isSummerOrBenjamin && userRole !== "student");
  const [filter, setFilter] = useState("all");
  const queryClient = useQueryClient();

  const { data: feedback = [], isLoading } = useQuery({
    queryKey: ["feedback"],
    queryFn: () => base44.entities.Feedback.list("-created_date", 500),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 200),
    enabled: filter === "analytics",
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Feedback.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Feedback.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
  });

  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = (f) => setDeleteTarget(f);

  const handleArchive = (f) => {
    updateMutation.mutate({ id: f.id, data: { status: "archived" } });
  };

  const deferredFilter = useDeferredValue(filter);
  const filtered = useMemo(() => deferredFilter === "archived"
    ? feedback.filter(f => f.status === "archived")
    : deferredFilter === "all"
      ? feedback.filter(f => f.status !== "archived")
      : feedback.filter(f => f.type === deferredFilter && f.status !== "archived"), [deferredFilter, feedback]);

  if (!isAdmin) return <Navigate to="/home" replace />;

  const statusColors = {
    new: "bg-blue-100 text-blue-700",
    reviewed: "bg-yellow-100 text-yellow-700",
    resolved: "bg-green-100 text-green-700",
  };

  const formatDate = (d) => {
    try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
    catch { return ""; }
  };

  return (
    <div className="min-h-screen bg-background">
      <PageNav label=" N°05 — INBOX" />

      <main className="mx-auto max-w-7xl px-4 pb-8 pt-20 sm:px-8 sm:pt-32">
        <div className="mb-10 sm:mb-14">
          <JapaneseText ja="アーカイブ — 05" as="div" className="tech-label text-primary mb-4" japaneseClassName="text-[0.8em] normal-case tracking-normal"> ARCHIVE — 05</JapaneseText>
          <h1 className="font-display text-[clamp(2.65rem,13vw,4.5rem)] font-light leading-[0.9] tracking-ultra sm:text-7xl md:text-8xl">
            FEEDBACK<br />& BUGS
          </h1>
          <p lang="ja" className="mt-1 text-sm text-muted-foreground">フィードバックと不具合報告</p>
          <div className="mt-6 flex flex-wrap items-center gap-3 tech-label text-muted-foreground">
            <JapaneseText ja="受信箱" as="span" japaneseClassName="text-[0.8em] normal-case tracking-normal">INBOX</JapaneseText><span className="h-1 w-1 bg-primary" /><JapaneseText ja="報告" as="span" japaneseClassName="text-[0.8em] normal-case tracking-normal">REPORTS</JapaneseText><span className="h-1 w-1 bg-primary" /><span>ADMIN</span>
          </div>
        </div>

        <div className="mobile-horizontal-scroll mb-6 flex w-full gap-1 overflow-x-auto border border-foreground/15 bg-card p-1 sm:w-fit sm:flex-wrap sm:overflow-visible">
          {[["all", "すべて"], ["feedback", "意見"], ["bug", "不具合"], ["archived", "アーカイブ"], ["analytics", "分析"]].map(([f, ja]) => (
            <button key={f} onClick={() => startTransition(() => setFilter(f))}
              className={`flex shrink-0 items-center gap-1.5 px-4 py-2 tech-label transition-colors ${filter === f ? "bg-foreground text-bone" : "text-muted-foreground hover:bg-foreground/5"}`}>
              {f === "all" ? <JapaneseText ja={ja} japaneseClassName="text-[0.8em] normal-case tracking-normal">ALL</JapaneseText> : f === "feedback" ? <JapaneseText ja={ja} japaneseClassName="text-[0.8em] normal-case tracking-normal">FEEDBACK</JapaneseText> : f === "bug" ? <JapaneseText ja={ja} japaneseClassName="text-[0.8em] normal-case tracking-normal">BUGS</JapaneseText> : f === "archived" ? <JapaneseText ja={ja} japaneseClassName="text-[0.8em] normal-case tracking-normal">ARCHIVED</JapaneseText> : <><BarChart3 className="w-3.5 h-3.5" /> <JapaneseText ja={ja} japaneseClassName="text-[0.8em] normal-case tracking-normal">ANALYTICS</JapaneseText></>}
            </button>
          ))}
        </div>

        {filter === "analytics" ? (
          <Suspense fallback={<div className="widget-loading-shell" style={{ "--widget-fallback-height": "520px" }} aria-hidden />}>
            <AnalyticsTab feedback={feedback} members={members} />
          </Suspense>
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <JapaneseText as="p" ja="まだフィードバックがありません" className="text-center text-muted-foreground py-20" japaneseClassName="text-[0.7em] block mt-1">No feedback yet</JapaneseText>
        ) : (
          <div className="space-y-3">
            {filtered.map(f => (
              <div key={f.id} className="perf-list-item bg-card rounded-xl border border-border p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.type === "feedback" ? "bg-amber-50" : "bg-red-50"}`}>
                    {f.type === "feedback" ? <Star className="w-4 h-4 text-amber-500" /> : <Bug className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-foreground">{f.submitted_by_name}</span>
                      {f.type === "feedback" && f.rating != null && (
                        <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{f.rating}/10</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[f.status] || statusColors.new}`}>{f.status || "new"}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{formatDate(f.created_date)}</span>
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{f.message}</p>
                    {f.image_url && (
                      <img src={f.image_url} alt="Attachment" className="mt-2 rounded-lg border border-border max-h-48 object-cover" />
                    )}
                    {f.submitted_by_email && (
                      <p className="text-[10px] text-muted-foreground mt-2">{f.submitted_by_email}</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {f.status !== "reviewed" && f.status !== "resolved" && (
                        <button onClick={() => updateMutation.mutate({ id: f.id, data: { status: "reviewed" } })}
                          className="text-[10px] font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Eye className="w-3 h-3" /> <JapaneseText ja="確認済み" layout="inline" japaneseClassName="text-[0.85em]">Reviewed</JapaneseText>
                        </button>
                      )}
                      {f.status !== "resolved" && (
                        <button onClick={() => updateMutation.mutate({ id: f.id, data: { status: "resolved" } })}
                          className="text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> <JapaneseText ja="解決済み" layout="inline" japaneseClassName="text-[0.85em]">Resolved</JapaneseText>
                        </button>
                      )}
                      {f.status !== "new" && f.status !== "archived" && (
                        <button onClick={() => updateMutation.mutate({ id: f.id, data: { status: "new" } })}
                          className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md">
                          <JapaneseText ja="再オープン" layout="inline" japaneseClassName="text-[0.85em]">Reopen</JapaneseText>
                        </button>
                      )}
                      {f.status !== "archived" && (
                        <button onClick={() => handleArchive(f)}
                          className="text-[10px] font-bold text-muted-foreground bg-muted hover:bg-muted px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Archive className="w-3 h-3" /> <JapaneseText ja="アーカイブ" layout="inline" japaneseClassName="text-[0.85em]">Archive</JapaneseText>
                        </button>
                      )}
                      <button onClick={() => handleDelete(f)}
                        className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> <JapaneseText ja="削除" layout="inline" japaneseClassName="text-[0.85em]">Delete</JapaneseText>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      {deleteTarget && (
        <Suspense fallback={null}>
          <PasswordModal open onClose={() => setDeleteTarget(null)}
            onSuccess={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
            title="Delete Entry" />
        </Suspense>
      )}
    </div>
  );
}