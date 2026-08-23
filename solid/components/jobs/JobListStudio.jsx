import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { Download, FileText, Loader2, Save, Trash2, X } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { jobPeriod, normalizeJobTitle, scheduledDaysFor } from "@/lib/jobsRotation";
import { Button, Input, Textarea, WidgetSpinner } from "~/components/ui";
import { JapaneseText } from "~/components/primitives";
import { printJobList } from "~/lib/job-list-pdf";

const statusCopy = {
  saved: {
    en: "Job list saved. You can export it again from Saved lists.",
    ja: "係リストを保存しました。「保存済みリスト」からいつでも再出力できます。",
  },
  deleted: {
    en: "Saved job list deleted.",
    ja: "保存済みの係リストを削除しました。",
  },
  saveError: {
    en: "The job list could not be saved. Please try again.",
    ja: "係リストを保存できませんでした。もう一度お試しください。",
  },
  deleteError: {
    en: "The saved list could not be deleted.",
    ja: "保存済みリストを削除できませんでした。",
  },
  pdfReady: {
    en: "The print dialog is open. Choose Save as PDF.",
    ja: "印刷画面が開きました。「PDFとして保存」を選んでください。",
  },
  popupBlocked: {
    en: "Allow pop-ups for this site, then choose Save as PDF again.",
    ja: "このサイトのポップアップを許可してから、もう一度「PDFとして保存」を選んでください。",
  },
};

const safePeriod = (value) => value || "Current assignments";

const assignmentItem = (assignment) => ({
  job_title: normalizeJobTitle(assignment.job_title),
  assigned_to_name: assignment.assigned_to_name || "Unassigned",
  assignment_period: jobPeriod(assignment),
  schedule_days: scheduledDaysFor(assignment),
});

const savedDate = (list) =>
  String(list?.created_date || list?.createdDate || "").slice(0, 10) || "Saved";

