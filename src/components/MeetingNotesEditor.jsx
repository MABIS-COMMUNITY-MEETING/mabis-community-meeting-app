import React, { useEffect, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import BlockNotesEditor from "@/components/notes/BlockNotesEditor";

export default function MeetingNotesEditor({ weekLabel }) {
  const [savedFlash, setSavedFlash] = useState(false);
  const saveTimer = useRef(null);
  const flashTimer = useRef(null);
  // The record id lives in a ref so a create → update transition never
  // remounts the editor mid-typing.
  const recordIdRef = useRef(null);

  const { data: allTopics = [], isLoading } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  });

  const notesRecord = allTopics.find(t => t.week_label === weekLabel && t.is_jobs_topic === true && t.title === "__meeting_notes__");
  useEffect(() => { if (notesRecord) recordIdRef.current = notesRecord.id; }, [notesRecord]);

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
    },
  });

  const handleChange = (html) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => saveMutation.mutate(html), 600);
  };

  useEffect(() => () => { clearTimeout(saveTimer.current); clearTimeout(flashTimer.current); }, []);

  const status = saveMutation.isPending ? "SAVING…" : savedFlash ? "✓ SAVED" : "AUTOSAVE ON";

  if (isLoading) {
    return <div className="border border-border bg-card px-4 py-6 text-sm text-muted-foreground">Loading notes…</div>;
  }

  // Keyed on the week only — refetches never remount the editor mid-typing.
  return (
    <BlockNotesEditor
      key={weekLabel}
      initialHtml={notesRecord?.description || ""}
      onChange={handleChange}
      status={status}
    />
  );
}