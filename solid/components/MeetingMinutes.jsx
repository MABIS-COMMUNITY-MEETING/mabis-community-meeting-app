import { createSignal, createMemo, createEffect, on, onCleanup, lazy, Suspense, Show } from "solid-js";
import IdleMount from "~/components/IdleMount";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import { resolveMinutesDocument } from "@/lib/minutes-format";

// Lazy, like every other DocsEditor usage in the app (TopicItem,
// AnnouncementsWidget, NewsWidget, DiscussionWidget's TopicForm). MeetingMinutes
// is itself lazy-loaded from DiscussionWidget; a *static* import here used to
// pull DocsEditor's whole subgraph (Quill, its own CSS chunk, icons) into
// MeetingMinutes' own preload manifest as a hard dependency instead of an
// independent async boundary — a real nested-lazy tangle that kept the outer
// lazy() promise from ever settling once other widgets were loading
// concurrently. Giving it its own Suspense boundary fixes that.
const DocsEditor = lazy(() => import("~/components/DocsEditor"));

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
/* Shown only until the editor mounts. Same surface and reserved height as the
   editor's document area so the swap causes no layout shift. */
function ReadOnlyPaper(props) {
  return (
    <div
      class="docs-editor-content rounded-lg border border-border"
      style={{ "min-height": "420px", padding: "1rem 1.25rem" }}
    >
      <Show
        when={(props.html || "").trim()}
        fallback={
          <p class="text-sm text-muted-foreground">
            {props.canEdit === false
              ? "No minutes were written for this week."
              : "No minutes yet — start writing once the editor is ready."}
          </p>
        }
      >
        <div class="theme-rich-text" innerHTML={props.html} />
      </Show>
    </div>
  );
}

export default function MeetingMinutes(props) {
  const queryClient = useQueryClient();
  const [savedFlash, setSavedFlash] = createSignal(false);
  /*
   * The editor mounts on idle, not on click.
   *
   * DocsEditor carries Quill — 236 KB raw. When the Discussion section was a
   * topic list that only loaded on "Add Topic", it never reached Home's
   * critical path. Making minutes the section itself put Quill on every Home
   * visit and made the page markedly slower to become interactive.
   *
   * Click-to-edit kept Quill off the critical path but changed how the section
   * LOOKS: React always showed the full editor chrome, and a bare read-only
   * card does not mirror it. So the real editor is mounted, just deferred to
   * IdleMount — the document reads identically to React within a moment of the
   * page becoming interactive, and Quill still never competes with first paint.
   *
   * The read-only paper underneath is the placeholder, sized to match, so the
   * swap does not move the page.
   */
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

  /*
   * Week-scoped, and deliberately the SAME key DiscussionWidget uses.
   *
   * This used to list 500 topics under ["topics"] while the widget around it
   * fetched ["topics", week] — two requests for overlapping data on every Home
   * load, one of them pulling the entire history. Sharing the key means one
   * request, scoped to the week, served from cache for whichever mounts second.
   * Everything below only ever needs this week: the __meeting_notes__ record
   * and the topics being seeded into it.
   */
  const topicsQuery = useQuery(() => ({
    queryKey: ["topics", props.weekLabel],
    queryFn: () => base44.entities.DiscussionTopic.filter(
      { week_label: props.weekLabel }, "-created_date", 100,
    ),
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
  createEffect(on(() => props.weekLabel, () => { setEditing(false); onCleanup(flushPending); }));
  onCleanup(() => { clearTimeout(flashTimer); flushPending(); });

  /* One component identity per week — changing week swaps the identity, which
     is what forces DocsEditor to remount with that week's initialHtml. */
  const editors = new Map();
  const editorFor = (week) => {
    if (!editors.has(week)) {
      editors.set(week, () => (
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
      ));
    }
    return editors.get(week);
  };

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
      <IdleMount timeout={1200}>
        <Suspense fallback={<ReadOnlyPaper html={initialHtml()} canEdit={props.canEdit} />}>
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
        </Suspense>
      </IdleMount>
    </Show>
  );
}
