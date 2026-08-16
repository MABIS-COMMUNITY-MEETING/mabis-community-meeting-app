import { createSignal, createMemo, createEffect, on, onCleanup, Show } from "solid-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import DocsEditor from "~/components/DocsEditor";
import { resolveMinutesDocument } from "@/lib/minutes-format";

/*
 * The week's minutes document — Solid port of src/components/MeetingMinutes.jsx.
 *
 * One document per week, edited like a word processor, with File › Download as
 * ODT. Replaces the old "add a topic" list.
 *
 * Data handling is identical to the React version and deliberately so:
 * minutes live in the DiscussionTopic record titled "__meeting_notes__" for the
 * week, a week with no document is seeded from its existing topics, and topic
 * records are only ever READ — never modified or deleted. History still reads
 * them unchanged.
 *
 * Every piece of mutable state below carries the week it belongs to. That is
 * not defensive style, it is fixing two real bugs the React version shipped
 * with: a boolean seed latch handed the previous week's text to the next week
 * (21 August opened showing 14 August's minutes), and a debounced save that
 * read its target at fire time wrote one week's text into another week's
 * document. resolveMinutesDocument() is shared with React and carries the
 * regression tests for the first; the payload capture below covers the second.
 */
export default function MeetingMinutes(props) {
  const queryClient = useQueryClient();
  const [savedFlash, setSavedFlash] = createSignal(false);
  let flashTimer;

  // { week, html } — whose week this HTML belongs to.
  let latest = { week: null, html: "" };
  // Caller-owned memo for resolveMinutesDocument, tagged with its week.
  let resolved = null;
  // Ids of records this component created, keyed by week, so a second save
  // before the query refetches cannot create a duplicate row for the week.
  const createdIds = new Map();
  // { timer, payload } for the debounced save, so it can be flushed intact.
  let pending = null;

  const topicsQuery = useQuery(() => ({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  }));
  const allTopics = () => topicsQuery.data || [];
  const notesRecord = () => allTopics().find(
    (t) => t.week_label === props.weekLabel && t.title === "__meeting_notes__",
  );

  const recordIdFor = (week) =>
    (week === props.weekLabel ? notesRecord()?.id : undefined) ?? createdIds.get(week) ?? null;

  const initialHtml = createMemo(() => {
    if (topicsQuery.isLoading) return "";
    const { html, memo } = resolveMinutesDocument({
      week: props.weekLabel,
      storedHtml: notesRecord()?.description,
      topics: allTopics(),
      heading: props.weekTitle,
      memo: resolved,
    });
    resolved = memo;
    latest = { week: memo.week, html: memo.html };
    return html;
  });

  const saveMutation = useMutation(() => ({
    // The payload carries its own target. Nothing is read from shared state.
    mutationFn: async ({ html, week, recordId }) => {
      if (recordId) {
        return base44.entities.DiscussionTopic.update(recordId, { description: html });
      }
      const created = await base44.entities.DiscussionTopic.create({
        title: "__meeting_notes__",
        submitted_by: "system",
        week_label: week,
        is_jobs_topic: true,
        description: html,
      });
      createdIds.set(week, created.id);
      return created;
    },
    onSuccess: () => {
      setSavedFlash(true);
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => setSavedFlash(false), 2200);
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  }));

  /** Send a queued save immediately, to the week it was written for. */
  const flushPending = () => {
    if (!pending) return;
    clearTimeout(pending.timer);
    const { payload } = pending;
    pending = null;
    saveMutation.mutate(payload);
  };

  const handleChange = (html) => {
    latest = { week: props.weekLabel, html };
    if (props.canEdit === false) return;

    // Target captured now, while we are definitely still on this week.
    const payload = { html, week: props.weekLabel, recordId: recordIdFor(props.weekLabel) };
    if (pending) clearTimeout(pending.timer);
    const timer = setTimeout(() => {
      pending = null;
      saveMutation.mutate(payload);
    }, 800);
    pending = { timer, payload };
  };

  // Changing week flushes rather than cancels — the payload already names its
  // own week, so sending it is correct and dropping it would lose typing.
  createEffect(on(() => props.weekLabel, () => { onCleanup(flushPending); }));
  onCleanup(() => { clearTimeout(flashTimer); flushPending(); });

  const handleSave = () => {
    if (pending) return flushPending();
    saveMutation.mutate({
      html: latest.week === props.weekLabel ? latest.html : initialHtml(),
      week: props.weekLabel,
      recordId: recordIdFor(props.weekLabel),
    });
  };

  return (
    <Show
      when={!topicsQuery.isLoading}
      fallback={
        <div class="border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
          Loading minutes…
        </div>
      }
    >
      {/* keyed: DocsEditor reads initialHtml once at mount, so a week change
          must build a fresh editor rather than leave last week's text behind. */}
      <Show when={props.weekLabel} keyed>
        {() => (
          <DocsEditor
            title={props.weekTitle || "Meeting minutes"}
            initialHtml={initialHtml()}
            onChange={handleChange}
            onSave={props.canEdit === false ? undefined : handleSave}
            saving={saveMutation.isPending}
            saved={savedFlash()}
            minHeight="420px"
            placeholder="Write the minutes for this week…"
          />
        )}
      </Show>
    </Show>
  );
}
