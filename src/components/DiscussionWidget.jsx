import React, { lazy, Suspense, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Maximize2, X, ChevronLeft, ChevronRight, History, Pause, Square, Loader2, UserCheck, RefreshCw, Pencil, UserPlus, MessagesSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getISOWeek, getYear, nextFriday, isFriday, subWeeks, addWeeks, format } from "date-fns";
import { Link, useLocation } from "react-router-dom";

import { displayName } from "@/lib/names";
import { motion } from "framer-motion";

const JobsWidget = lazy(() => import("@/components/JobsWidget"));
const MeetingNotesEditor = lazy(() => import("@/components/MeetingNotesEditor"));
const DocsEditor = lazy(() => import("@/components/DocsEditor"));
const AnnouncementsWidget = lazy(() => import("@/components/AnnouncementsWidget"));
const CalendarWidget = lazy(() => import("@/components/CalendarWidget"));
const MabisAIAssistant = lazy(() => import("@/components/MabisAIAssistant"));

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
}) {
  const priority = topic.priority || 3;

  if (isEditing) {
    return (
      <div className="flex items-start gap-2 rounded-xl border-2 border-[#951E3A]/35 bg-[#951E3A]/[0.025] p-3 shadow-sm sm:gap-3 sm:p-4">
        <div className={`w-1 self-stretch rounded-full shrink-0 ${PRIORITY_DOT[parseInt(editPriority) || 3]}`} />
        <div className="min-w-0 flex-1 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#951E3A]">Editing topic</p>
              <p className="mt-0.5 text-xs text-gray-400">Changes stay attached to this discussion card.</p>
            </div>
            <button
              type="button"
              onClick={onCancel}
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-500 hover:border-gray-300 hover:text-gray-800"
              title="Cancel editing"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Select value={editSubmittedBy} onValueChange={onSubmittedByChange}>
              <SelectTrigger className="rounded-lg border-gray-300 bg-white">
                <SelectValue placeholder="Name..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.name}>{member.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              autoFocus
              placeholder="Topic title..."
              value={editTitle}
              onChange={(event) => onTitleChange(event.target.value)}
              className="rounded-lg border-gray-300 bg-white"
            />
          </div>

          <Suspense fallback={<ChunkFallback height={compact ? 140 : 180} />}>
            <DocsEditor
              key={`inline-edit-${topic.id}`}
              title={editTitle || "Untitled topic"}
              placeholder="Write your topic description, paste screenshots, add context…"
              onChange={onDescriptionChange}
              minHeight={compact ? "140px" : "180px"}
              initialHtml={editDescription}
            />
          </Suspense>

          <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs font-medium text-gray-500">Priority:</span>
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => onPriorityChange(String(level))}
                  className={`rounded-full border-2 px-2.5 py-1 text-xs font-bold transition-all ${editPriority === String(level)
                    ? `${PRIORITY_COLORS[level]} scale-105 border-transparent shadow`
                    : "border-gray-200 bg-white text-gray-400 hover:border-gray-300"}`}
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
                disabled={!editTitle.trim() || !editSubmittedBy.trim() || isSaving}
                className="flex-1 rounded-lg bg-[#951E3A] text-white hover:bg-[#7a1830] sm:flex-none"
              >
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : "Save Changes"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-2 rounded-xl border p-3 transition-all sm:gap-3 sm:p-4
      ${topic.completed ? "bg-gray-50 border-gray-100 opacity-60" : "bg-white border-gray-200 hover:border-[#951E3A]/20"}`}>
      {/* Priority color bar */}
      <div className={`w-1 self-stretch rounded-full shrink-0 ${PRIORITY_DOT[priority]}`} />
      <input type="checkbox" checked={!!topic.completed} onChange={(e) => onToggle(topic.id, e.target.checked)}
        className="mt-1 w-4 h-4 rounded accent-[#951E3A] cursor-pointer shrink-0" />
      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => isAdmin && onEdit(topic)}>
        {/* Submitted by at top — bold and larger */}
        <p className="text-sm font-bold text-[#951E3A] mb-0.5">{topic.submitted_by}</p>
        {/* Title — clickable to edit */}
        <p className={`font-bold ${compact ? "text-xl" : "text-lg"} leading-snug ${topic.completed ? "line-through text-gray-400" : "text-gray-800"} ${isAdmin ? "hover:text-[#951E3A] cursor-pointer" : ""}`}>
          {topic.title}
        </p>
        {/* Description — clickable to edit */}
        {topic.description && (
          <div className={`mt-2 pt-2 border-t border-gray-100 text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none
            [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
            [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
            [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
            [&_li]:my-0.5
            [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1
            [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-1.5 [&_h2]:mb-1
            [&_p]:my-0.5
            [&_strong]:font-semibold [&_strong]:text-gray-800
            [&_em]:italic ${isAdmin ? "hover:bg-[#951E3A]/5 rounded-lg -mx-1 px-1 cursor-pointer" : ""}`}
            dangerouslySetInnerHTML={{ __html: topic.description }} />
        )}
      </div>
      {isAdmin && (
        <div className="flex flex-col gap-1.5 shrink-0 mt-0.5">
          <button onClick={(event) => { event.stopPropagation(); onEdit(topic); }} title="Edit topic"
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[#951E3A] text-white hover:bg-[#7a1830] transition-colors">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={(event) => { event.stopPropagation(); onDelete(topic.id); }} title="Delete topic"
            className="w-7 h-7 flex items-center justify-center rounded-md bg-[#951E3A] text-white hover:bg-[#7a1830] transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
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

  const allPeople = [...members.filter((m, i, arr) => arr.findIndex(x => x.name.toLowerCase() === m.name.toLowerCase()) === i), ...guests];
  const present = allPeople.filter(m => isPresent(m)).length;

  return (
    <div className="mabis-widget bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="flex flex-col gap-2 border-b border-gray-100 bg-gray-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex items-center gap-2">
          <UserCheck className="w-4 h-4 text-[#951E3A]" />
          <span className="font-semibold text-sm text-gray-800">Attendance</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500 font-medium">{present} / {allPeople.length} present</span>
          <button onClick={() => setShowAdd(s => !s)}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#951E3A] hover:bg-[#951E3A]/5 px-2 py-1 rounded-lg border border-[#951E3A]/30">
            <UserPlus className="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      <div className="p-4">
        {/* Add person form */}
        {showAdd && (
          <div className="flex flex-wrap items-center gap-2 mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <Input placeholder="Name..." value={newName} onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
              className="rounded-lg border-gray-200 bg-white h-9 w-full flex-1 min-w-0 text-sm sm:min-w-[140px]" />
            <Select value={newKind} onValueChange={setNewKind}>
              <SelectTrigger className="h-9 w-full rounded-lg bg-white text-sm sm:w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
            {newKind === "other" && (
              <Input placeholder="Type (e.g. Parent)..." value={newOtherType} onChange={(e) => setNewOtherType(e.target.value)}
                className="rounded-lg border-gray-200 bg-white h-9 w-full text-sm sm:w-32" />
            )}
            <Button onClick={handleAddPerson} disabled={!newName.trim()}
              className="bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-lg h-9 text-sm">Add</Button>
          </div>
        )}
        {/* Role badges at top */}
        <div className="flex flex-wrap gap-2 mb-4">
          {chair && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer select-none
              ${attendance[chair.id] === false ? "bg-red-50 border-red-200 text-red-600 line-through" : ""}`}
              style={attendance[chair.id] === false ? {} : { backgroundColor: "hsl(var(--role-chair) / 0.15)", borderColor: "hsl(var(--role-chair) / 0.35)", color: "hsl(var(--role-chair))" }}
              onClick={() => setAttendance(a => { const newAtt = { ...a, [chair.id]: a[chair.id] === false ? true : false }; upsertAttendance(newAtt); return newAtt; })}>
              Chair: {chair.name}
              {attendance[chair.id] === false && <span className="ml-1 text-[10px]">ABSENT</span>}
            </div>
          )}
          {minutes && (
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer select-none
              ${attendance[minutes.id] === false ? "bg-red-50 border-red-200 text-red-600 line-through" : ""}`}
              style={attendance[minutes.id] === false ? {} : { backgroundColor: "hsl(var(--role-minutes) / 0.15)", borderColor: "hsl(var(--role-minutes) / 0.35)", color: "hsl(var(--role-minutes))" }}
              onClick={() => setAttendance(a => { const newAtt = { ...a, [minutes.id]: a[minutes.id] === false ? true : false }; upsertAttendance(newAtt); return newAtt; })}>
              Minutes: {minutes.name}
              {attendance[minutes.id] === false && <span className="ml-1 text-[10px]">ABSENT</span>}
            </div>
          )}
        </div>

        {/* Replacement dropdowns if absent */}
        {(chairAbsent || minutesAbsent) && (
          <div className="mb-4 space-y-2 p-3 bg-orange-50 border border-orange-200 rounded-xl">
            <p className="text-xs font-semibold text-orange-700 flex items-center gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Replacements needed
            </p>

            {chairAbsent && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-orange-700 font-medium sm:w-28 sm:shrink-0">Replacement Chair:</span>
                <Select value={replacementChair} onValueChange={setReplacementChair}>
                  <SelectTrigger className="h-8 text-xs rounded-lg flex-1 bg-white border-orange-200">
                    <SelectValue placeholder="Pick someone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.filter(m => m.id !== chair?.id).map(m => (
                      <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {replacementChair && <span className="text-xs font-semibold text-green-700">{replacementChair}</span>}
              </div>
            )}
            {minutesAbsent && (
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span className="text-xs text-orange-700 font-medium sm:w-28 sm:shrink-0">Replacement Minutes:</span>
                <Select value={replacementMinutes} onValueChange={setReplacementMinutes}>
                  <SelectTrigger className="h-8 text-xs rounded-lg flex-1 bg-white border-orange-200">
                    <SelectValue placeholder="Pick someone..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.filter(m => m.id !== minutes?.id).map(m => (
                      <SelectItem key={m.id} value={m.name} className="text-xs">{m.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {replacementMinutes && <span className="text-xs font-semibold text-green-700">{replacementMinutes}</span>}
              </div>
            )}
          </div>
        )}

        {/* Teachers */}
        {allPeople.filter(m => m.role === "teacher").length > 0 && (
          <div className="mb-4">
            <p className="text-[10px] font-bold text-[#1e3a8a] uppercase tracking-wide mb-1.5">Teachers</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {[...allPeople.filter(m => m.role === "teacher")].sort((a, b) => { const aC = /claudia/i.test(a.name) ? 0 : 1; const bC = /claudia/i.test(b.name) ? 0 : 1; if (aC !== bC) return aC - bC; return displayName(a).localeCompare(displayName(b)); }).map(m => {
                const present_ = isPresent(m);
                return (
                  <label key={m.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all select-none
                    ${present_ ? "bg-blue-50 border-blue-200" : "bg-red-50 border-red-200 opacity-60"}`}>
                    <input type="checkbox" checked={present_} onChange={() => toggle(m)}
                      className="w-3.5 h-3.5 rounded accent-[#1e3a8a] shrink-0" />
                    <span className={`text-xs font-medium truncate ${present_ ? "text-gray-800" : "text-gray-400 line-through"}`}>
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
            <p className="text-[10px] font-bold text-[#951E3A] uppercase tracking-wide mb-1.5">Students</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {allPeople.filter(m => m.role !== "chair" && m.role !== "minutes" && m.role !== "teacher").sort((a, b) => displayName(a).localeCompare(displayName(b))).map(m => {
                const present_ = isPresent(m);
                return (
                  <label key={m.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all select-none
                    ${present_ ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200 opacity-60"}`}>
                    <input type="checkbox" checked={present_} onChange={() => toggle(m)}
                      className="w-3.5 h-3.5 rounded accent-[#951E3A] shrink-0" />
                    <span className={`text-xs font-medium truncate ${present_ ? "text-gray-800" : "text-gray-400 line-through"}`}>
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

  const { data: allTopics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 500),
  });

  const viewedTopics = allTopics
    .filter(t => t.week_label === viewedWeek && !t.archived && t.title !== "__meeting_notes__")
    .sort((a, b) => {
      // Incomplete (unticked) topics move over to the top; completed ones sink down.
      if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
      return (a.priority || 3) - (b.priority || 3);
    });

  const resetTopicForm = () => {
    setTitle(""); setDescription(""); setPriority("3");
    setSubmittedBy(""); setEditingTopicId(null); setShowForm(false);
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
  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.DiscussionTopic.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["topics"] }); resetTopicForm(); },
  });
  const updateTopicMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DiscussionTopic.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["topics"] }); resetTopicForm(); },
  });
  const handleEditTopic = (t) => {
    setShowForm(false);
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
    if (!title.trim() || !submittedBy.trim()) return;
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

  const inlineEditProps = (topic) => ({
    isEditing: editingTopicId === topic.id,
    editTitle: title,
    editDescription: description,
    editSubmittedBy: submittedBy,
    editPriority: priority,
    members,
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
        <div className="bg-[#951E3A] px-4 sm:px-6 py-4 flex flex-col items-start gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-white/60 text-xs uppercase tracking-widest mb-0.5">Meeting Mode</p>
            <h2 className="font-display font-bold text-white text-lg sm:text-2xl">{
              (() => {
                const md = localStorage.getItem("mabis_meeting_date");
                return md ? format(new Date(md), "EEEE, d MMMM yyyy") : formatWeekFull(viewedWeek);
              })()
            }</h2>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
            <button onClick={() => { actionRef.current = "pause"; setMeetingPaused(true); setMeetingMode(false); }}
              className="flex min-h-11 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-colors">
              <Pause className="w-3.5 h-3.5" /> Pause
            </button>
            <button onClick={() => { actionRef.current = "end"; setMeetingMode(false); setMeetingPaused(false); }}
              className="flex min-h-11 items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white border border-white/30 transition-colors">
              <Square className="w-3.5 h-3.5" /> End
            </button>
          </div>
        </div>

        {meetingPaused && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-2 flex items-center gap-2 shrink-0">
            <Pause className="w-4 h-4 text-yellow-600" />
            <span className="text-sm text-yellow-700 font-medium">Meeting paused</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="w-full max-w-7xl mx-auto px-3 py-5 space-y-6 sm:px-6 sm:py-6 sm:space-y-8">

            {/* Attendance + Role Change */}
            <section className="space-y-3">
              <AttendancePanel members={members} weekLabel={viewedWeek} />

              {/* Change Chair / Minutes */}
              <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => setShowRoleChange(r => !r)}
                  className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors">
                  <span className="flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-[#951E3A]" />
                    Change Chair / Minutes for this meeting
                  </span>
                  <span className="text-gray-400 text-xs">{showRoleChange ? "▲ Hide" : "▼ Show"}</span>
                </button>
                {showRoleChange && (
                  <div className="px-5 pb-4 space-y-3 border-t border-gray-100">
                    <div className="grid sm:grid-cols-2 gap-3 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Chair</p>
                        <Select
                          value={currentChair?.id || ""}
                          onValueChange={(id) => {
                            if (currentChair) updateMemberRoleMutation.mutate({ id: currentChair.id, role: "student" });
                            updateMemberRoleMutation.mutate({ id, role: "chair" });
                          }}>
                          <SelectTrigger className="rounded-lg text-sm bg-amber-50 border-amber-200">
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
                        <p className="text-xs font-semibold text-gray-500 mb-1.5">Minutes</p>
                        <Select
                          value={currentMinutes?.id || ""}
                          onValueChange={(id) => {
                            if (currentMinutes) updateMemberRoleMutation.mutate({ id: currentMinutes.id, role: "student" });
                            updateMemberRoleMutation.mutate({ id, role: "minutes" });
                          }}>
                          <SelectTrigger className="rounded-lg text-sm bg-blue-50 border-blue-200">
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
                <div className="w-1 h-6 bg-[#951E3A] rounded-full" />
                <h3 className="font-display font-bold text-gray-800 text-xl">Announcements</h3>
              </div>
              <Suspense fallback={<ChunkFallback height={260} />}>
                <AnnouncementsWidget members={members} isAdmin={isAdmin} />
              </Suspense>
            </section>

            {/* Topics */}
            <section>
              <div className="flex flex-wrap items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#951E3A] rounded-full" />
                <h3 className="font-display font-bold text-gray-800 text-xl">Discussion Topics</h3>
                <span className="text-sm text-gray-400">{viewedTopics.filter(t => t.completed).length}/{viewedTopics.length} done</span>
                <Button size="sm" variant="outline"
                  className="ml-auto border-[#951E3A]/40 text-[#951E3A] hover:bg-[#951E3A]/5 text-xs gap-1"
                  onClick={toggleAddTopicForm}>
                  <Plus className="w-3.5 h-3.5" /> Add Topic
                </Button>
              </div>

              {/* Inline add form in meeting mode */}
              {showForm && !editingTopicId && (
                <div className="border border-gray-200 rounded-2xl p-5 bg-gray-50 space-y-4 mb-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Select value={submittedBy} onValueChange={setSubmittedBy}>
                      <SelectTrigger className="rounded-lg border-gray-300 bg-white">
                        <SelectValue placeholder="Name..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="All">All</SelectItem>
                        {members.map((m) => (
                          <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="Topic title..." value={title} onChange={(e) => setTitle(e.target.value)}
                      className="rounded-lg border-gray-300 bg-white" />
                  </div>
                  <Suspense fallback={<ChunkFallback height={140} />}>
                    <DocsEditor key={editingTopicId || "new-mm"} title={title || "Untitled topic"} placeholder="Write your topic description, paste screenshots, add context…" onChange={setDescription} minHeight="140px" initialHtml={description} />
                  </Suspense>
                  <div className="flex items-center gap-2 flex-wrap pt-1">
                    <span className="text-xs text-gray-500 font-medium">Priority:</span>
                    {[1,2,3,4,5].map(p => (
                      <button key={p} onClick={() => setPriority(String(p))}
                        className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border-2 ${priority === String(p)
                          ? PRIORITY_COLORS[p] + " border-transparent scale-105 shadow"
                          : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                        {PRIORITY_LABELS[p]}
                      </button>
                    ))}
                    <Button onClick={handleAdd}
                      disabled={!title.trim() || !submittedBy.trim() || addMutation.isPending || updateTopicMutation.isPending}
                      className="ml-auto bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-lg text-sm">
                      {addMutation.isPending ? "Adding..." : "Add"}
                    </Button>
                  </div>
                </div>
              )}

              {viewedTopics.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-8 bg-white rounded-xl border border-gray-200">No topics this week</p>
              ) : (
                <div className="space-y-2">
                  {viewedTopics.map(topic => (
                    <TopicItem key={topic.id} topic={topic} compact isAdmin={topicAdmin}
                      onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
                      onDelete={(id) => deleteMutation.mutate(id)} onEdit={handleEditTopic}
                      {...inlineEditProps(topic)} />
                  ))}
                </div>
              )}
            </section>

            {/* Meeting Notes */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#951E3A] rounded-full" />
                <h3 className="font-display font-bold text-gray-800 text-xl">Meeting Notes</h3>
                <span className="text-xs text-gray-400">{formatWeekLabel(viewedWeek)}</span>
              </div>
              <Suspense fallback={<ChunkFallback height={260} />}>
                <MeetingNotesEditor weekLabel={viewedWeek} />
              </Suspense>
            </section>

            {/* Jobs */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#951E3A] rounded-full" />
                <h3 className="font-display font-bold text-gray-800 text-xl">Jobs Assignment</h3>
              </div>
              <Suspense fallback={<ChunkFallback height={420} />}>
                <JobsWidget members={members} isAdmin={isAdmin} />
              </Suspense>
            </section>

            {/* Calendar */}
            <section>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-6 bg-[#951E3A] rounded-full" />
                <h3 className="font-display font-bold text-gray-800 text-xl">Calendar</h3>
              </div>
              <Suspense fallback={<ChunkFallback height={420} />}>
                <CalendarWidget />
              </Suspense>
            </section>

            {/* End Meeting */}
            <div className="flex justify-center pt-4 pb-8">
              <button
                onClick={() => { actionRef.current = "end"; setMeetingMode(false); setMeetingPaused(false); }}
                className="flex items-center justify-center gap-3 bg-[#951E3A] hover:bg-[#7a1830] text-white font-bold text-xl sm:text-2xl px-6 py-5 sm:py-6 rounded-2xl shadow-lg transition-all hover:scale-105 w-full max-w-md">
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
    <div className={fullscreen ? "fixed inset-0 z-50 bg-white overflow-y-auto" : "mabis-widget bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"}>
      <div className="mabis-widget-header bg-[#951E3A] px-4 py-4 flex flex-col items-stretch gap-3 sticky top-0 z-10 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <MessagesSquare className="w-5 h-5 text-white" />
          <div>
            <h2 className="mabis-widget-title font-display font-bold text-white text-xl">Discussions</h2>
            <p className="text-white/60 text-xs mt-0.5">{formatWeekLabel(viewedWeek)}</p>
          </div>
        </div>
        <div className="mabis-widget-actions grid grid-cols-2 gap-2 sm:flex sm:items-center">
          <Link to="/history" className="min-w-0">
            <Button size="sm" variant="outline"
              className="w-full border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1 px-2 sm:w-auto sm:px-3">
              <History className="w-3.5 h-3.5" /> History
            </Button>
          </Link>
          {isCurrentWeek && (
            <Button size="sm" variant="outline"
              className="w-full border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1 px-2 sm:w-auto sm:px-3"
              onClick={toggleAddTopicForm}>
              <Plus className="w-3.5 h-3.5" /> Add Topic
            </Button>
          )}
          <Button size="sm" variant="outline"
            className="w-full border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1 px-2 sm:w-auto sm:px-3"
            onClick={() => setFullscreen(f => !f)}>
            {fullscreen ? <X className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            {fullscreen ? "Close" : "Fullscreen"}
          </Button>
        </div>
      </div>

      <div className="mabis-widget-body p-4 space-y-4 sm:p-5">
        {/* Add Topic Form */}
        {showForm && !editingTopicId && isCurrentWeek && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-4 sm:rounded-2xl sm:p-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Select value={submittedBy} onValueChange={setSubmittedBy}>
                <SelectTrigger className="rounded-lg border-gray-300 bg-white">
                  <SelectValue placeholder="Name..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  {members.map((m) => (
                    <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input placeholder="Topic title..." value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="rounded-lg border-gray-300 bg-white" />
            </div>
            <Suspense fallback={<ChunkFallback height={180} />}>
              <DocsEditor key={editingTopicId || "new"} title={title || "Untitled topic"} placeholder="Write your topic description, paste screenshots, add context…" onChange={setDescription} minHeight="180px" initialHtml={description} />
            </Suspense>
            <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs text-gray-500 font-medium">Priority:</span>
                {[1,2,3,4,5].map(p => (
                  <button key={p} onClick={() => setPriority(String(p))}
                    className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border-2 ${priority === String(p)
                      ? PRIORITY_COLORS[p] + " border-transparent scale-105 shadow"
                      : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"}`}>
                    {PRIORITY_LABELS[p]}
                  </button>
                ))}
              </div>
              <Button onClick={handleAdd}
                disabled={!title.trim() || !submittedBy.trim() || addMutation.isPending || updateTopicMutation.isPending}
                className="w-full bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-lg sm:ml-auto sm:w-auto">
                {addMutation.isPending ? "Adding..." : "Add Topic"}
              </Button>
            </div>
          </div>
        )}

        {/* Week navigation */}
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(w => w - 1)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 font-medium flex-1 text-center">
            {isCurrentWeek ? "This Week" : formatWeekLabel(viewedWeek)}
          </span>

          <button onClick={() => setWeekOffset(w => w + 1)} disabled={isCurrentWeek}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 disabled:opacity-30">
            <ChevronRight className="w-4 h-4" />
          </button>
          {!isCurrentWeek && (
            <button onClick={() => setWeekOffset(0)}
              className="text-xs text-[#951E3A] hover:underline px-2">Now</button>
          )}
        </div>

        <div className="space-y-2">
          {viewedTopics.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">No topics yet for this week</p>
          )}
          {viewedTopics.map(topic => (
            <TopicItem key={topic.id} topic={topic} compact={false} isAdmin={topicAdmin}
              onToggle={(id, completed) => toggleMutation.mutate({ id, completed })}
              onDelete={(id) => deleteMutation.mutate(id)} onEdit={handleEditTopic}
              {...inlineEditProps(topic)} />
          ))}
        </div>

        <div className="border-t border-gray-100 pt-4">
          <Suspense fallback={<ChunkFallback height={240} />}>
            <JobsWidget members={members} isAdmin={isAdmin} compact={true} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}