export default function JobListStudio(props) {
  const queryClient = useQueryClient();
  const assignments = () => props.assignments || [];
  const initialTitle = () => `MABIS Jobs - ${safePeriod(props.periodLabel)}`;

  const [title, setTitle] = createSignal(initialTitle());
  const [notes, setNotes] = createSignal("");
  const [selectedIds, setSelectedIds] = createSignal([]);
  const [status, setStatus] = createSignal(null);
  const [exportingId, setExportingId] = createSignal("");

  let initializedSelection = false;
  createEffect(() => {
    const available = new Set(assignments().map((assignment) => assignment.id));
    if (!initializedSelection) {
      initializedSelection = true;
      setSelectedIds([...available]);
      return;
    }
    setSelectedIds((ids) => ids.filter((id) => available.has(id)));
  });

  const selectedSet = createMemo(() => new Set(selectedIds()));
  const selectedAssignments = createMemo(() =>
    assignments().filter((assignment) => selectedSet().has(assignment.id)));

  const listsQuery = useQuery(() => ({
    queryKey: ["job-lists"],
    queryFn: () => base44.entities.JobList.list("-created_date", 100),
  }));

  const draftList = () => ({
    title: title().trim() || initialTitle(),
    notes: notes().trim(),
    period_label: safePeriod(props.periodLabel),
    items: selectedAssignments().map(assignmentItem),
    created_by_name: props.currentUser?.full_name || props.currentUser?.email || "MABIS Community",
    created_by_email: props.currentUser?.email || "",
    created_date: new Date().toISOString().slice(0, 10),
  });

  const saveList = useMutation(() => ({
    mutationFn: (data) => base44.entities.JobList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-lists"] });
      setStatus(statusCopy.saved);
      setTitle(initialTitle());
      setNotes("");
      setSelectedIds(assignments().map((assignment) => assignment.id));
    },
    onError: () => setStatus(statusCopy.saveError),
  }));

  const deleteList = useMutation(() => ({
    mutationFn: (id) => base44.entities.JobList.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job-lists"] });
      setStatus(statusCopy.deleted);
    },
    onError: () => setStatus(statusCopy.deleteError),
  }));

  const toggleAssignment = (id) => {
    setSelectedIds((ids) =>
      ids.includes(id) ? ids.filter((candidate) => candidate !== id) : [...ids, id]);
  };

  const handleSave = () => {
    if (!title().trim() || selectedAssignments().length === 0 || saveList.isPending) return;
    saveList.mutate(draftList());
  };

  const handleDelete = (list) => {
    const ownsList = list.created_by_email && list.created_by_email === props.currentUser?.email;
    if (!props.isAdmin && !ownsList) return;
    if (!window.confirm(
      `Delete "${list.title}"? This cannot be undone.\n「${list.title}」を削除しますか？この操作は元に戻せません。`,
    )) return;
    deleteList.mutate(list.id);
  };

  const handlePdf = async (list, key) => {
    if (!Array.isArray(list?.items) || list.items.length === 0) return;
    setExportingId(key);
    try {
      await printJobList(list);
      setStatus(statusCopy.pdfReady);
    } catch (error) {
      setStatus(error?.message === "POPUP_BLOCKED" ? statusCopy.popupBlocked : statusCopy.popupBlocked);
    } finally {
      setExportingId("");
    }
  };

  const canDelete = (list) =>
    props.isAdmin || (
      list.created_by_email
      && list.created_by_email === props.currentUser?.email
    );

  return (
    <section
      class="job-list-studio border-y-2 border-foreground bg-background text-foreground font-body"
      aria-labelledby="job-list-studio-title"
    >
      <header class="grid gap-5 border-b border-foreground px-3 py-5 sm:px-5 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">N° 04 / Document Studio</p>
          <JapaneseText
            as="h3"
            id="job-list-studio-title"
            ja="係リスト作成"
            class="mt-1 block font-display text-2xl font-bold leading-none tracking-[-0.035em] sm:text-3xl"
            japaneseClass="mt-2 block text-sm font-normal tracking-normal text-muted-foreground"
          >
            Job List Studio
          </JapaneseText>
          <JapaneseText
            as="p"
            ja="現在の担当から必要な項目を選び、共有リストとして保存したり、テーマに合ったPDFに出力したりできます。"
            class="mt-3 block max-w-2xl text-sm leading-relaxed text-muted-foreground"
            japaneseClass="mt-1 block text-[0.86em] leading-relaxed"
          >
            Choose from the current assignments, save a reusable shared list, or export a theme-matched PDF.
          </JapaneseText>
        </div>
        <Button
          type="button"
          variant="outline"
          onClick={props.onClose}
          class="min-h-10 justify-self-start rounded-sm border-foreground/40 md:justify-self-end"
        >
          <X class="h-4 w-4" />
          <JapaneseText ja="閉じる" layout="inline">Close</JapaneseText>
        </Button>
      </header>

      <Show when={status()}>
        {(copy) => (
          <JapaneseText
            as="p"
            role="status"
            ja={copy().ja}
            class="block border-b border-border bg-secondary/15 px-3 py-3 text-sm font-semibold sm:px-5"
            japaneseClass="mt-1 block text-[0.82em] font-normal text-muted-foreground"
          >
            {copy().en}
          </JapaneseText>
        )}
      </Show>

      <div class="grid lg:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <div class="border-b border-foreground/35 p-3 sm:p-5 lg:border-b-0 lg:border-r">
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">
              <JapaneseText ja="リスト名">List title</JapaneseText>
              <Input
                value={title()}
                onInput={(event) => setTitle(event.currentTarget.value)}
                maxlength={120}
                class="mt-1 min-h-11 rounded-sm border-foreground/35 bg-card text-base normal-case tracking-normal text-foreground"
              />
            </label>
            <label class="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground sm:col-span-2">
              <JapaneseText ja="メモ（任意）">Notes (optional)</JapaneseText>
              <Textarea
                value={notes()}
                onInput={(event) => setNotes(event.currentTarget.value)}
                maxlength={1000}
                class="mt-1 min-h-24 rounded-sm border-foreground/35 bg-card text-sm font-normal normal-case tracking-normal text-foreground"
              />
            </label>
          </div>

          <div class="mt-6 flex flex-col gap-3 border-t border-foreground/35 pt-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <JapaneseText
                as="h4"
                ja="含める係"
                class="block text-xs font-bold uppercase tracking-[0.16em]"
                japaneseClass="mt-1 block text-[0.82em] font-normal tracking-normal text-muted-foreground"
              >
                Jobs to include
              </JapaneseText>
              <JapaneseText
                as="p"
                ja={`${selectedAssignments().length}件選択中`}
                class="mt-1 block text-xs text-muted-foreground"
                japaneseClass="ml-1.5 inline text-[0.86em]"
                layout="inline"
              >
                {selectedAssignments().length} selected
              </JapaneseText>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(assignments().map((assignment) => assignment.id))}
                disabled={selectedAssignments().length === assignments().length}
                class="min-h-9 rounded-sm"
              >
                <JapaneseText ja="すべて選択" layout="inline">Select all</JapaneseText>
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds([])}
                disabled={selectedAssignments().length === 0}
                class="min-h-9 rounded-sm"
              >
                <JapaneseText ja="選択解除" layout="inline">Clear</JapaneseText>
              </Button>
            </div>
          </div>

          <div data-cursor-lite class="mt-3 divide-y divide-border border-y border-foreground/35">
            <For
              each={assignments()}
              fallback={
                <JapaneseText
                  as="p"
                  ja="現在の担当がありません。先にホイールで係を割り当ててください。"
                  class="block px-3 py-8 text-center text-sm text-muted-foreground"
                  japaneseClass="mt-1 block text-[0.86em]"
                >
                  There are no current assignments. Assign jobs with the wheel first.
                </JapaneseText>
              }
            >
              {(assignment, index) => (
                <label class="grid min-h-14 cursor-pointer grid-cols-[auto_2rem_minmax(0,1fr)] items-center gap-3 px-2 py-2 hover:bg-muted/60 sm:px-3">
                  <input
                    type="checkbox"
                    checked={selectedSet().has(assignment.id)}
                    onChange={() => toggleAssignment(assignment.id)}
                    class="h-4 w-4 shrink-0 accent-primary"
                    aria-label={`Include ${normalizeJobTitle(assignment.job_title)}`}
                  />
                  <span class="text-[10px] font-bold tabular-nums text-primary">
                    {String(index() + 1).padStart(2, "0")}
                  </span>
                  <span class="min-w-0">
                    <span class="block truncate text-sm font-bold">{normalizeJobTitle(assignment.job_title)}</span>
                    <span class="block truncate text-xs text-muted-foreground">
                      {assignment.assigned_to_name} · {scheduledDaysFor(assignment).join(", ")}
                    </span>
                  </span>
                </label>
              )}
            </For>
          </div>

          <div class="mt-4 grid gap-2 sm:grid-cols-2">
            <Button
              type="button"
              onClick={handleSave}
              disabled={!title().trim() || selectedAssignments().length === 0 || saveList.isPending}
              class="min-h-11 rounded-sm"
            >
              <Show when={saveList.isPending} fallback={<Save class="h-4 w-4" />}>
                <Loader2 class="h-4 w-4 animate-spin" />
              </Show>
              <JapaneseText ja="リストを保存" layout="inline">Save Job List</JapaneseText>
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => handlePdf(draftList(), "draft")}
              disabled={selectedAssignments().length === 0 || exportingId() === "draft"}
              class="min-h-11 rounded-sm border-primary/45 text-primary"
            >
              <Show when={exportingId() === "draft"} fallback={<Download class="h-4 w-4" />}>
                <Loader2 class="h-4 w-4 animate-spin" />
              </Show>
              <JapaneseText ja="PDFとして保存" layout="inline">Save as PDF</JapaneseText>
            </Button>
          </div>
          <JapaneseText
            as="p"
            ja="PDFには日本語を含めず、現在のテーマ色と選択中のUIフォントを使用します。"
            class="mt-2 block text-[11px] leading-relaxed text-muted-foreground"
            japaneseClass="mt-1 block text-[0.86em]"
          >
            The PDF is English-only and uses the current theme colors and selected UI font.
          </JapaneseText>
        </div>

        <aside class="p-3 sm:p-5">
          <div class="border-b border-foreground pb-3">
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Archive / 係</p>
            <JapaneseText
              as="h4"
              ja="保存済みリスト"
              class="mt-1 block font-display text-xl font-bold tracking-[-0.025em]"
              japaneseClass="mt-1 block text-xs font-normal tracking-normal text-muted-foreground"
            >
              Saved lists
            </JapaneseText>
          </div>

          <Show when={!listsQuery.isLoading} fallback={<WidgetSpinner label="Loading saved job lists" />}>
            <div class="divide-y divide-border">
              <For
                each={listsQuery.data || []}
                fallback={
                  <JapaneseText
                    as="p"
                    ja="保存済みの係リストはまだありません。"
                    class="block py-8 text-sm text-muted-foreground"
                    japaneseClass="mt-1 block text-[0.86em]"
                  >
                    No saved job lists yet.
                  </JapaneseText>
                }
              >
                {(list) => (
                  <article class="py-4">
                    <div class="flex items-start gap-3">
                      <FileText class="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <div class="min-w-0 flex-1">
                        <h5 class="break-words text-sm font-bold leading-snug">{list.title}</h5>
                        <p class="mt-1 text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                          {savedDate(list)} · {(list.items || []).length} jobs
                        </p>
                        <Show when={list.notes}>
                          <p class="mt-2 line-clamp-3 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {list.notes}
                          </p>
                        </Show>
                      </div>
                    </div>
                    <div class="mt-3 flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handlePdf(list, list.id)}
                        disabled={!list.items?.length || exportingId() === list.id}
                        class="min-h-9 rounded-sm border-primary/40 text-primary"
                      >
                        <Show when={exportingId() === list.id} fallback={<Download class="h-3.5 w-3.5" />}>
                          <Loader2 class="h-3.5 w-3.5 animate-spin" />
                        </Show>
                        <JapaneseText ja="PDFとして保存" layout="inline">Save as PDF</JapaneseText>
                      </Button>
                      <Show when={canDelete(list)}>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(list)}
                          disabled={deleteList.isPending}
                          class="min-h-9 rounded-sm text-primary hover:bg-primary/10"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                          <JapaneseText ja="削除" layout="inline">Delete</JapaneseText>
                        </Button>
                      </Show>
                    </div>
                  </article>
                )}
              </For>
            </div>
          </Show>
        </aside>
      </div>
    </section>
  );
}
