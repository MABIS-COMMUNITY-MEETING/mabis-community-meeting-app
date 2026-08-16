import { createSignal, createEffect, Index, Show } from "solid-js";
import { base44 } from "@/api/base44Client";
import { Sparkles, X, Send, Maximize2, Minimize2 } from "lucide-solid";
import { askGemini } from "@/lib/geminiClient";
import { getWeekLabel, formatWeekFull } from "~/lib/weeks";

/*
 * MABIS assistant — Solid port of src/components/MabisAIAssistant.jsx.
 *
 * Two deliberate differences from the React original:
 *
 *  1. framer's entrance/exit becomes the `assistant-pop` keyframe plus CSS
 *     hover/active transforms on the FAB. Solid has no AnimatePresence, so the
 *     panel's 0.2s *exit* is gone — it unmounts immediately. Entrance is
 *     identical. This is the same trade-off already documented for the nav
 *     indicator.
 *  2. `buildContext` uses the shared week helpers from ~/lib/weeks instead of
 *     redefining getCurrentWeekLabel/weekLabelToDate/formatDate locally. The
 *     React file carries its own third copy of these; the ISO-week maths is
 *     identical, which is exactly why weeks.js exists.
 */

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

const SUGGESTIONS = [
  "What's on the agenda this week?",
  "What did we discuss last meeting?",
  "Who's on jobs this week?",
  "Any announcements I should know about?",
];

const stripTags = (value) => (value || "").replace(/<[^>]+>/g, "");

function buildContext(topics, members, assignments, announcements, meetings, news, missingItems) {
  const currentWeek = getWeekLabel(new Date());
  const currentTopics = topics.filter(t => t.week_label === currentWeek && !t.archived && t.title !== "__meeting_notes__");
  const archivedTopics = topics.filter(t => t.archived && t.title !== "__meeting_ended__");
  const archivedWeeks = [...new Set(archivedTopics.map(t => t.week_label))].sort().reverse();
  const currentJobs = assignments.filter(a => a.week_label === currentWeek);
  const meetingNotes = topics.find(t => t.week_label === currentWeek && t.title === "__meeting_notes__");

  let ctx = `Current Week: ${formatWeekFull(currentWeek)}\n\n`;

  ctx += `MEMBERS (${members.length}):\n`;
  members.forEach(m => { ctx += `- ${m.name} (${m.role || "student"})\n`; });

  ctx += `\nTHIS WEEK'S TOPICS (${currentTopics.length}):\n`;
  if (currentTopics.length === 0) ctx += "  None yet.\n";
  currentTopics.forEach(t => {
    ctx += `- [${t.completed ? "DONE" : "PENDING"}] "${t.title}" (by ${t.submitted_by}, priority ${t.priority || 3})\n`;
    if (t.description) ctx += `    ${stripTags(t.description).slice(0, 300)}\n`;
  });

  if (meetingNotes && meetingNotes.description) {
    ctx += `\nTHIS WEEK'S MEETING NOTES:\n${stripTags(meetingNotes.description).slice(0, 1000)}\n`;
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
    ctx += `  ${formatWeekFull(week)} (${weekTopics.length} topics):\n`;
    weekTopics.forEach(t => {
      ctx += `    - [${t.completed ? "DONE" : "PENDING"}] "${t.title}" (by ${t.submitted_by})\n`;
      if (t.description) ctx += `      ${stripTags(t.description).slice(0, 200)}\n`;
    });
    if (weekNotes && weekNotes.description) {
      ctx += `    Notes: ${stripTags(weekNotes.description).slice(0, 500)}\n`;
    }
  });

  if (meetings.length > 0) {
    ctx += `\nSCHEDULED MEETINGS (${meetings.length}):\n`;
    meetings.forEach(m => { ctx += `- ${m.title} (${m.date}) [${m.status}]\n`; });
  }

  return ctx;
}

