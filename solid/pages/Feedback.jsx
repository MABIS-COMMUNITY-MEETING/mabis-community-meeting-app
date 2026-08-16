import { createSignal, createMemo, lazy, Suspense, Show, For } from "solid-js";
import { Navigate } from "@solidjs/router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { Star, Bug, CheckCircle2, Eye, Loader2, BarChart3, Trash2, Archive } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { useAuth } from "~/lib/AuthContext";
import { PageNav } from "~/components/page-chrome";
import { JapaneseText } from "~/components/primitives";

const AnalyticsTab = lazy(() => import("~/components/AnalyticsTab"));

const FILTERS = [
  ["all", "すべて", "ALL"],
  ["feedback", "意見", "FEEDBACK"],
  ["bug", "不具合", "BUGS"],
  ["archived", "アーカイブ", "ARCHIVED"],
  ["analytics", "分析", "ANALYTICS"],
];

const STATUS_COLORS = {
  new: "bg-blue-100 text-blue-700",
  reviewed: "bg-yellow-100 text-yellow-700",
  resolved: "bg-green-100 text-green-700",
};

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); }
  catch { return ""; }
}

/*
 * Feedback — Solid port of src/pages/Feedback.jsx.
 *
 * The members query stays gated on the analytics tab (`enabled:`) exactly as
 * in React: the roster is only needed for the per-member breakdown, and
 * fetching 200 members to render an inbox list would be wasted work.
 *
 * AnalyticsTab is lazy so its chunk only downloads when that tab is opened.
 */
