import { createSignal, createEffect, on, onCleanup, Show } from "solid-js";
import { useQuery, useMutation } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import BlockNotesEditor from "~/components/notes/BlockNotesEditor";

/*
 * Autosaving meeting notes — 1:1 port of src/components/MeetingNotesEditor.jsx.
 *
 * The record id lives in a plain variable, not a signal: it is written during a
 * create→update transition and must never re-trigger a render, because that
 * would remount the editor mid-typing. React used a ref for the same reason.
 */
export default function MeetingNotesEditor(props) {
  const [savedFlash, setSavedFlash] = createSignal(false);
  let saveTimer;
  let flashTimer;
  let recordId = null;

  const topicsQuery = useQuery(() => ({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  }));

  const allTopics = () => topicsQuery.data || [];
  const notesRecord = () => allTopics().find(
    (t) => t.week_label === props.weekLabel && t.is_jobs_topic === true && t.title === "__meeting_notes__",
  );

  /*
   * Forget the id the moment the week changes.
   *
   * recordId used to be set and never cleared, because the effect below guards
   * on `if (record)`. Open a week that HAS notes, switch to one that does not,
   * and the id stayed pointing at the previous week's record — so the first
   * keystroke in the new week ran update() against LAST week's document and
   * overwrote it. Silently, and with no way to tell from the editor, which
   * showed the correct (empty) week the whole time.
   *
   * Clearing on week change is deliberately a separate effect from the set
   * below. Collapsing them into `recordId = notesRecord()?.id ?? null` looks
   * tidier and reintroduces a different bug: between create() resolving and
   * the topics query refetching, notesRecord() is briefly undefined, so the
   * id would be wiped and the next autosave would create a SECOND record for
   * the same week. Clear on week, set on record.
   */
  createEffect(on(() => props.weekLabel, () => { recordId = null; }));

  createEffect(() => {
    const record = notesRecord();
    if (record) recordId = record.id;
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
    },
  }));

  const handleChange = (html) => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => saveMutation.mutate(html), 600);
  };

  onCleanup(() => { clearTimeout(saveTimer); clearTimeout(flashTimer); });

  const status = () => (saveMutation.isPending ? "SAVING…" : savedFlash() ? "✓ SAVED" : "AUTOSAVE ON");

  return (
    <Show
      when={!topicsQuery.isLoading}
      fallback={<div class="border border-border bg-card px-4 py-6 text-sm text-muted-foreground">Loading notes…</div>}
    >
      {/* `keyed` reproduces React's key={weekLabel}: changing week must build a
          fresh editor, because BlockNotesEditor parses initialHtml once at
          creation. Gating on isLoading first means it is only ever created with
          the loaded record, never with an empty string it would then keep. */}
      <Show when={props.weekLabel} keyed>
        {(week) => (
          <BlockNotesEditor
            initialHtml={notesRecord()?.description || ""}
            onChange={handleChange}
            status={status()}
            data-week={week}
          />
        )}
      </Show>
    </Show>
  );
}