export default function MabisAIAssistant() {
  const [open, setOpen] = createSignal(false);
  const [expanded, setExpanded] = createSignal(false);
  const [messages, setMessages] = createSignal([]);
  const [input, setInput] = createSignal("");
  const [loading, setLoading] = createSignal(false);
  let endEl;

  createEffect(() => {
    messages();
    loading();
    endEl?.scrollIntoView({ behavior: "smooth" });
  });

  const handleSend = async (text) => {
    const trimmed = text.trim();
    if (!trimmed || loading()) return;

    // Captured BEFORE the append. React could read `messages` after calling the
    // setter and still get the pre-update array, because setState is deferred;
    // Solid's setter is synchronous, so reading afterwards would feed the user's
    // own message back as prior history and duplicate it against `prompt`.
    const priorHistory = messages().slice(-10);

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
      const value = (i) => (results[i].status === "fulfilled" ? results[i].value : []);
      const context = buildContext(value(0), value(1), value(2), value(3), value(4), value(5), value(6));

      const recentHistory = priorHistory
        .map(m => `${m.role === "user" ? "User" : "You"}: ${m.content}`)
        .join("\n");

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
        history: priorHistory,
        useSearch: true,
      });

      setMessages(prev => [...prev, { role: "assistant", content: typeof response === "string" ? response : String(response) }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "Sorry, something went wrong on my end. Give me a sec and try again?" }]);
    }
    setLoading(false);
  };

  const panelWidth = () => (expanded() ? 720 : 420);
  const panelHeight = () => (expanded() ? "82vh" : "620px");

  return (
    <>
      <button
        onClick={() => setOpen(!open())}
        class={`assistant-fab mobile-fab mobile-fab-right fixed bottom-6 right-6 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-primary-foreground border-2 border-primary-foreground ${open() ? "mobile-fab-open" : ""}`}
        style={{ background: "hsl(var(--primary))" }}
        title="MABIS Omni AI Assistant"
      >
        <Show when={open()} fallback={<Sparkles class="w-6 h-6" />}><X class="w-6 h-6" /></Show>
      </button>

      <Show when={open()}>
        <div
          class="assistant-pop mobile-assistant-panel fixed bottom-24 right-6 z-[60] rounded-2xl shadow-2xl border border-black/10 flex flex-col overflow-hidden"
          style={{
            width: `min(${panelWidth()}px, calc(100vw - 3rem))`,
            height: `min(${panelHeight()}, 78vh)`,
            background: "#F5F4EE",
            "padding-bottom": "env(safe-area-inset-bottom)",
          }}
        >
          {/* Header — quiet, claude-style: just a title and window controls */}
          <div class="px-4 h-12 flex items-center gap-2 shrink-0 border-b border-black/5">
            <img src={MABIS_LOGO} alt="MABIS" class="w-6 h-6 object-contain" />
            <p class="flex-1 text-[13px] font-medium text-[#3D3929]">MABIS Assistant</p>
            <button onClick={() => setExpanded(!expanded())} class="text-[#3D3929]/50 hover:text-[#3D3929] p-1" title={expanded() ? "Shrink" : "Expand"}>
              <Show when={expanded()} fallback={<Maximize2 class="w-4 h-4" />}><Minimize2 class="w-4 h-4" /></Show>
            </button>
            <button onClick={() => setOpen(false)} class="text-[#3D3929]/50 hover:text-[#3D3929] p-1">
              <X class="w-4 h-4" />
            </button>
          </div>

          {/* Conversation — single centred column, assistant replies unboxed */}
          <div class="flex-1 overflow-y-auto">
            <Show
              when={messages().length > 0}
              fallback={
                <div class="h-full flex flex-col justify-center px-6 max-w-[46rem] mx-auto w-full">
                  <div class="flex items-center gap-2.5 mb-6">
                    <Sparkles class="w-5 h-5" style={{ color: "hsl(var(--primary))" }} />
                    <h2 class="text-[26px] leading-none text-[#3D3929]" style={{ "font-family": "var(--font-heading)" }}>
                      How can I help?
                    </h2>
                  </div>
                  <div class="flex flex-col divide-y divide-black/5 border-y border-black/5">
                    <Index each={SUGGESTIONS}>
                      {(suggestion) => (
                        <button
                          onClick={() => handleSend(suggestion())}
                          class="text-left text-[13px] text-[#3D3929]/75 hover:text-[#3D3929] px-1 py-3 transition-colors"
                        >
                          {suggestion()}
                        </button>
                      )}
                    </Index>
                  </div>
                </div>
              }
            >
              <div class="max-w-[46rem] mx-auto w-full px-5 py-6 space-y-6">
                {/* Index, not For: the transcript is append-only, so keyed
                    reconciliation would be pure overhead. */}
                <Index each={messages()}>
                  {(msg) => (
                    <Show
                      when={msg().role === "user"}
                      fallback={
                        <div class="flex gap-3">
                          <div class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5" style={{ background: "hsl(var(--primary))" }}>
                            <Sparkles class="w-3 h-3 text-primary-foreground" />
                          </div>
                          <div class="flex-1 text-[14.5px] leading-[1.7] text-[#3D3929] whitespace-pre-wrap">
                            {msg().content}
                          </div>
                        </div>
                      }
                    >
                      <div class="flex justify-end">
                        <div class="max-w-[80%] rounded-xl bg-card border border-black/5 px-3.5 py-2.5 text-[14px] leading-relaxed text-[#3D3929] whitespace-pre-wrap">
                          {msg().content}
                        </div>
                      </div>
                    </Show>
                  )}
                </Index>

                <Show when={loading()}>
                  <div class="flex gap-3">
                    <div class="w-6 h-6 shrink-0 rounded-full flex items-center justify-center mt-0.5" style={{ background: "hsl(var(--primary))" }}>
                      <Sparkles class="w-3 h-3 text-primary-foreground" />
                    </div>
                    <div class="flex items-center gap-1 h-6">
                      <span class="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce" style={{ "animation-delay": "0ms" }} />
                      <span class="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce" style={{ "animation-delay": "150ms" }} />
                      <span class="w-1.5 h-1.5 bg-[#3D3929]/35 rounded-full animate-bounce" style={{ "animation-delay": "300ms" }} />
                    </div>
                  </div>
                </Show>
                <div ref={endEl} />
              </div>
            </Show>
          </div>

          {/* Composer — rounded card, send button tucked bottom-right */}
          <div class="shrink-0 px-4 pb-4 pt-1">
            <div class="max-w-[46rem] mx-auto w-full rounded-2xl bg-card border border-black/10 shadow-sm p-2.5 focus-within:border-black/20 transition-colors">
              <textarea
                value={input()}
                onInput={(e) => setInput(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(input()); }
                }}
                rows={2}
                placeholder="Reply to MABIS Assistant…"
                disabled={loading()}
                class="w-full resize-none bg-transparent px-1.5 text-[14px] leading-relaxed text-[#3D3929] placeholder:text-[#3D3929]/40 focus:outline-none disabled:opacity-50"
              />
              <div class="flex justify-end">
                <button
                  onClick={() => handleSend(input())}
                  disabled={loading() || !input().trim()}
                  class="w-8 h-8 rounded-lg flex items-center justify-center text-primary-foreground shrink-0 disabled:opacity-30 transition-opacity"
                  style={{ background: "hsl(var(--primary))" }}
                >
                  <Send class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </Show>
    </>
  );
}
