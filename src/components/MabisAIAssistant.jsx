import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, Send, Maximize2, Minimize2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { askGemini } from "@/lib/geminiClient";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

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

export default function MabisAIAssistant() {
  const [open, setOpen] = useState(false);
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

      const systemInstruction = `You are the MABIS community meeting secretary — a friendly, real person who helps run the weekly meeting platform at Montessori Academy Bangkok International School.

PERSONALITY:
- Talk like a real human having a chat, not a bot. Short, casual, warm.
- Use contractions ("here's", "you've", "that's").
- 1-3 sentences max. Get to the point fast.
- If listing things, keep it brief — just the highlights.
- Be helpful and proactive, like a good secretary who knows what's going on.
- If someone asks about something you can see in the data, just tell them directly.
- If you don't know, say so honestly — "I'm not sure about that one" or "I don't have that info right now."
- You can also chat about general topics — you're not limited to platform data.
- No bullet points unless they specifically ask for a list. Just talk naturally.

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

  const panelWidth = expanded ? 560 : 380;
  const panelHeight = expanded ? "80vh" : "560px";

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white border-2 border-white"
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
            className="fixed bottom-24 right-6 z-[60] bg-white rounded-2xl shadow-2xl border border-gray-200 flex flex-col overflow-hidden"
            style={{ width: `min(${panelWidth}px, calc(100vw - 3rem))`, height: `min(${panelHeight}, 75vh)` }}
          >
            {/* Header */}
            <div className="px-4 py-3 flex items-center gap-2.5 shrink-0" style={{ background: "hsl(var(--primary))" }}>
              <img src={MABIS_LOGO} alt="MABIS" className="w-8 h-8 rounded-lg bg-white p-1 object-contain" />
              <div className="flex-1">
                <p className="text-white font-bold text-sm">MABIS Omni AI Assistant</p>
                <p className="text-white/70 text-[10px]">How can I help?</p>
              </div>
              <button onClick={() => setExpanded(!expanded)} className="text-white/70 hover:text-white p-1" title={expanded ? "Shrink" : "Expand"}>
                {expanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>
              <button onClick={() => setOpen(false)} className="text-white/70 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 ? (
                <div>
                  <div className="text-center text-gray-500 text-sm mb-4">
                    <Sparkles className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                    Hi! I'm your MABIS assistant.
                    <br />Ask me about meetings, topics, jobs, or anything else.
                  </div>
                  <div className="space-y-2">
                    {SUGGESTIONS.map(s => (
                      <button key={s} onClick={() => handleSend(s)}
                        className="block w-full text-left text-xs text-gray-600 hover:bg-gray-50 px-3 py-2.5 rounded-lg border border-gray-100 transition-colors">
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm ${
                      msg.role === "user"
                        ? "text-white rounded-br-sm"
                        : "bg-gray-100 text-gray-700 rounded-bl-sm"
                    }`} style={msg.role === "user" ? { background: "hsl(var(--primary))" } : {}}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            {/* Input */}
            <div className="border-t border-gray-100 p-3 shrink-0">
              <div className="flex items-center gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend(input)}
                  placeholder="Type a message..."
                  disabled={loading}
                  className="flex-1 h-10 rounded-full border border-gray-200 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend(input)}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40 transition-opacity"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}