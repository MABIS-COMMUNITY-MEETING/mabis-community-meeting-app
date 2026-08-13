import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, Send, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { askGemini } from "@/lib/geminiClient";

const MABIS_LOGO = "/images/mabis-logo-128.webp";

const SUGGESTIONS = [
  "What's on the agenda this week?",
  "What did we discuss last meeting?",
  "Who's on jobs this week?",
  "Any announcements I should know about?",
];

function getCurrentWeekLabel() {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const friday = new Date(today);
  friday.setDate(today.getDate() + ((5 - dayOfWeek + 7) % 7));
  const y = friday.getFullYear();
  const jan4 = new Date(y, 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const weekNum = Math.ceil(((friday - startOfWeek1) / 86400000 + 1) / 7);
  return `${y}-W${String(weekNum).padStart(2, "0")}`;
}

function weekLabelToDate(label) {
  const [year, weekPart] = label.split("-W");
  const week = parseInt(weekPart);
  const jan4 = new Date(parseInt(year), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const result = new Date(startOfWeek1);
  result.setDate(startOfWeek1.getDate() + (week - 1) * 7 + 4);
  return result;
}

function formatDate(label) {
  try { return format(weekLabelToDate(label), "MMMM do, yyyy"); }
  catch { return label; }
}

function buildContext(topics, members, assignments, announcements, meetings, news, missingItems) {
  const currentWeek = getCurrentWeekLabel();
  const currentTopics = topics.filter(t => t.week_label === currentWeek && !t.archived && t.title !== "__meeting_notes__");
  const archivedTopics = topics.filter(t => t.archived && t.title !== "__meeting_ended__");
  const archivedWeeks = [...new Set(archivedTopics.map(t => t.week_label))].sort().reverse();
  const currentJobs = assignments.filter(a => a.week_label === currentWeek);
  const meetingNotes = topics.find(t => t.week_label === currentWeek && t.title === "__meeting_notes__");

  let ctx = `Current Week: ${formatDate(currentWeek)}\n\n`;

  ctx += `MEMBERS (${members.length}):\n`;
  members.forEach(m => { ctx += `- ${m.name} (${m.role || "student"})\n`; });

  ctx += `\nTHIS WEEK'S TOPICS (${currentTopics.length}):\n`;
  if (currentTopics.length === 0) ctx += "  None yet.\n";
  currentTopics.forEach(t => {
    ctx += `- [${t.completed ? "DONE" : "PENDING"}] "${t.title}" (by ${t.submitted_by}, priority ${t.priority || 3})\n`;
    if (t.description) ctx += `    ${(t.description || "").replace(/<[^>]+>/g, "").slice(0, 300)}\n`;
  });

  if (meetingNotes && meetingNotes.description) {
    ctx += `\nTHIS WEEK'S MEETING NOTES:\n${(meetingNotes.description || "").replace(/<[^>]+>/g, "").slice(0, 1000)}\n`;
  }

  ctx += `\nJOB ASSIGNMENTS THIS WEEK (${currentJobs.length}):\n`;
  if (currentJobs.length === 0) ctx += "  None yet.\n";
  currentJobs.forEach(a => {
    const done = (a.days_completed || []).length;
    const notDone = (a.not_done_days || []).length;
    ctx += `- ${a.job_title} -> ${a.assigned_to_name} (done: ${done} days, not done: ${notDone} days)\n`;
  });

  ctx += `\nANNOUNCEMENTS (${announcements.length}):\n`;
  if (announcements.length === 0) ctx += "  None.\n";
  announcements.slice(0, 10).forEach(a => {
    ctx += `- "${a.title}" by ${a.author_name}${a.pinned ? " [PINNED]" : ""}\n`;
  });

  if (news && news.length > 0) {
    ctx += `\nNEWS (${news.length}):\n`;
    news.slice(0, 10).forEach(n => { ctx += `- "${n.title}" by ${n.author_name}\n`; });
  }

  if (missingItems && missingItems.length > 0) {
    const lost = missingItems.filter(m => !m.found);
    if (lost.length > 0) {
      ctx += `\nMISSING ITEMS (${lost.length} still lost):\n`;
      lost.slice(0, 10).forEach(m => {
        ctx += `- ${m.item_name} (${m.colors || "unknown color"}) reported by ${m.reported_by_name}\n`;
      });
    }
  }

  ctx += `\n=== PAST MEETING HISTORY (${archivedWeeks.length} archived weeks) ===\n`;
  if (archivedWeeks.length === 0) ctx += "  None yet.\n";
  archivedWeeks.forEach(week => {
    const weekTopics = archivedTopics.filter(t => t.week_label === week);
    const weekNotes = topics.find(t => t.week_label === week && t.title === "__meeting_notes__");
    ctx += `  ${formatDate(week)} (${weekTopics.length} topics):\n`;
    weekTopics.forEach(t => {
      ctx += `    - [${t.completed ? "DONE" : "PENDING"}] "${t.title}" (by ${t.submitted_by})\n`;
      if (t.description) ctx += `      ${(t.description || "").replace(/<[^>]+>/g, "").slice(0, 200)}\n`;
    });
    if (weekNotes && weekNotes.description) {
      ctx += `    Notes: ${(weekNotes.description || "").replace(/<[^>]+>/g, "").slice(0, 500)}\n`;
    }
  });

  if (meetings.length > 0) {
    ctx += `\nSCHEDULED MEETINGS (${meetings.length}):\n`;
    meetings.forEach(m => { ctx += `- ${m.title} (${m.date}) [${m.status}]\n`; });
  }

  return ctx;
}

export default function MabisAIAssistant({ defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const [expanded, setExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const handleSend = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setMessages(prev => [...prev, { role: "user", content: trimmed }]);
    setInput("");
    setLoading(true);

    try {
      const results = await Promise.allSettled([
        base44.entities.DiscussionTopic.list("-created_date", 1000),
        base44.entities.Member.list("name", 200),
        base44.entities.JobAssignment.list("-created_date", 500),
        base44.entities.Announcement.list("-created_date", 50),
        base44.entities.Meeting.list("-date", 50),
        base44.entities.NewsItem.list("-created_date", 50),
        base44.entities.MissingItem.list("-created_date", 50),
      ]);
      const topics = results[0].status === "fulfilled" ? results[0].value : [];
      const members = results[1].status === "fulfilled" ? results[1].value : [];
      const assignments = results[2].status === "fulfilled" ? results[2].value : [];
      const announcements = results[3].status === "fulfilled" ? results[3].value : [];
      const meetings = results[4].status === "fulfilled" ? results[4].value : [];
      const news = results[5].status === "fulfilled" ? results[5].value : [];
      const missingItems = results[6].status === "fulfilled" ? results[6].value : [];

      const context = buildContext(topics, members, assignments, announcements, meetings, news, missingItems);
      const recentHistory = messages.slice(-10).map(m =>
        `${m.role === "user" ? "User" : "You"}: ${m.content}`
      ).join("\n");

      const systemInstruction = `You are the MABIS assistant for the weekly community meeting platform at Montessori Academy Bangkok International School. You think and write exactly like Claude.

VOICE — write the way Claude does, without exception:
- Warm, direct and genuinely curious. You have opinions and share them, but you hold them lightly.
- Lead with the answer. No preamble, no "Great question!", no "Certainly!", no restating what was asked.
- Plain, precise prose. Contractions throughout. No corporate filler, no hype words like "delve", "dive in", "unlock", "seamless", "elevate".
- Match length to the question: a one-line question gets a one-line answer; something genuinely complex gets a few short paragraphs. Never pad.
- Prose by default. Only use bullets or headings when the content is genuinely a list, and never for two or three items.
- No emoji unless the person uses them first. No exclamation marks stacked on for enthusiasm.
- Be honest about uncertainty — say "I'm not sure" or "I don't have that in the data" rather than guessing, and never invent names, dates or decisions that aren't in the platform data.
- Push back politely when something looks wrong, and say so plainly rather than agreeing to be agreeable.
- Don't moralise, don't lecture, don't close every reply with "let me know if you need anything else".
- Ask a clarifying question only when you truly can't answer without it — otherwise make a reasonable assumption and say what you assumed.
- You can talk about anything, not just this platform.

=== PLATFORM DATA ===
${context}

=== RECENT CHAT ===
${recentHistory || "(just started)"}`;

      const response = await askGemini({
        prompt: trimmed,
        systemInstruction,
        history: messages.slice(-10),
        useSearch: true,
      });

      setMessages(prev => [...prev, { role: "assistant", content: typeof response === "string" ? response : String(response) }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong on my end. Give me a sec and try again?" }]);
    }
    setLoading(false);
  };

  const panelWidth = expanded ? 720 : 420;
  const panelHeight = expanded ? "82vh" : "620px";

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className={`mobile-fab mobile-fab-right fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white border-2 border-white ${open ? "mobile-fab-open" : ""}`}
        style={{ background: "hsl(var(--primary))" }}
        title="MABIS Omni AI Assistant"
      >
        {open ? <X className="w-6 h-6" /> : <Sparkles className="w-6 h-6" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="mobile-assistant-panel fixed bottom-24 right-6 z-[60] rounded-2xl shadow-2xl border border-black/10 flex flex-col overflow-hidden"
            style={{ width: `min(${panelWidth}px, calc(100vw - 3rem))`, height: `min(${panelHeight}, 78vh)`, background: "#F5F4EE", paddingBottom: "env(safe-area-inset-bottom)" }}
          >
            {/* Header — quiet, claude-style: just a title and window controls */}
            <div className="px-4 h-12 flex items-center gap-2 shrink-0 border-b border-black/5">
              <img src={MABIS_LOGO} alt="MABIS" className="w-6 h-6 object-contain" />
              <p className="flex-1 text-[13px] font-medium text-[#3D3929]">MABIS Assistant</p>
              <button onClick={() => setExpanded(!expanded)} className="text-[#3D3929]/50 hover:text-[#3D3929] p-1" title={expanded ? "Shrink" : "Expand"}>
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="text-[#3D3929]/50 hover:text-[#3D3929] p-1">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation — single centred column, assistant replies unboxed */}
            <div className="flex-1 overflow-y-auto">
              {messages.length === 0 ? (
                <div className="h-full flex flex-col justify-center px-6 max-w-[46rem] mx-auto w-full">
                  <div className="flex items-center gap-2.5 mb-6">
                    <Sparkles className="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                    <h2 className="text-[26px] leading-none text-[#3D3929]" style={{ fontFamily: "var(--font-heading)" }}>
                      How can I help?
                    </h2>
                  </div>
                  <div className="flex flex-col divide-y divide-black/5 border-y border-black/5">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => handleSend(s)}
                        className="text-left text-[13px] text-[#3D3929]/75 hover:text-[#3D3929] px-1 py-3 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="max-w-[46rem] mx-auto w-full px-5 py-6 space-y-6">
                  {messages.map((msg, i) => (
                    msg.role === "user" ? (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[80%] rounded-xl bg-white border border-black/5 px-3.5 py-2.5 text-[14px] leading-relaxed text-[#3D3929] whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-3">
                        <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5" style={{ background: "hsl(var(--primary))" }}>
                          <Sparkles className="w-3 h-3 text-white" />
                        </div>
                        <div className="flex-1 text-[14.5px] leading-[1.7] text-[#3D3929] whitespace-pre-wrap">
                          {msg.content}
                        </div>
                      </div>
                    )
                  ))}
                  {loading && (
                    <div className="flex gap-3">
                      <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5" style={{ background: "hsl(var(--primary))" }}>
                        <Sparkles className="w-3 h-3 text-white" />
                      </div>
                      <div className="flex items-center gap-1 h-6">
                        <span className="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  )}
                  <div ref={endRef} />
                </div>
              )}
            </div>

            {/* Composer — rounded card, send button tucked bottom-right */}
            <div className="shrink-0 px-4 pb-4 pt-1">
              <div className="max-w-[46rem] mx-auto w-full rounded-2xl bg-white border border-black/10 shadow-sm p-2.5 focus-within:border-black/20 transition-colors">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input); }
                  }}
                  rows={2}
                  placeholder="Reply to MABIS Assistant…"
                  disabled={loading}
                  className="w-full resize-none bg-transparent px-1.5 text-[14px] leading-relaxed text-[#3D3929] placeholder:text-[#3D3929]/40 focus:outline-none disabled:opacity-50"
                />
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSend(input)}
                    disabled={loading || !input.trim()}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white shrink-0 disabled:opacity-30 transition-opacity"
                    style={{ background: "hsl(var(--primary))" }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}