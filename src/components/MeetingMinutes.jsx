import React, { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import DocsEditor from "@/components/DocsEditor";
import { topicsToMinutesHtml, isBlankDocument } from "@/lib/minutes-format";

/*
 * The week's minutes document.
 *
 * Replaces the old "add a topic" list: one document per week, edited like a
 * word processor, with File › Download as ODT.
 *
 * ── How the old data is preserved ──────────────────────────────────────────
 * Each week's minutes live in the DiscussionTopic record titled
 * "__meeting_notes__" for that week_label — the same record the previous notes
 * editor used, so any notes already written are picked up unchanged.
 *
 * When a week has no document yet, its existing topics are formatted into one
 * (see lib/minutes-format.js). That seed is held in memory and is only written
 * when the document is actually saved. Consequences, in order of importance:
 *
 *   · Topic records are never modified or deleted. History still reads them.
 *   · Opening a week read-only writes nothing at all.
 *   · Once a document has real content, the seed is never applied again, so a
 *     save can never overwrite edited minutes with the original topic list.
 *
 * That last property is why `seededRef` exists rather than recomputing: React
 * Query refetches `topics` on its own schedule, and without the latch a refetch
 * arriving mid-edit would re-derive the seed and fight the user's typing.
 */
export default function MeetingMinutes({ weekLabel, weekTitle, canEdit = true }) {
  const queryClient = useQueryClient();
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef(null);
  const flashTimer = useRef(null);
  // The record id lives in a ref so a create → update transition never
  // remounts the editor mid-typing.
  const recordIdRef = useRef(null);
  const seededRef = useRef(false);
  const latestHtmlRef = useRef("");

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

  useEffect(() => { recordIdRef.current = notesRecord?.id ?? null; }, [notesRecord]);

  // Reset the latch when the week changes — a different week gets its own
  // document and its own one-time seed.
  useEffect(() => { seededRef.current = false; }, [weekLabel]);

  const initialHtml = useMemo(() => {
    if (isLoading) return "";
    const stored = notesRecord?.description;
    if (!isBlankDocument(stored)) {
      seededRef.current = true;          // a real document exists; never seed over it
      return stored;
    }
    if (seededRef.current) return latestHtmlRef.current;
    const seed = topicsToMinutesHtml(allTopics, weekLabel, { heading: weekTitle });
    seededRef.current = true;
    return seed;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, weekLabel, notesRecord?.id]);

  const saveMutation = useMutation({
    mutationFn: async (html) => {
      if (recordIdRef.current) {
        return base44.entities.DiscussionTopic.update(recordIdRef.current, { description: html });
      }
      const created = await base44.entities.DiscussionTopic.create({
        title: "__meeting_notes__",
        submitted_by: "system",
        week_label: weekLabel,
        is_jobs_topic: true,
        description: html,
      });
      recordIdRef.current = created.id;
      return created;
    },
    onSuccess: () => {
      setSavedFlash(true);
      clearTimeout(flashTimer.current);
      flashTimer.current = setTimeout(() => setSavedFlash(false), 2200);
      queryClient.invalidateQueries({ queryKey: ["topics"] });
    },
  });

  const handleChange = (html) => {
    latestHtmlRef.current = html;
    if (!canEdit) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveMutation.mutate(html), 800);
  };

  useEffect(() => () => {
    clearTimeout(saveTimer.current);
    clearTimeout(flashTimer.current);
  }, []);

  if (isLoading) {
    return (
      <div className="border border-border bg-card px-4 py-6 text-sm text-muted-foreground">
        Loading minutes…
      </div>
    );
  }

  return (
    <DocsEditor
      // Keyed on the week: DocsEditor reads initialHtml once at mount, so a
      // week change must build a fresh editor rather than leave last week's
      // text in place.
      key={weekLabel}
      title={weekTitle || "Meeting minutes"}
      initialHtml={initialHtml}
      onChange={handleChange}
      onSave={canEdit ? () => saveMutation.mutate(latestHtmlRef.current || initialHtml) : undefined}
      saving={saveMutation.isPending}
      saved={savedFlash}
      minHeight="420px"
      placeholder="Write the minutes for this week…"
    />
  );
}
