import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import DocsEditor from "@/components/DocsEditor";

export default function MeetingNotesEditor({ weekLabel }) {
  const contentRef = useRef("");
  const [saved, setSaved] = useState(false);
  const queryClient = useQueryClient();

  const { data: allTopics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  });

  const notesRecord = allTopics.find(t => t.week_label === weekLabel && t.is_jobs_topic === true && t.title === "__meeting_notes__");

  const saveMutation = useMutation({
    mutationFn: (html) => notesRecord
      ? base44.entities.DiscussionTopic.update(notesRecord.id, { description: html })
      : base44.entities.DiscussionTopic.create({
          title: "__meeting_notes__",
          submitted_by: "system",
          week_label: weekLabel,
          is_jobs_topic: true,
          description: html,
        }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
  });

  const handleSave = () => {
    saveMutation.mutate(contentRef.current);
  };

  return (
    <DocsEditor
      key={notesRecord?.id || "new-notes"}
      title="Meeting Notes"
      placeholder="Start typing meeting notes…"
      minHeight="280px"
      initialHtml={notesRecord?.description || ""}
      onChange={(html) => { contentRef.current = html; }}
      onSave={handleSave}
      saving={saveMutation.isPending}
      saved={saved}
    />
  );
}