import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Maximize2, X, ChevronLeft, ChevronRight, History, Pause, Square, Loader2, UserCheck, RefreshCw, Pencil, UserPlus, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import JapaneseText from "@/components/JapaneseText";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getISOWeek, getYear, nextFriday, isFriday, subWeeks, addWeeks, format } from "date-fns";
import { Link, useLocation } from "react-router-dom";

import { displayName } from "@/lib/names";
import { dedupeByIdentity, membersWithRole } from "@/lib/memberIdentity";
import { motion } from "framer-motion";

const JobsWidget = lazy(() => import("@/components/JobsWidget"));
const MeetingNotesEditor = lazy(() => import("@/components/MeetingNotesEditor"));
const DocsEditor = lazy(() => import("@/components/DocsEditor"));
const AnnouncementsWidget = lazy(() => import("@/components/AnnouncementsWidget"));
const CalendarWidget = lazy(() => import("@/components/CalendarWidget"));
const MabisAIAssistant = lazy(() => import("@/components/MabisAIAssistant"));
const MeetingMinutes = lazy(() => import("@/components/MeetingMinutes"));

function ChunkFallback({ height = 160 }) {
  return <div className="widget-loading-shell" style={{ "--widget-fallback-height": `${height}px` }} aria-hidden />;
}


function getWeekLabel(date) {
  const friday = isFriday(date) ? date : nextFriday(date);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}