export default function Feedback() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const [filter, setFilter] = createSignal("all");

  const isAdmin = () => {
    const user = auth.user();
    const isSummerOrBenjamin =
      user?.email === "summer@montessoribkk.com"
      || /benjamin/i.test(user?.full_name || "")
      || /benjamin/i.test(user?.email || "");
    const role = user?.role_override || user?.role;
    return role === "admin" || role === "editor" || (isSummerOrBenjamin && role !== "student");
  };

  const feedbackQuery = useQuery(() => ({
    queryKey: ["feedback"],
    queryFn: () => base44.entities.Feedback.list("-created_date", 500),
  }));

  const membersQuery = useQuery(() => ({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 200),
    enabled: filter() === "analytics",
  }));

  const update = useMutation(() => ({
    mutationFn: ({ id, data }) => base44.entities.Feedback.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
  }));

  const remove = useMutation(() => ({
    mutationFn: (id) => base44.entities.Feedback.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["feedback"] }),
  }));

  const feedback = () => feedbackQuery.data || [];

  const filtered = createMemo(() => {
    const f = filter();
    if (f === "archived") return feedback().filter((x) => x.status === "archived");
    if (f === "all") return feedback().filter((x) => x.status !== "archived");
    return feedback().filter((x) => x.type === f && x.status !== "archived");
  });

  const handleDelete = (f) => {
    if (window.confirm("Delete this feedback permanently?")) remove.mutate(f.id);
  };
  const handleArchive = (f) => update.mutate({ id: f.id, data: { status: "archived" } });

  return (
    <Show when={isAdmin()} fallback={<Navigate href="/home" />}>
      <div class="min-h-screen bg-background">
        <PageNav label=" N°05 — INBOX" />

        <main class="mx-auto max-w-7xl px-4 pb-8 pt-20 sm:px-8 sm:pt-32">
          <div class="mb-10 sm:mb-14">
            <JapaneseText as="div" ja="アーカイブ — 05" class="block tech-label text-primary mb-4" japaneseClass="text-[0.8em] normal-case tracking-normal">
              {" ARCHIVE — 05"}
            </JapaneseText>
            <h1 class="font-display text-[clamp(2.65rem,13vw,4.5rem)] font-light leading-[0.9] tracking-ultra sm:text-7xl md:text-8xl">
              FEEDBACK<br />&amp; BUGS
            </h1>
            <p lang="ja" class="mt-1 text-sm text-muted-foreground">フィードバックと不具合報告</p>
            <div class="mt-6 flex flex-wrap items-center gap-3 tech-label text-muted-foreground">
              <JapaneseText as="span" ja="受信箱" japaneseClass="text-[0.8em] normal-case tracking-normal">INBOX</JapaneseText>
              <span class="h-1 w-1 bg-primary" />
              <JapaneseText as="span" ja="報告" japaneseClass="text-[0.8em] normal-case tracking-normal">REPORTS</JapaneseText>
              <span class="h-1 w-1 bg-primary" />
              <span>ADMIN</span>
            </div>
          </div>

          <div class="mobile-horizontal-scroll mb-6 flex w-full gap-1 overflow-x-auto border border-foreground/15 bg-card p-1 sm:w-fit sm:flex-wrap sm:overflow-visible">
            <For each={FILTERS}>
              {([key, ja, label]) => (
                <button
                  onClick={() => setFilter(key)}
                  class={`flex shrink-0 items-center gap-1.5 px-4 py-2 tech-label transition-colors ${
                    filter() === key ? "bg-foreground text-bone" : "text-muted-foreground hover:bg-foreground/5"}`}
                >
                  <Show when={key === "analytics"}><BarChart3 class="w-3.5 h-3.5" /></Show>
                  <JapaneseText ja={ja} japaneseClass="text-[0.8em] normal-case tracking-normal">{label}</JapaneseText>
                </button>
              )}
            </For>
          </div>

          <Show when={filter() === "analytics"}>
            <Suspense fallback={<div class="widget-loading-shell" style={{ "--widget-fallback-height": "520px" }} aria-hidden />}>
              <AnalyticsTab feedback={feedback()} members={membersQuery.data || []} />
            </Suspense>
          </Show>

          <Show when={filter() !== "analytics"}>
            <Show
              when={!feedbackQuery.isLoading}
              fallback={<div class="flex justify-center py-20"><Loader2 class="w-8 h-8 animate-spin text-primary" /></div>}
            >
              <Show
                when={filtered().length > 0}
                fallback={
                  <JapaneseText as="p" ja="まだフィードバックがありません" class="block text-center text-muted-foreground py-20" japaneseClass="text-[0.7em] block mt-1">
                    No feedback yet
                  </JapaneseText>
                }
              >
                <div class="space-y-3">
                  <For each={filtered()}>
                    {(f) => (
                      <div class="perf-list-item bg-card rounded-xl border border-border p-4 shadow-sm">
                        <div class="flex items-start gap-3">
                          <div class={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${f.type === "feedback" ? "bg-amber-50" : "bg-red-50"}`}>
                            <Show when={f.type === "feedback"} fallback={<Bug class="w-4 h-4 text-red-500" />}>
                              <Star class="w-4 h-4 text-amber-500" />
                            </Show>
                          </div>

                          <div class="flex-1 min-w-0">
                            <div class="flex items-center gap-2 flex-wrap mb-1">
                              <span class="text-sm font-bold text-foreground">{f.submitted_by_name}</span>
                              <Show when={f.type === "feedback" && f.rating != null}>
                                <span class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">{f.rating}/10</span>
                              </Show>
                              <span class={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[f.status] || STATUS_COLORS.new}`}>
                                {f.status || "new"}
                              </span>
                              <span class="text-[10px] text-muted-foreground ml-auto">{formatDate(f.created_date)}</span>
                            </div>

                            <p class="text-sm text-muted-foreground whitespace-pre-wrap">{f.message}</p>

                            <Show when={f.image_url}>
                              <img src={f.image_url} alt="Attachment" loading="lazy" class="mt-2 rounded-lg border border-border max-h-48 object-cover" />
                            </Show>
                            <Show when={f.submitted_by_email}>
                              <p class="text-[10px] text-muted-foreground mt-2">{f.submitted_by_email}</p>
                            </Show>

                            <div class="mt-3 flex flex-wrap gap-1.5">
                              <Show when={f.status !== "reviewed" && f.status !== "resolved"}>
                                <button
                                  onClick={() => update.mutate({ id: f.id, data: { status: "reviewed" } })}
                                  class="text-[10px] font-bold text-yellow-700 bg-yellow-50 hover:bg-yellow-100 px-2.5 py-1 rounded-md flex items-center gap-1"
                                >
                                  <Eye class="w-3 h-3" />
                                  <JapaneseText ja="確認済み" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Reviewed</JapaneseText>
                                </button>
                              </Show>
                              <Show when={f.status !== "resolved"}>
                                <button
                                  onClick={() => update.mutate({ id: f.id, data: { status: "resolved" } })}
                                  class="text-[10px] font-bold text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1 rounded-md flex items-center gap-1"
                                >
                                  <CheckCircle2 class="w-3 h-3" />
                                  <JapaneseText ja="解決済み" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Resolved</JapaneseText>
                                </button>
                              </Show>
                              <Show when={f.status !== "new" && f.status !== "archived"}>
                                <button
                                  onClick={() => update.mutate({ id: f.id, data: { status: "new" } })}
                                  class="text-[10px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-md"
                                >
                                  <JapaneseText ja="再オープン" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Reopen</JapaneseText>
                                </button>
                              </Show>
                              <Show when={f.status !== "archived"}>
                                <button
                                  onClick={() => handleArchive(f)}
                                  class="text-[10px] font-bold text-muted-foreground bg-muted hover:bg-muted px-2.5 py-1 rounded-md flex items-center gap-1"
                                >
                                  <Archive class="w-3 h-3" />
                                  <JapaneseText ja="アーカイブ" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Archive</JapaneseText>
                                </button>
                              </Show>
                              <button
                                onClick={() => handleDelete(f)}
                                class="text-[10px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1 rounded-md flex items-center gap-1"
                              >
                                <Trash2 class="w-3 h-3" />
                                <JapaneseText ja="削除" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Delete</JapaneseText>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </For>
                </div>
              </Show>
            </Show>
          </Show>
        </main>
      </div>
    </Show>
  );
}
