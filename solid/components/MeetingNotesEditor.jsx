import { createSignal, createEffect, onMount, onCleanup, Show } from "solid-js";
import { useQuery, useQueryClient } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import MeetingDocumentEditor from "~/components/MeetingDocumentEditor";

/*
 * Autosaving meeting notes in the lightweight flowing meeting editor.
 *
 * The record id lives in a plain variable, not a signal: it is written during a
 * create→update transition and must never re-trigger a render, because that
 * would remount the editor mid-typing. React used a ref for the same reason.
 */
export default function MeetingNotesEditor(props) {
  const queryClient = useQueryClient();
  const [savedFlash, setSavedFlash] = createSignal(false);
  const [saving, setSaving] = createSignal(false);
  const [saveError, setSaveError] = createSignal("");
  let saveTimer;
  let flashTimer;
  let recordId = null;
  let recordWeek = props.weekLabel;
  let pendingHtml = null;
  let disposed = false;
  let outstandingSaves = 0;
  let saveQueue = Promise.resolve();

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
    const week = props.weekLabel;
    if (recordWeek !== week) {
      recordWeek = week;
      recordId = null;
    }
    const record = notesRecord();
    if (record?.id) recordId = record.id;
  });

  const persistHtml = async (html) => {
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
  };

  const enqueueSave = (html) => {
    outstandingSaves += 1;
    if (!disposed) {
      setSaving(true);
      setSaveError("");
    }

    // A second debounce/pagehide/cleanup flush waits for the first create to
    // supply recordId, so it becomes an update instead of a duplicate record.
    const operation = saveQueue.then(() => persistHtml(html));
    saveQueue = operation.catch(() => {});
    void operation.then(() => {
      outstandingSaves -= 1;
      if (disposed) return;
      setSaving(outstandingSaves > 0);
      setSavedFlash(true);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setSavedFlash(false), 2200);
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    }).catch((error) => {
      outstandingSaves -= 1;
      if (disposed) return;
      setSaving(outstandingSaves > 0);
      setSaveError(error?.message || "Could not save meeting notes. Your text is still on this screen.");
    });
  };

  const flushPending = () => {
    if (pendingHtml === null) return;
    clearTimeout(saveTimer);
    const html = pendingHtml;
    pendingHtml = null;
    enqueueSave(html);
  };

  const handleChange = (html) => {
    pendingHtml = html;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushPending, 600);
  };

  const flushOnExit = () => {
    if (document.visibilityState === "hidden") flushPending();
  };
  onMount(() => {
    document.addEventListener("visibilitychange", flushOnExit);
    window.addEventListener("pagehide", flushPending);

    onCleanup(() => {
      document.removeEventListener("visibilitychange", flushOnExit);
      window.removeEventListener("pagehide", flushPending);
      clearTimeout(saveTimer);
      clearTimeout(flashTimer);
      const finalHtml = pendingHtml;
      pendingHtml = null;
      disposed = true;
      // Persist the last edit directly through the serialized queue. Calling a
      // Solid Query mutation after its owner was disposed was the old
      // pause/end race and could leave Meeting Mode stuck.
      if (finalHtml !== null) enqueueSave(finalHtml);
    });
  });

  return (
    <Show
      when={!topicsQuery.isLoading}
      fallback={<div class="border border-border bg-card px-4 py-6 text-sm text-muted-foreground">Loading notes…</div>}
    >
      {/* One flowing document—never note cards, blocks, grids or columns.
          Meeting Mode uses the native meeting editor so opening notes never
          imports or initialises the much heavier Discussion/Quill engine. */}
      <div class="rounded-lg border border-border bg-background p-3.5 shadow-lg sm:p-5">
        <div class="min-w-0 space-y-4">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Editing meeting notes</p>
            <p class="mt-0.5 text-xs text-muted-foreground">One continuous document, matching the Discussion editor.</p>
          </div>
          <Show when={props.weekLabel} keyed>
            {() => (
              <MeetingDocumentEditor
                title="Meeting Notes / ミーティングノート"
                initialHtml={notesRecord()?.description || ""}
                onChange={handleChange}
                onSave={flushPending}
                saving={saving()}
                saved={savedFlash()}
                minHeight="360px"
                stickyTop="0px"
                placeholder="Write meeting notes like a normal document… / 通常の文書として議事録を書いてください…"
              />
            )}
          </Show>
          <Show when={saveError()}>
            <p class="text-xs text-destructive" role="alert">{saveError()}</p>
          </Show>
        </div>
      </div>
    </Show>
  );
}
