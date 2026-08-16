import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DocsEditor from "@/components/DocsEditor";
import { resolveMinutesDocument } from "@/lib/minutes-format";

/*
 * The week's minutes document.
 *
 * One document per week, edited like a word processor, with File › Download as
 * ODT. Replaces the old "add a topic" list.
 *
 * ── How the old data is preserved ──────────────────────────────────────────
 * Each week's minutes live in the DiscussionTopic record titled
 * "__meeting_notes__" for that week_label — the same record the previous notes
 * editor used, so notes already written are picked up unchanged. A week with no
 * document yet is seeded from its existing topics (see lib/minutes-format.js).
 * That seed is held in memory and only written when the document is saved, so:
 *
 *   · Topic records are never modified or deleted. History still reads them.
 *   · Opening a week read-only writes nothing at all.
 *   · Once a document has real content the seed never applies again, so a save
 *     cannot overwrite edited minutes with the original topic list.
 *
 * ── Everything here is keyed by week, deliberately ─────────────────────────
 * The first version of this component kept `seeded`, `latestHtml` and
 * `recordId` as bare refs, and it produced two bugs:
 *
 *   1. The seed latch was reset in an effect on [weekLabel], but initialHtml is
 *      computed in a memo DURING render. Effects run after. So the first render
 *      of the new week still saw the previous week's latch and returned the
 *      previous week's HTML — "21 August" opened showing 14 August's minutes.
 *
 *   2. Worse and silent: the debounced save read recordId from a ref at FIRE
 *      time, not schedule time. Type in one week, switch within the debounce,
 *      and the timer wrote that text into the newly-selected week's document.
 *
 * Both had the same root cause — mutable state with no week identity, read at a
 * different moment than it was written. Every ref below therefore carries the
 * week it belongs to, the latch is compared during render rather than reset by
 * an effect, and a pending save captures its full target up front.
 */
export default function MeetingMinutes({ weekLabel, weekTitle, canEdit = true }) {
  const queryClient = useQueryClient();
  const [savedFlash, setSavedFlash] = useState(false);
  const flashTimer = useRef(null);

  // { week, html } — whose week this HTML belongs to, so it can never be
  // written into a different week's document.
  const latestRef = useRef({ week: null, html: "" });
  // The week whose seed has already been resolved. Compared during render.
  const seededForWeekRef = useRef(null);
  // Ids of records this component created, keyed by week. Without this a second
  // save before the query refetches would not see the new record and would
  // create a duplicate __meeting_notes__ row for the same week.
  const createdIdsRef = useRef(new Map());
  // { timer, payload } for the debounced save, so it can be flushed intact.
  const pendingRef = useRef(null);

  const { data: allTopics = [], isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  });

  const notesRecord = useMemo(
    () => allTopics.find(
      (t) => t.week_label === weekLabel && t.title === "__meeting_notes__",
    ),
    [allTopics, weekLabel],
  );

  const recordIdFor = (week) =>
    (week === weekLabel ? notesRecord?.id : undefined) ?? createdIdsRef.current.get(week) ?? null;

  const initialHtml = useMemo(() => {
    if (isLoading) return "";
    const { html, memo } = resolveMinutesDocument({
      week: weekLabel,
      storedHtml: notesRecord?.description,
      topics: allTopics,
      heading: weekTitle,
      memo: latestRef.current.week === seededForWeekRef.current
        ? { seededWeek: seededForWeekRef.current, ...latestRef.current }
        : null,
    });
    seededForWeekRef.current = memo.seededWeek;
    latestRef.current = { week: memo.week, html: memo.html };
    return html;
    // allTopics is intentionally absent: a refetch must not re-seed a week that
    // has already been resolved, or it would fight the user's typing.
     
  }, [isLoading, weekLabel, notesRecord?.id, notesRecord?.description]);

  const saveMutation = useMutation({
    // The payload carries its own target. Nothing is read from a ref here.
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
      createdIdsRef.current.set(week, created.id);
      return created;
    },
    onSuccess: () => {
      setSavedFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2200);
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  // Kept in a ref so the flush below always calls the current mutate without
  // needing it in an effect dependency list.
  const mutateRef = useRef(saveMutation.mutate);
  mutateRef.current = saveMutation.mutate;

  /** Send a queued save immediately, to the week it was written for. */
  const flushPending = () => {
    const pending = pendingRef.current;
    if (!pending) return;
    clearTimeout(pending.timer);
    pendingRef.current = null;
    mutateRef.current(pending.payload);
  };

  const handleChange = (html) => {
    latestRef.current = { week: weekLabel, html };
    if (!canEdit) return;

    // Target captured now, while we are definitely still on this week.
    const payload = { html, week: weekLabel, recordId: recordIdFor(weekLabel) };
    if (pendingRef.current) clearTimeout(pendingRef.current.timer);
    const timer = setTimeout(() => {
      pendingRef.current = null;
      mutateRef.current(payload);
    }, 800);
    pendingRef.current = { timer, payload };
  };

  // Changing week (or unmounting) flushes rather than cancels — the payload
  // already names its own week, so sending it is correct and dropping it would
  // silently lose up to 800ms of typing.
  useEffect(() => flushPending, [weekLabel]);
  useEffect(() => () => clearTimeout(flashTimer.current), []);

  if (isLoading) {
    return (
      <div className="border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        Loading minutes…
      </div>
    );
  }

  return (
    <DocsEditor
      // DocsEditor reads initialHtml once at mount, so a week change must build
      // a fresh editor rather than leave the previous week's text in place.
      key={weekLabel}
      title={weekTitle || "Meeting minutes"}
      initialHtml={initialHtml}
      onChange={handleChange}
      onSave={canEdit ? () => {
        if (pendingRef.current) return flushPending();
        mutateRef.current({
          html: latestRef.current.week === weekLabel ? latestRef.current.html : initialHtml,
          week: weekLabel,
          recordId: recordIdFor(weekLabel),
        });
      } : undefined}
      saving={saveMutation.isPending}
      saved={savedFlash}
      minHeight="420px"
      placeholder="Write the minutes for this week…"
    />
  );
}
