import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Navigate } from "react-router-dom";
import PageNav from "@/components/PageNav";
import { useAuth } from "@/lib/AuthContext";
import { Star, Bug, CheckCircle2, Eye, Loader2, BarChart3, Trash2, Archive } from "lucide-react";
import AnalyticsTab from "@/components/AnalyticsTab";
import PasswordModal from "@/components/PasswordModal";

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

  if (!isAdmin) return <Navigate to="/home" replace />;

  const filtered = filter === "archived"
    ? feedback.filter(f => f.status === "archived")
    : filter === "all"
      ? feedback.filter(f => f.status !== "archived")
      : feedback.filter(f => f.type === filter && f.status !== "archived");

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
      <PageNav label="／ N°05 — INBOX" />

      <main className="max-w-7xl mx-auto px-4 sm:px-8 pt-28 sm:pt-32 pb-8">
        <div className="mb-10 sm:mb-14">
          <div className="tech-label text-primary mb-4">／ ARCHIVE — 05</div>
          <h1 className="font-display font-light tracking-ultra text-5xl sm:text-7xl md:text-8xl leading-[0.9]">
            FEEDBACK<br />& BUGS
          </h1>
          <div className="mt-6 flex items-center gap-3 tech-label text-muted-foreground">
            <span>INBOX</span><span className="h-1 w-1 bg-primary" /><span>REPORTS</span><span className="h-1 w-1 bg-primary" /><span>ADMIN</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-6 border border-foreground/15 bg-card p-1 w-fit">
          {["all", "feedback", "bug", "archived", "analytics"].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-4 py-2 tech-label transition-colors flex items-center gap-1.5 ${filter === f ? "bg-foreground text-bone" : "text-muted-foreground hover:bg-foreground/5"}`}>
              {f === "all" ? "ALL" : f === "feedback" ? "FEEDBACK" : f === "bug" ? "BUGS" : f === "archived" ? "ARCHIVED" : <><BarChart3 className="w-3.5 h-3.5" /> ANALYTICS</>}
            </button>
          ))}
        </div>

        {filter === "analytics" ? (
          <AnalyticsTab feedback={feedback} members={members} />
        ) : isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#951E3A]" />
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-center text-gray-400 py-20">No feedback yet</p>
        ) : (
          <div className="space-y-3">
            {filtered.map(f => (
              <div key={f.id} className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.type === "feedback" ? "bg-amber-50" : "bg-red-50"}`}>
                    {f.type === "feedback" ? <Star className="w-4 h-4 text-amber-500" /> : <Bug className="w-4 h-4 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="text-sm font-bold text-gray-800">{f.submitted_by_name}</span>
                      {f.type === "feedback" && f.rating != null && (
                        <span className="text-xs font-bold text-[#951E3A] bg-[#951E3A]/10 px-2 py-0.5 rounded-full">{f.rating}/10</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${statusColors[f.status] || statusColors.new}`}>{f.status || "new"}</span>
                      <span className="text-[10px] text-gray-400 ml-auto">{formatDate(f.created_date)}</span>
                    </div>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{f.message}</p>
                    {f.image_url && (
                      <img src={f.image_url} alt="Attachment" className="mt-2 rounded-lg border border-gray-200 max-h-48 object-cover" />
                    )}
                    {f.submitted_by_email && (
                      <p className="text-[10px] text-gray-400 mt-2">{f.submitted_by_email}</p>
                    )}
                    <div className="flex gap-1.5 mt-3">
                      {f.status !== "reviewed" && f.status !== "resolved" && (
                        <button onClick={() => updateMutation.mutate({ id: f.id, data: { status: "reviewed" } })}
                          className="text-[10px] font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Eye className="w-3 h-3" /> Reviewed
                        </button>
                      )}
                      {f.status !== "resolved" && (
                        <button onClick={() => updateMutation.mutate({ id: f.id, data: { status: "resolved" } })}
                          className="text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Resolved
                        </button>
                      )}
                      {f.status !== "new" && f.status !== "archived" && (
                        <button onClick={() => updateMutation.mutate({ id: f.id, data: { status: "new" } })}
                          className="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md">
                          Reopen
                        </button>
                      )}
                      {f.status !== "archived" && (
                        <button onClick={() => handleArchive(f)}
                          className="text-[10px] font-bold text-gray-600 bg-gray-50 hover:bg-gray-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                          <Archive className="w-3 h-3" /> Archive
                        </button>
                      )}
                      <button onClick={() => handleDelete(f)}
                        className="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md flex items-center gap-1">
                        <Trash2 className="w-3 h-3" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <PasswordModal open={!!deleteTarget} onClose={() => setDeleteTarget(null)}
        onSuccess={() => { if (deleteTarget) deleteMutation.mutate(deleteTarget.id); }}
        title="Delete Entry" />
    </div>
  );
}