function formatWeekLabel(label) {
  try { return format(weekLabelToDate(label), "d MMMM yyyy"); }
  catch { const [year, week] = label.split("-W"); return `Week ${week}, ${year}`; }
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
function formatWeekFull(label) {
  try { return format(weekLabelToDate(label), "MMMM do, yyyy"); }
  catch { return formatWeekLabel(label); }
}

function getNextWeekLabelFrom(weekLabel) {
  const d = weekLabelToDate(weekLabel);
  d.setDate(d.getDate() + 7);
  return `${getYear(d)}-W${String(getISOWeek(d)).padStart(2, "0")}`;
}

// Priority reads as intensity of the active theme's own colour, never a fixed red.
const PRIORITY_COLORS = {
  1: "bg-primary text-primary-foreground",
  2: "bg-primary/80 text-primary-foreground",
  3: "bg-primary/60 text-primary-foreground",
  4: "bg-primary/35 text-foreground",
  5: "bg-primary/20 text-foreground",
};

const PRIORITY_LABELS = {
  1: "Urgent",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Minor",
};

const PRIORITY_DOT = {
  1: "bg-primary",
  2: "bg-primary/80",
  3: "bg-primary/60",
  4: "bg-primary/35",
  5: "bg-primary/20",
};

function TopicItem({
  topic,
  index,
  compact,
  isAdmin,
  onToggle,
  onDelete,
  onEdit,
  isEditing,
  editTitle,
  editDescription,
  editSubmittedBy,
  editPriority,
  members,
  onTitleChange,
  onDescriptionChange,
  onSubmittedByChange,
  onPriorityChange,
  onSave,
  onCancel,
  isSaving,
  error,
}) {
  const priority = topic.priority || 3;

  if (isEditing) {
    return (
      /* Editing lifts the entry off the agenda and onto a document page: a
         plain paper surface with real elevation, no accent tint competing with
         the toolbar, so the Docs-style editor inside is what reads. */
      <div className="rounded-lg border border-border bg-background p-3.5 shadow-lg sm:p-5">
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Editing topic</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Changes stay attached to this discussion card.</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-border hover:text-foreground"
              title="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={editSubmittedBy} onValueChange={onSubmittedByChange}>
              <SelectTrigger className="rounded-lg border-border bg-card">
                <SelectValue placeholder="Name..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* No autoFocus here, deliberately.

                The rich-text editor below is lazy-loaded, so it mounts a beat
                AFTER this input. autoFocus would put the caret here first, then
                Quill would initialise and take it — which is why typing landed
                in the document body instead of the title. Summer's version does
                not hit this because it imports the editor statically, so there
                is no late mount to lose the race to.

                Focus is taken on click instead, which is deterministic. */}
            <Input
              placeholder="Topic title..."
              value={editTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              className="rounded-lg border-border bg-card"
            />
          </div>

          <Suspense fallback={<ChunkFallback height={compact ? 140 : 180} />}>
            <DocsEditor
              key={`inline-edit-${topic.id}`}
              title={editTitle}
              onTitleChange={onTitleChange}
              placeholder="Write your topic description, paste screenshots, add context…"
              onChange={onDescriptionChange}
              minHeight={compact ? "140px" : "180px"}
              initialHtml={editDescription}
            />
          </Suspense>

          {error && (
            <p
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive"
            >
              {error}
            </p>
          )}

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-muted-foreground">Priority:</span>
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onPriorityChange(String(level))}
                  className={`rounded-full border-2 px-2.5 py-1 text-xs font-bold transition-all ${editPriority === String(level)
                    ? `${PRIORITY_COLORS[level]} scale-105 border-transparent shadow`
                    : "border-border bg-card text-muted-foreground hover:border-border"}`}
                >
                  {PRIORITY_LABELS[level]}
                </button>
              ))}
            </div>
            <div className="flex gap-2 sm:ml-auto">
              <Button type="button" variant="outline" onClick={onCancel} className="flex-1 rounded-lg sm:flex-none">
                Cancel
              </Button>
              <Button
                type="button"
                onClick={onSave}
                /* Only blocked while the request is in flight. An empty field
                   now explains itself on click instead of leaving a dead
                   button the user cannot diagnose. */
                disabled={isSaving}
                className="flex-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-none"
              >
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // At rest each topic is an entry card: one card per real object, crisp edges
  // and a small radius, with priority carried as a spine down the binding edge
  // rather than a coloured pill.
  return (
    <article className={`group relative flex items-start gap-3 overflow-hidden rounded-lg border bg-card p-3.5 pl-4 transition-colors sm:gap-4 sm:p-4 sm:pl-5
      ${topic.completed ? "border-border opacity-55" : "border-border hover:border-primary/30"}`}>
      <span aria-hidden className={`absolute inset-y-0 left-0 w-[3px] ${PRIORITY_DOT[priority]}`} />
      <input type="checkbox" checked={!!topic.completed} onChange={(e) => onToggle(topic.id, e.target.checked)}
        aria-label={topic.completed ? `Mark "${topic.title}" as not discussed` : `Mark "${topic.title}" as discussed`}
        className="mt-1.5 w-4 h-4 accent-primary cursor-pointer shrink-0" />
      <div className="flex-1 min-w-0">
        {/* Masthead line: index, who raised it, and how urgent — compact,
            widely tracked technical labels rather than coloured chips. */}
        <div className="mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
          {typeof index === "number" && (
            <span className="shrink-0 text-[10px] font-bold tabular-nums tracking-[0.18em] text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>
          )}
          <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{topic.submitted_by}</span>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{PRIORITY_LABELS[priority]}</span>
          {topic.completed && (
            <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Discussed</span>
          )}
        </div>
        <p
          onClick={() => isAdmin && onEdit(topic)}
          className={`font-display ${compact ? "text-lg" : "text-xl"} font-medium leading-[1.25] tracking-[-0.02em] ${topic.completed ? "line-through text-muted-foreground" : "text-foreground"} ${isAdmin ? "cursor-pointer hover:text-primary" : ""}`}
        >
          {topic.title}
        </p>
        {topic.description && (
          <div
            onClick={() => isAdmin && onEdit(topic)}
            className={`theme-rich-text mt-1.5 text-sm leading-[1.6] tracking-[0.02em] text-muted-foreground prose prose-sm max-w-[68ch]
            [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
            [&_li]:my-0.5
            [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1
            [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-1.5 [&_h2]:mb-1
            [&_p]:my-0.5
            [&_strong]:font-semibold [&_strong]:text-foreground
            [&_em]:italic ${isAdmin ? "cursor-pointer" : ""}`}
            dangerouslySetInnerHTML={{ __html: topic.description }} />
        )}
      </div>
      {isAdmin && (
        <div className="flex shrink-0 items-center gap-1">
          <button onClick={(event) => { event.stopPropagation(); onEdit(topic); }} title="Edit topic"
            aria-label={`Edit "${topic.title}"`}
            className="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          {/* Deleting is not the same weight of action as editing, so it does
              not get the same button. */}
          <button onClick={(event) => { event.stopPropagation(); onDelete(topic.id); }} title="Delete topic"
            aria-label={`Delete "${topic.title}"`}
            className="flex h-9 w-9 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </article>
  );
}

// Teachers default absent (depends on the day) — except Ms Claudia who is always present
function defaultPresent(m) {
  if (m.role === "teacher") return /claudia/i.test(m.name);
  return true;
}

