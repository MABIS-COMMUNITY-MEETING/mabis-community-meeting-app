import { createSignal, createEffect, onCleanup, Show } from "solid-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import DiscussionDocumentEditor from "~/components/discussion/DiscussionDocumentEditor";

/*
 * Autosaving meeting notes in the shared flowing-document editor.
 *
 * The record id lives in a plain variable, not a signal: it is written during a
 * create→update transition and must never re-trigger a render, because that
 * would remount the editor mid-typing. React used a ref for the same reason.
 */
export default function MeetingNotesEditor(props) {
  const queryClient = useQueryClient();
  const [savedFlash, setSavedFlash] = createSignal(false);
  let saveTimer;
  let flashTimer;
  let recordId = null;
  let pendingHtml = null;

  const topicsQuery = useQuery(() => ({
    queryKey: ["topics", props.weekLabel],
    queryFn: () => base44.entities.DiscussionTopic.filter(
      { week_label: props.weekLabel }, "-created_date", 100,
    ),
  }));

  const allTopics = () => topicsQuery.data || [];
  const notesRecord = () => allTopics().find(
    (t) => t.week_label === props.weekLabel && t.is_jobs_topic === true && t.title === "__meeting_notes__",
  );

  createEffect(() => {
    const record = notesRecord();
    recordId = record?.id || null;
  });

  const saveMutation = useMutation(() => ({
    mutationFn: async (html) => {
      if (recordId) {
        return base44.entities.DiscussionTopic.update(recordId, { description: html });
      }
      const created = await base44.entities.DiscussionTopic.create({
        title: "__meeting_notes__",
        submitted_by: "system",
        week_label: props.weekLabel,
        is_jobs_topic: true,
        description: html,
      });
      recordId = created.id;
      return created;
    },
    onSuccess: () => {
      setSavedFlash(true);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setSavedFlash(false), 2200);
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  }));

  const flushPending = () => {
    if (pendingHtml === null) return;
    clearTimeout(saveTimer);
    const html = pendingHtml;
    pendingHtml = null;
    saveMutation.mutate(html);
  };

  const handleChange = (html) => {
    pendingHtml = html;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPending, 600);
  };

  const flushOnExit = () => {
    if (document.visibilityState === "hidden") flushPending();
  };
  document.addEventListener("visibilitychange", flushOnExit);
  window.addEventListener("pagehide", flushPending);

  onCleanup(() => {
    document.removeEventListener("visibilitychange", flushOnExit);
    window.removeEventListener("pagehide", flushPending);
    clearTimeout(flashTimer);
    flushPending();
  });

  return (
    <Show
      when={!topicsQuery.isLoading}
      fallback={<div class="border border-border bg-card px-4 py-6 text-sm text-muted-foreground">Loading notes…</div>}
    >
      {/* This is deliberately the exact document surface used by Discussion
          topic creation/editing. There is one flowing editor—never note cards,
          blocks, grids or columns. `keyed` keeps each week isolated because
          Quill seeds initialHtml only on mount. */}
      <div class="rounded-lg border border-border bg-background p-3.5 shadow-lg sm:p-5">
        <div class="min-w-0 space-y-4">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Editing meeting notes</p>
            <p class="mt-0.5 text-xs text-muted-foreground">One continuous document, matching the Discussion editor.</p>
          </div>
          <Show when={props.weekLabel} keyed>
            {() => (
              <DiscussionDocumentEditor
                fallbackHeight="360px"
                title="Meeting Notes / ミーティングノート"
                initialHtml={notesRecord()?.description || ""}
                onChange={handleChange}
                onSave={flushPending}
                saving={saveMutation.isPending}
                saved={savedFlash()}
                minHeight="360px"
                stickyTop="0px"
                placeholder="Write meeting notes like a normal document… / 通常の文書として議事録を書いてください…"
              />
            )}
          </Show>
        </div>
      </div>
    </Show>
  );
}
