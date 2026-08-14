import React, { useEffect, useState } from "react";
import { Sparkles, RotateCcw, AlertCircle } from "lucide-react";
import { askGemini } from "@/lib/geminiClient";

// Module-level cache so summaries persist across open/close toggles.
const cache = new Map();

export default function MeetingSummary({ weekLabel, weekTopics, attendance }) {
  const [summary, setSummary] = useState(() => cache.get(weekLabel) || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    const topics = weekTopics.map((t, i) => {
      const desc = t.description ? ` — ${t.description.replace(/<[^>]+>/g, "").slice(0, 120)}` : "";
      return `${i + 1}. ${t.title}${desc} [${t.completed ? "done" : "open"}] (by ${t.submitted_by})`;
    }).join("\n");
    const present = attendance?.present_names?.length ? attendance.present_names.join(", ") : "N/A";
    const prompt = `You are summarizing a weekly secondary school community meeting for the MABIS Community Meeting App.
Write a concise, friendly meeting summary (3-5 short sentences) in plain text. Cover the overall focus, key topics discussed, completion status, and attendance vibe. Do not use headings or markdown — just a flowing paragraph.

Week: ${weekLabel}
Attendance (${attendance?.present_names?.length || 0} present): ${present}
Discussion topics (${weekTopics.length}):
${topics}`;

    try {
      const text = await askGemini({ prompt, systemInstruction: "You are a helpful meeting secretary. Keep summaries concise, warm, and student-friendly." });
      setSummary(text);
      cache.set(weekLabel, text);
    } catch (e) {
      setError(e.message || "Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!summary && !loading && !error) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekLabel]);

  if (loading) {
    return (
      <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-border flex items-center gap-3">
        <Sparkles className="w-4 h-4 text-purple-500 animate-pulse" />
        <span className="text-sm text-purple-600 font-medium">Generating meeting summary…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4 bg-red-50 border-b border-border flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>Couldn't generate summary.</span>
        </div>
        <button onClick={generate} className="text-xs font-semibold text-red-600 hover:text-red-700 underline">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="px-6 py-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-border">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-purple-500" />
          <span className="text-xs font-bold text-purple-600 uppercase tracking-wide">AI Meeting Summary</span>
        </div>
        <button onClick={generate} className="text-muted-foreground hover:text-purple-500 transition-colors" title="Regenerate summary">
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>
      <p className="text-sm text-foreground leading-relaxed">{summary}</p>
    </div>
  );
}