// ── Attendance panel ──────────────────────────────────────────────────────────
function AttendancePanel({ members, weekLabel }) {
  const queryClient = useQueryClient();
  const [attendance, setAttendance] = useState({});
  const [guests, setGuests] = useState([]); // { id, name }
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("student"); // student | teacher | guest | other
  const [newOtherType, setNewOtherType] = useState("");
  const [attLoaded, setAttLoaded] = useState(false);

  const { data: attendanceRecords = [] } = useQuery({
    queryKey: ["attendance", weekLabel],
    queryFn: () => base44.entities.Attendance.filter({ week_label: weekLabel }),
    enabled: !!weekLabel,
  });

  useEffect(() => {
    if (attLoaded || members.length === 0) return;
    if (attendanceRecords.length > 0) {
      const rec = attendanceRecords[0];
      const a = {};
      members.forEach(m => { if (rec.present_names?.includes(m.name)) a[m.id] = true; });
      setAttendance(a);
    }
    setAttLoaded(true);
  }, [attendanceRecords, members, attLoaded]);

  const computePresentNames = (att) =>
    members.filter(m => (m.id in att ? att[m.id] : defaultPresent(m))).map(m => m.name);

  const upsertAttendance = (newAtt) => {
    if (!weekLabel) return;
    const presentNames = computePresentNames(newAtt);
    base44.entities.Attendance.filter({ week_label: weekLabel }).then(existing => {
      if (existing.length > 0) base44.entities.Attendance.update(existing[0].id, { present_names: presentNames });
      else base44.entities.Attendance.create({ week_label: weekLabel, present_names: presentNames });
      queryClient.invalidateQueries({ queryKey: ["attendance"] });
    }).catch(() => {});
  };

  const isPresent = (m) => (m.id in attendance ? attendance[m.id] : defaultPresent(m));
  const toggle = (m) => setAttendance(a => {
    const current = m.id in a ? a[m.id] : defaultPresent(m);
    const newAtt = { ...a, [m.id]: !current };
    upsertAttendance(newAtt);
    return newAtt;
  });

  const addMemberMutation = useMutation({
    mutationFn: (data) => base44.entities.Member.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const handleAddPerson = () => {
    if (!newName.trim()) return;
    if (newKind === "guest" || newKind === "other") {
      const label = newKind === "other" && newOtherType.trim() ? newOtherType.trim() : "Guest";
      setGuests(g => [...g, { id: `guest-${Date.now()}`, name: newName.trim(), role: "guest", custom_type: label }]);
      setNewOtherType("");
    } else {
      addMemberMutation.mutate({ name: newName.trim(), role: newKind });
    }
    setNewName(""); setShowAdd(false);
  };

  const chair   = members.find(m => m.role === "chair");
  const minutes = members.find(m => m.role === "minutes");
  const chairAbsent   = chair   && attendance[chair.id]   === false;
  const minutesAbsent = minutes && attendance[minutes.id] === false;

  const [replacementChair, setReplacementChair]     = useState("");
  const [replacementMinutes, setReplacementMinutes] = useState("");

  // Collapse duplicate rows for one person (email first, name only as a
  // fallback) keeping their highest-ranked role, so a stray student row can
  // never hide the real chair/minutes holder from the attendance list.
  const allPeople = [...dedupeByIdentity(members), ...guests];
  const present = allPeople.filter(m => isPresent(m)).length;

  return (
    <div className="mabis-widget bg-card rounded-2xl border border-border overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Attendance</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{present} / {allPeople.length} present</span>
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1 text-[11px] font-semibold text-primary hover:bg-primary/5 px-2 py-1 rounded-lg border border-primary/30">
            <UserPlus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Add person form */}
        {showAdd && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted border border-border rounded-xl">
            <Input placeholder="Name..." value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
              className="rounded-lg border-border bg-card h-9 w-full flex-1 min-w-0 text-sm sm:min-w-[140px]" />
            <Select value={newKind} onValueChange={setNewKind}>
              <SelectTrigger className="h-9 w-full rounded-lg bg-card text-sm sm:w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {newKind === "other" && (
              <Input placeholder="Type (e.g. Parent)..." value={newOtherType} onChange={(e) => setNewOtherType(e.target.value)}
                className="rounded-lg border-border bg-card h-9 w-full text-sm sm:w-32" />
            )}
            <Button onClick={handleAddPerson} disabled={!newName.trim()}
              className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 text-sm">Add</Button>
          </div>
        )}
        {/* Role badges at top */}
        {(chair || minutes) && (
          <p className="mb-2 text-xs leading-[1.6] tracking-[0.02em] text-muted-foreground">
            The Chair leads the meeting and Minutes writes down what everyone decides.
            Tap a name if that person is away today.
          </p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {chair && (
            <button
              type="button"
              aria-pressed={attendance[chair.id] === false}
              title={attendance[chair.id] === false
                ? `Mark ${chair.name} as here again`
                : `Mark ${chair.name} as away today`}
              className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors select-none
              ${attendance[chair.id] === false ? "bg-destructive/10 border-destructive/30 text-destructive line-through" : ""}`}
              style={attendance[chair.id] === false ? {} : { backgroundColor: "hsl(var(--role-chair) / 0.15)", borderColor: "hsl(var(--role-chair) / 0.35)", color: "hsl(var(--role-chair))" }}
              onClick={() => setAttendance(a => { const newAtt = { ...a, [chair.id]: a[chair.id] === false ? true : false }; upsertAttendance(newAtt); return newAtt; })}>
              Chair: {chair.name}
              {attendance[chair.id] === false && <span className="ml-1 text-[10px]">AWAY</span>}
            </button>
          )}
          {minutes && (
            <button
              type="button"
              aria-pressed={attendance[minutes.id] === false}
              title={attendance[minutes.id] === false
                ? `Mark ${minutes.name} as here again`
                : `Mark ${minutes.name} as away today`}
              className={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors select-none
              ${attendance[minutes.id] === false ? "bg-destructive/10 border-destructive/30 text-destructive line-through" : ""}`}
              style={attendance[minutes.id] === false ? {} : { backgroundColor: "hsl(var(--role-minutes) / 0.15)", borderColor: "hsl(var(--role-minutes) / 0.35)", color: "hsl(var(--role-minutes))" }}
              onClick={() => setAttendance(a => { const newAtt = { ...a, [minutes.id]: a[minutes.id] === false ? true : false }; upsertAttendance(newAtt); return newAtt; })}>
              Minutes: {minutes.name}
              {attendance[minutes.id] === false && <span className="ml-1 text-[10px]">AWAY</span>}
            </button>
          )}
        </div>

        {/* Replacement dropdowns if absent */}
        {(chairAbsent || minutesAbsent) && (
          <div className="mb-4 space-y-2 p-3 bg-secondary/10 border border-secondary/40 rounded-xl">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Someone needs to stand in
            </p>

            {chairAbsent && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-foreground font-medium sm:w-28 sm:shrink-0">Replacement Chair:</span>
                <Select value={replacementChair} onValueChange={setReplacementChair}>
                  <SelectTrigger className="h-8 text-xs rounded-lg flex-1 bg-card border-secondary/40">
                    <SelectValue placeholder="Pick someone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dedupeByIdentity(members).filter(m => m.id !== chair?.id).map(m => (
                      <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {replacementChair && <span className="text-xs font-semibold text-primary">{replacementChair}</span>}
              </div>
            )}
            {minutesAbsent && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-foreground font-medium sm:w-28 sm:shrink-0">Replacement Minutes:</span>
                <Select value={replacementMinutes} onValueChange={setReplacementMinutes}>
                  <SelectTrigger className="h-8 text-xs rounded-lg flex-1 bg-card border-secondary/40">
                    <SelectValue placeholder="Pick someone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {dedupeByIdentity(members).filter(m => m.id !== minutes?.id).map(m => (
                      <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {replacementMinutes && <span className="text-xs font-semibold text-primary">{replacementMinutes}</span>}
              </div>
            )}
          </div>
        )}

        {/* Teachers */}
        {allPeople.filter(m => m.role === "teacher").length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-role-teacher uppercase tracking-wide mb-1.5">Teachers</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {[...allPeople.filter(m => m.role === "teacher")].sort((a, b) => { const aC = /claudia/i.test(a.name) ? 0 : 1; const bC = /claudia/i.test(b.name) ? 0 : 1; if (aC !== bC) return aC - bC; return displayName(a).localeCompare(displayName(b)); }).map(m => {
                const present_ = isPresent(m);
                return (
                  <label key={m.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all select-none
                    ${present_ ? "bg-role-teacher/10 border-role-teacher/30" : "bg-destructive/10 border-destructive/30 opacity-60"}`}>
                    <input type="checkbox" checked={present_} onChange={() => toggle(m)}
                      className="w-3.5 h-3.5 rounded accent-role-teacher shrink-0" />
                    <span className={`text-xs font-medium truncate ${present_ ? "text-foreground" : "text-muted-foreground line-through"}`}>
                      {displayName(m)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {/* Students / Members */}
        {allPeople.filter(m => m.role !== "chair" && m.role !== "minutes" && m.role !== "teacher").length > 0 && (
          <div>
            <p className="text-[10px] font-bold text-primary uppercase tracking-wide mb-1.5">Students</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allPeople.filter(m => m.role !== "chair" && m.role !== "minutes" && m.role !== "teacher").sort((a, b) => displayName(a).localeCompare(displayName(b))).map(m => {
                const present_ = isPresent(m);
                return (
                  <label key={m.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all select-none
                    ${present_ ? "bg-role-student/10 border-role-student/30" : "bg-destructive/10 border-destructive/30 opacity-60"}`}>
                    <input type="checkbox" checked={present_} onChange={() => toggle(m)}
                      className="w-3.5 h-3.5 rounded accent-primary shrink-0" />
                    <span className={`text-xs font-medium truncate ${present_ ? "text-foreground" : "text-muted-foreground line-through"}`}>
                      {m.role === "guest" ? `${m.name} (${m.custom_type || "Guest"})` : displayName(m)}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function DiscussionWidget({ members, isAdmin, canEditTopics }) {
  const location = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submittedBy, setSubmittedBy] = useState("");
  const [priority, setPriority] = useState("3");
  const [showForm, setShowForm] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState(null);
  // A save that fails must say so. Previously both the validation guard and a
  // rejected request returned silently, so the form just sat there looking
  // unsaved with no explanation.
  const [saveError, setSaveError] = useState("");
  const [meetingMode, setMeetingMode] = useState(location.state?.startMeeting === true);
  const [meetingPaused, setMeetingPaused] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [showRoleChange, setShowRoleChange] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handler = () => { setMeetingPaused(false); setMeetingMode(true); };
    window.addEventListener("startMeetingMode", handler);
    return () => window.removeEventListener("startMeetingMode", handler);
  }, []);

  // Dispatch meeting status for MeetingModeWidget
  const wasInMeeting = useRef(false);
  const actionRef = useRef(null); // "pause" | "end"
  useEffect(() => {
    const currentWeek = getWeekLabel(new Date());
    if (meetingMode) {
      wasInMeeting.current = true;
      localStorage.removeItem(`mabis_meeting_ended_${currentWeek}`);
      window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: meetingPaused ? "paused" : "active" } }));
    } else if (wasInMeeting.current) {
      wasInMeeting.current = false;
      if (actionRef.current === "pause") {
        // Paused — don't archive, keep status as paused (meeting locked, returns to home)
        window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: "paused" } }));
      } else {
        // Ended — archive to history and lock start meeting
        localStorage.setItem(`mabis_meeting_ended_${currentWeek}`, "true");
        window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: "ended" } }));
        archiveWeekMutation.mutate({ weekLabel: currentWeek, archive: true });
      }
      actionRef.current = null;
    }
  }, [meetingMode, meetingPaused]);

  // Undo: un-archive current week topics when meeting undo is pressed
  useEffect(() => {
    const handler = () => {
      const currentWeek = getWeekLabel(new Date());
      archiveWeekMutation.mutate({ weekLabel: currentWeek, archive: false });
    };
    window.addEventListener("meetingUndo", handler);
    return () => window.removeEventListener("meetingUndo", handler);
  }, []);

  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.Member.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const currentChair   = members.find(m => m.role === "chair");
  const currentMinutes = members.find(m => m.role === "minutes");

  // Allow minutes person or admin to add topics/notes in meeting mode
  const canEdit = isAdmin;
  // All roles can edit/delete discussion topics in & out of meetings
  const topicAdmin = true;

  const baseDate = new Date();
  const offsetDate = weekOffset === 0 ? baseDate
    : weekOffset > 0 ? addWeeks(baseDate, weekOffset)
    : subWeeks(baseDate, Math.abs(weekOffset));
  const viewedWeek = getWeekLabel(offsetDate);
  const isCurrentWeek = weekOffset === 0;

  const { data: viewedWeekTopics = [] } = useQuery({
    queryKey: ["topics", viewedWeek],
    queryFn: () => base44.entities.DiscussionTopic.filter(
      { week_label: viewedWeek },
      "-created_date",
      100,
    ),
  });

  const viewedTopics = viewedWeekTopics
    .filter(t => !t.archived && t.title !== "__meeting_notes__")
    .sort((a, b) => {
      // Incomplete (unticked) topics move over to the top; completed ones sink down.
      if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
      return (a.priority || 3) - (b.priority || 3);
    });

  const resetTopicForm = () => {
    setTitle(""); setDescription(""); setPriority("3");
    setSubmittedBy(""); setEditingTopicId(null); setShowForm(false);
    setSaveError("");
  };
  const toggleAddTopicForm = () => {
    if (showForm && !editingTopicId) {
      resetTopicForm();
      return;
    }
    setEditingTopicId(null);
    setTitle("");
    setDescription("");
    setSubmittedBy("");
    setPriority("3");
    setShowForm(true);
  };
  const saveFailed = (error) => setSaveError(
    error?.message
      ? `Could not save: ${error.message}`
      : "Could not save. Check your connection and try again — your text is still here.",
  );
  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.DiscussionTopic.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["topics"] }); resetTopicForm(); },
    onError: saveFailed,
  });
  const updateTopicMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DiscussionTopic.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["topics"] }); resetTopicForm(); },
    onError: saveFailed,
  });
  // Editing uses the same single form as creating — Summer's model. One form
  // means one title field and one editor instance, so there is no second Quill
  // mounting late and stealing the caret.
  const handleEditTopic = (t) => {
    setShowForm(false);
    setSaveError("");
    setEditingTopicId(t.id);
    setTitle(t.title);
    setDescription(t.description || "");
    setSubmittedBy(t.submitted_by);
    setPriority(String(t.priority || 3));
  };
  const toggleMutation = useMutation({
    mutationFn: ({ id, completed }) => base44.entities.DiscussionTopic.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.DiscussionTopic.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  });

  const archiveWeekMutation = useMutation({
    mutationFn: async ({ weekLabel, archive }) => {
      const weekTopics = await base44.entities.DiscussionTopic.filter({ week_label: weekLabel });
      // Only completed topics leave the live view; uncompleted stay live but are
      // still shown in the history snapshot.
      await Promise.all(
        weekTopics
          .filter(t => t.title !== "__meeting_notes__" && t.title !== "__meeting_ended__" && (archive ? !!t.completed : t.archived))
          .map(t => base44.entities.DiscussionTopic.update(t.id, { archived: archive }))
      );
      // Always record that this week's meeting happened, so history exists even if
      // nothing was completed. On undo, remove the marker.
      const marker = weekTopics.find(t => t.title === "__meeting_ended__");
      if (archive && !marker) {
        await base44.entities.DiscussionTopic.create({
          title: "__meeting_ended__", submitted_by: "system",
          week_label: weekLabel, archived: true, completed: false,
        });
      } else if (!archive && marker) {
        await base44.entities.DiscussionTopic.delete(marker.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  });

  const handleAdd = () => {
    if (!title.trim() || !submittedBy.trim()) {
      setSaveError(!title.trim()
        ? "Give the topic a title before saving."
        : "Choose who submitted this topic before saving.");
      return;
    }
    setSaveError("");
    if (editingTopicId) {
      updateTopicMutation.mutate({
        id: editingTopicId,
        data: { title: title.trim(), description: description || "", submitted_by: submittedBy.trim(), priority: parseInt(priority) },
      });
    } else {
      addMutation.mutate({
        title: title.trim(), description: description || "",
        submitted_by: submittedBy.trim(), completed: false,
        week_label: viewedWeek, archived: false, priority: parseInt(priority),
      });
    }
  };

  // One entry per person: two rows sharing a name would otherwise render two
  // <SelectItem> options with an identical value, which Radix cannot resolve.
  const topicSubmitters = dedupeByIdentity(members);

  // Title focus guard.
  //
  // The title field takes focus fine, then loses it a few seconds later. This
  // page re-renders on a 1s clock, a 20s presence heartbeat and a 15s presence
  // refetch, and the rich-text editor ends up holding the caret afterwards.
  //
  // So while you are working in the title, if focus lands in the editor without
  // you having clicked anything, take it back. Any real mousedown outside the
  // field releases the guard, so clicking into the editor, a button or another
  // input behaves normally. This only fights the silent theft.
  // Editing happens inside the topic card. The caret used to be pulled out of
  // the title on every keystroke because ReactQuill restores its saved
  // selection on re-render; the editor is memoised in DocsEditor now, so this
  // stays a plain inline form.
  const inlineEditProps = (topic) => ({
    isEditing: editingTopicId === topic.id,
    editTitle: title,
    editDescription: description,
    editSubmittedBy: submittedBy,
    editPriority: priority,
    members: topicSubmitters,
    error: saveError,
    onTitleChange: setTitle,
    onDescriptionChange: setDescription,
    onSubmittedByChange: setSubmittedBy,
    onPriorityChange: setPriority,
    onSave: handleAdd,
    onCancel: resetTopicForm,
    isSaving: updateTopicMutation.isPending,
  });




  // ── MEETING MODE ──────────────────────────────────────────────────────────
  if (meetingMode) {
    return createPortal(
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="fixed inset-0 bg-background text-foreground z-[80] flex flex-col overflow-x-hidden">
        <div className="bg-primary px-4 sm:px-6 py-4 flex flex-col items-start gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <JapaneseText as="p" ja="ミーティング進行中" className="text-primary-foreground-muted text-xs uppercase tracking-widest mb-0.5" japaneseClassName="block normal-case tracking-normal text-[0.85em]">Meeting Mode</JapaneseText>
            <h2 className="font-display font-bold text-primary-foreground text-lg sm:text-2xl">{
              (() => {
                const md = localStorage.getItem("mabis_meeting_date");
                const d = md ? new Date(md) : weekLabelToDate(viewedWeek);
                const en = md ? format(d, "EEEE, d MMMM yyyy") : formatWeekFull(viewedWeek);
                const ja = new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(d);
                return <JapaneseText ja={ja} japaneseClassName="block mt-0.5 text-[0.55em] font-normal opacity-80">{en}</JapaneseText>;
              })()
            }</h2>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <button onClick={() => { actionRef.current = "pause"; setMeetingPaused(true); setMeetingMode(false); }}
              title="Stop for now and come back to it later. Nothing is moved to History."
              className="flex min-h-11 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30 transition-colors">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
            <button onClick={() => { actionRef.current = "end"; setMeetingMode(false); setMeetingPaused(false); }}
              title="Finish the meeting for everyone. Topics that are ticked off move into History."
              className="flex min-h-11 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border border-primary-foreground/30 transition-colors">
              <Square className="w-3.5 h-3.5" /> End meeting
            </button>
          </div>
        </div>

        {meetingPaused && (
          <div className="bg-secondary/10 border-b border-secondary/40 px-6 py-2 flex items-center gap-2 shrink-0">
            <Pause className="w-4 h-4 text-secondary" />
            <span className="text-sm text-foreground font-medium">Meeting paused</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto px-3 py-5 space-y-6 sm:px-6 sm:py-6 sm:space-y-8">

            {/* Attendance + Role Change */}
            <section className="space-y-3">
              <AttendancePanel members={members} weekLabel={viewedWeek} />

              {/* Change Chair / Minutes */}
              <div className="bg-card rounded-2xl border border-border overflow-hidden">
                <button
                  onClick={() => setShowRoleChange(r => !r)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-foreground hover:bg-muted transition-colors">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-primary" />
                    Change Chair / Minutes for this meeting
                  </span>
                  <span className="text-muted-foreground text-xs">{showRoleChange ? "▲ Hide" : "▼ Show"}</span>
                </button>
                {showRoleChange && (
                  <div className="px-5 pb-4 space-y-3 border-t border-border">
                    <div className="grid sm:grid-cols-2 gap-3 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Chair</p>
                        <Select
                          value={currentChair?.id || ""}
                          onValueChange={(id) => {
                            // Demote every current holder, not just the first
                            // match — duplicate rows used to survive here and
                            // leave two people holding the same role.
                            membersWithRole(members, "chair").forEach((holder) => {
                              if (holder.id !== id) updateMemberRoleMutation.mutate({ id: holder.id, role: "student" });
                            });
                            updateMemberRoleMutation.mutate({ id, role: "chair" });
                          }}>
                          <SelectTrigger className="rounded-lg text-sm bg-role-chair/10 border-role-chair/30">
                            <SelectValue placeholder="Pick chair..." />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground mb-1.5">Minutes</p>
                        <Select
                          value={currentMinutes?.id || ""}
                          onValueChange={(id) => {
                            membersWithRole(members, "minutes").forEach((holder) => {
                              if (holder.id !== id) updateMemberRoleMutation.mutate({ id: holder.id, role: "student" });
                            });
                            updateMemberRoleMutation.mutate({ id, role: "minutes" });
                          }}>
                          <SelectTrigger className="rounded-lg text-sm bg-role-minutes/10 border-role-minutes/30">
                            <SelectValue placeholder="Pick minutes..." />
                          </SelectTrigger>
                          <SelectContent>
                            {members.map(m => (
                              <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* Announcements */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h3 className="font-display font-bold text-foreground text-xl">Announcements</h3>
              </div>
              <Suspense fallback={<ChunkFallback height={260} />}>
                <AnnouncementsWidget members={members} isAdmin={isAdmin} />
              </Suspense>
            </section>

            {/* Minutes — the same per-week document the Discussion section
                shows. Meeting mode previously had a topic list here AND a
                separate "Meeting Notes" editor below; both are now this one
                document, because the old notes editor wrote to the very same
                __meeting_notes__ record and two editors on one record fight
                each other. */}
            <section>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h3 className="font-display font-bold text-foreground text-xl">Minutes</h3>
                <span className="text-sm text-muted-foreground">{formatWeekLabel(viewedWeek)}</span>
              </div>
              <Suspense fallback={<ChunkFallback height={420} />}>
                <MeetingMinutes
                  weekLabel={viewedWeek}
                  weekTitle={`Minutes — ${formatWeekFull(viewedWeek)}`}
                  canEdit={isCurrentWeek}
                />
              </Suspense>
            </section>

            {/* Jobs */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h3 className="font-display font-bold text-foreground text-xl">Jobs Assignment</h3>
              </div>
              <Suspense fallback={<ChunkFallback height={420} />}>
                <JobsWidget members={members} isAdmin={isAdmin} />
              </Suspense>
            </section>

            {/* Calendar */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-primary rounded-full" />
                <h3 className="font-display font-bold text-foreground text-xl">Calendar</h3>
              </div>
              <Suspense fallback={<ChunkFallback height={420} />}>
                <CalendarWidget />
              </Suspense>
            </section>

            {/* End Meeting */}
            <div className="flex justify-center pt-4 pb-8">
              <button
                onClick={() => { actionRef.current = "end"; setMeetingMode(false); setMeetingPaused(false); }}
                className="flex items-center justify-center gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-xl sm:text-2xl px-6 py-5 sm:py-6 rounded-2xl shadow-lg transition-all hover:scale-105 w-full max-w-md">
                <Square className="w-7 h-7" /> End Meeting
              </button>
            </div>

          </div>
        </div>
        <Suspense fallback={null}><MabisAIAssistant /></Suspense>
      </motion.div>,
      document.body
    );
  }

  // ── NORMAL MODE ────────────────────────────────────────────────────────────
  return (
    <div className={fullscreen ? "fixed inset-0 z-50 bg-card overflow-y-auto" : "mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden"}>
      <div className="mabis-widget-header bg-primary px-4 py-4 flex flex-col items-stretch gap-3 sticky top-0 z-10 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MessagesSquare className="w-5 h-5 text-primary-foreground" />
          <div>
            <h2 className="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Discussions</h2>
            <JapaneseText
              as="p"
              ja={new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(weekLabelToDate(viewedWeek)) + "の週"}
              className="text-primary-foreground-muted text-xs mt-0.5"
              japaneseClassName="block mt-0.5 text-[0.9em]"
            >
              {formatWeekLabel(viewedWeek)}
            </JapaneseText>
          </div>
        </div>
        <div className="mabis-widget-actions grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Link to="/history" className="min-w-0">
            <Button size="sm" variant="outline"
              className="w-full border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs gap-1 px-2 sm:w-auto sm:px-3">
              <History className="w-3.5 h-3.5" /> History
            </Button>
          </Link>
          <Button size="sm" variant="outline"
            className="w-full border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs gap-1 px-2 sm:w-auto sm:px-3"
            onClick={() => setFullscreen(f => !f)}>
            {fullscreen ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {fullscreen ? "Close" : "Fullscreen"}
          </Button>
        </div>
      </div>

      <div className="mabis-widget-body p-4 space-y-4 sm:p-5">
        {/* Add Topic Form */}
        {showForm && !editingTopicId && isCurrentWeek && (
          <div className="border border-border rounded-xl p-4 bg-card space-y-4 shadow-lg sm:rounded-2xl sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
                  {editingTopicId ? "Editing topic" : "New topic"}
                </p>
                <p className="mt-0.5 text-xs leading-[1.6] tracking-[0.02em] text-muted-foreground">
                  {editingTopicId
                    ? "Change the title, who raised it, or the details, then press Update topic."
                    : "Give it a title, pick your name, then press Add topic."}
                </p>
              </div>
              <button
                type="button"
                onClick={resetTopicForm}
                title="Close without saving"
                aria-label="Close without saving"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:border-primary hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={submittedBy} onValueChange={setSubmittedBy}>
                <SelectTrigger className="rounded-lg border-border bg-card">
                  <SelectValue placeholder="Name..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {topicSubmitters.map((m) => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Topic title..." value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border-border bg-card" />
            </div>
            <Suspense fallback={<ChunkFallback height={180} />}>
              <DocsEditor key={editingTopicId || "new"} title={title} onTitleChange={setTitle} placeholder="Write your topic description, paste screenshots, add context…" onChange={setDescription} minHeight="180px" initialHtml={description} />
            </Suspense>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-muted-foreground font-medium">Priority:</span>
                {[1,2,3,4,5].map(p => (
                  <button key={p} onClick={() => setPriority(String(p))}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border-2 ${priority === String(p)
                      ? PRIORITY_COLORS[p] + " border-transparent scale-105 shadow"
                      : "bg-card text-muted-foreground border-border hover:border-border"}`}>
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 sm:ml-auto">
                <Button variant="outline" onClick={resetTopicForm}
                  className="flex-1 rounded-lg sm:flex-none">
                  Cancel
                </Button>
                <Button onClick={handleAdd}
                  /* Only blocked while saving. An empty field explains itself
                     on click rather than leaving a dead button. */
                  disabled={addMutation.isPending || updateTopicMutation.isPending}
                  className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg sm:flex-none">
                  {addMutation.isPending || updateTopicMutation.isPending
                    ? "Saving..."
                    : editingTopicId ? "Update topic" : "Add topic"}
                </Button>
              </div>
            </div>
            {saveError && (
              <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
                {saveError}
              </p>
            )}
          </div>
        )}

        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)}
            title="Show the week before this one" aria-label="Show the week before this one"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground font-medium flex-1 text-center">
            {isCurrentWeek ? "This Week" : formatWeekLabel(viewedWeek)}
          </span>

          <button onClick={() => setWeekOffset(w => w + 1)} disabled={isCurrentWeek}
            title="Show the week after this one" aria-label="Show the week after this one"
            className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)}
              className="text-xs text-primary hover:underline px-2">Back to this week</button>
          )}
        </div>

        {/* Looking at an older week is read only. Say so, rather than letting
            the controls quietly disappear with no explanation. */}
        {!isCurrentWeek && (
          <p className="text-xs leading-[1.6] tracking-[0.02em] text-muted-foreground">
            You are looking at an earlier week. Its minutes are shown as they were written and are not saved while you scroll through them.
          </p>
        )}

        {/* The week's minutes. This replaced the topic list: any topics that
            already existed for the week are formatted into the document the
            first time it is opened, and the topic records themselves are left
            untouched in the database (History still reads them). */}
        <Suspense fallback={<ChunkFallback height={420} />}>
          <MeetingMinutes
            weekLabel={viewedWeek}
            weekTitle={`Minutes — ${formatWeekFull(viewedWeek)}`}
            canEdit={isCurrentWeek}
          />
        </Suspense>

        <div className="border-t border-border pt-4">
          <Suspense fallback={<ChunkFallback height={240} />}>
            <JobsWidget members={members} isAdmin={isAdmin} compact={true} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}