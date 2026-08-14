import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Maximize2, X, CheckCircle2, UserPlus, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { getISOWeek, getYear, nextFriday, isFriday, format, addWeeks } from "date-fns";
import { displayName } from "@/lib/names";
import { playWheelTick, playWheelStart, playWheelWin } from "@/lib/wheel_sound";

const JOBS = [
  { id: "water1", label: "Water Plants (1)" },
  { id: "water2", label: "Water Plants (2)" },
  { id: "whiteboard1", label: "Clean Whiteboards (1)" },
  { id: "whiteboard2", label: "Clean Whiteboards (2)" },
  { id: "lounge1", label: "Clean Lounge (1)" },
  { id: "lounge2", label: "Clean Lounge (2)" },
  { id: "everywhere1", label: "Clean Everywhere (1)" },
  { id: "everywhere2", label: "Clean Everywhere (2)" },
  { id: "ac1", label: "Check AC Temp (1)" },
  { id: "ac2", label: "Check AC Temp (2)" },
  { id: "time1", label: "Time Taker (1)" },
  { id: "time2", label: "Time Taker (2)" },
];

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const ADMIN_EMAIL = "summer@montessoribkk.com";

// Person 1 jobs "(1)" → Mon/Wed/Fri, Person 2 jobs "(2)" → Tue/Thu
function scheduledDaysFor(jobTitle) {
  if (jobTitle.includes("(1)")) return ["Monday", "Wednesday", "Friday"];
  if (jobTitle.includes("(2)")) return ["Tuesday", "Thursday"];
  return [];
}

const RESET_EPOCH_WEEK = 2026 * 100 + 1;
const RESET_CYCLE = 3;

function getWeekNumber(label) {
  const [year, week] = label.split("-W");
  return parseInt(year) * 100 + parseInt(week);
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

function formatWeekLabel(label) {
  try { return format(weekLabelToDate(label), "d MMMM yyyy"); }
  catch { const [year, week] = label.split("-W"); return `Week ${week}, ${year}`; }
}

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function getNextWeekLabel(label) {
  const next = addWeeks(weekLabelToDate(label), 1);
  return `${getYear(next)}-W${String(getISOWeek(next)).padStart(2, "0")}`;
}

// ─── Spin Wheel ────────────────────────────────────────────────────────────────
function SpinWheel({ members, onSpinComplete, disabled, size = 360 }) {
  const canvasRef = useRef(null);
  const rotationRef = useRef(0);
  const spinningRef = useRef(false);
  const rafRef = useRef(null);
  const appearanceRafRef = useRef(null);
  const appearanceRef = useRef({
    primary: "#951E3A",
    secondary: "#EACE54",
    ring: "#7a1830",
    font: "'GNUFreeMonoUI'",
  });
  const [isSpinning, setIsSpinning] = useState(false);

  const refreshAppearance = useCallback(() => {
    const styles = getComputedStyle(document.documentElement);
    const themeColor = (name, fallback) => {
      const value = styles.getPropertyValue(name).trim();
      return value ? `hsl(${value})` : fallback;
    };
    appearanceRef.current = {
      primary: themeColor("--primary", "#951E3A"),
      secondary: themeColor("--secondary", "#EACE54"),
      ring: themeColor("--ring", "#7a1830"),
      font: styles.getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'",
    };
  }, []);

  const drawWheel = useCallback((rotation) => {
    const canvas = canvasRef.current;
    if (!canvas || members.length === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const backingSize = Math.round(size * dpr);
    if (canvas.width !== backingSize || canvas.height !== backingSize) {
      canvas.width = backingSize;
      canvas.height = backingSize;
    }
    const parentWidth = canvas.parentElement?.clientWidth || size;
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth - 32 : size;
    const displaySize = Math.min(size, parentWidth, viewportWidth);
    const cssSize = `${displaySize}px`;
    if (canvas.style.width !== cssSize) canvas.style.width = cssSize;
    if (canvas.style.height !== cssSize) canvas.style.height = cssSize;
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = size / 2, cy = size / 2, r = size / 2 - 8;
    const arc = (2 * Math.PI) / members.length;
    ctx.clearRect(0, 0, size, size);

    const {
      primary: primaryColor,
      secondary: secondaryColor,
      ring: primaryDark,
      font: uiFont,
    } = appearanceRef.current;

    members.forEach((m, i) => {
      const s = rotation + i * arc;
      const e = rotation + (i + 1) * arc;
      const isRed = i % 2 === 0;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, s, e);
      ctx.closePath();
      ctx.fillStyle = isRed ? primaryColor : secondaryColor;
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(s + arc / 2);
      ctx.textAlign = "right";
      const fontSize = members.length > 20 ? 9 : members.length > 14 ? 11 : 13;
      ctx.font = `700 ${fontSize}px ${uiFont}`;
      ctx.shadowColor = "rgba(0,0,0,0.45)";
      ctx.shadowBlur = 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillText(displayName(m), r - 10, 4);
      ctx.shadowBlur = 0;
      ctx.restore();
    });

    // Outer rings
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, 2 * Math.PI);
    ctx.strokeStyle = primaryDark; ctx.lineWidth = 6; ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, r - 2, 0, 2 * Math.PI);
    ctx.strokeStyle = "rgba(255,255,255,0.25)"; ctx.lineWidth = 2; ctx.stroke();

    // Hub
    ctx.beginPath(); ctx.arc(cx, cy, 24, 0, 2 * Math.PI);
    ctx.fillStyle = "rgba(0,0,0,0.15)"; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = primaryDark; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 14, 0, 2 * Math.PI);
    ctx.fillStyle = secondaryColor; ctx.fill();
    ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
    ctx.fillStyle = "#fff"; ctx.fill();
  }, [members, size]);

  useEffect(() => {
    refreshAppearance();
    drawWheel(rotationRef.current);
    const redraw = () => drawWheel(rotationRef.current);
    const scheduleAppearanceRedraw = () => {
      if (appearanceRafRef.current) return;
      appearanceRafRef.current = requestAnimationFrame(() => {
        appearanceRafRef.current = null;
        refreshAppearance();
        redraw();
      });
    };
    window.addEventListener("themeChanged", scheduleAppearanceRedraw);
    window.addEventListener("fontChanged", scheduleAppearanceRedraw);
    window.addEventListener("resize", redraw, { passive: true });
    return () => {
      window.removeEventListener("themeChanged", scheduleAppearanceRedraw);
      window.removeEventListener("fontChanged", scheduleAppearanceRedraw);
      window.removeEventListener("resize", redraw);
      if (appearanceRafRef.current) cancelAnimationFrame(appearanceRafRef.current);
    };
  }, [drawWheel, refreshAppearance]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  // Pointer at top (12 o'clock = -π/2) — wheelofnames style
  const POINTER_ANGLE = -Math.PI / 2;

  const handleSpin = () => {
    if (spinningRef.current || members.length === 0 || disabled) return;
    spinningRef.current = true;
    setIsSpinning(true);
    playWheelStart();

    const fullRotations = 5 + Math.random() * 3;
    const totalRot = Math.PI * 2 * fullRotations;
    const duration = 5500 + Math.random() * 1500; // 5.5–7s
    const start = performance.now();
    const startRot = rotationRef.current;
    const arc = (2 * Math.PI) / members.length;

    // Quintic ease-out for ultra-smooth deceleration
    const easeOut = (t) => 1 - Math.pow(1 - t, 5);

    const segmentAt = (rot) => {
      let diff = (POINTER_ANGLE - rot) % (2 * Math.PI);
      while (diff < 0) diff += 2 * Math.PI;
      return Math.floor(diff / arc) % members.length;
    };

    // one wooden knock each time a segment edge passes the pointer
    let lastSeg = segmentAt(startRot);

    const animate = (now) => {
      const p = Math.min((now - start) / duration, 1);
      rotationRef.current = startRot + totalRot * easeOut(p);
      drawWheel(rotationRef.current);
      const seg = segmentAt(rotationRef.current);
      if (seg !== lastSeg) {
        lastSeg = seg;
        playWheelTick(p);
      }
      if (p < 1) {
        rafRef.current = requestAnimationFrame(animate);
      } else {
        spinningRef.current = false;
        setIsSpinning(false);
        playWheelWin();
        onSpinComplete(members[segmentAt(rotationRef.current)]);
      }
    };
    rafRef.current = requestAnimationFrame(animate);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative inline-block w-full max-w-full">
        {/* Pointer at top — wheelofnames style */}
        <div className="absolute -top-2 left-1/2 -translate-x-1/2 z-10 drop-shadow-lg"
          style={{ width: 0, height: 0, borderLeft: "14px solid transparent", borderRight: "14px solid transparent", borderTop: "28px solid hsl(var(--ring))" }} />
        <canvas
          ref={canvasRef}
          style={{ width: size, height: size, boxShadow: "0 8px 40px hsl(var(--primary) / 0.3), 0 2px 8px rgba(0,0,0,0.12)" }}
          className="cursor-pointer rounded-full"
          onClick={handleSpin}
        />
      </div>

      <Button onClick={handleSpin} disabled={isSpinning || members.length === 0 || disabled}
        className="bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-xl px-10 text-base font-bold w-full" size="lg">
        {isSpinning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Spinning...</> : "Spin"}
      </Button>
    </div>
  );
}

// ─── Winner Banner ──────────────────────────────────────────────────────────
function WinnerBanner({ winner, jobLabel, onConfirm, onRemoveAndNext, onReject, isAdmin }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="rounded-2xl p-8 text-center text-white shadow-2xl w-full max-w-md" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--ring)))" }}>
        <p className="text-sm font-semibold opacity-70 uppercase tracking-widest mb-1">Selected!</p>
        <p className="text-4xl font-display font-black mb-1">{displayName(winner)}</p>
        <p className="text-sm opacity-80 mb-5">→ <span className="font-semibold">{jobLabel}</span></p>
        {isAdmin ? (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={onConfirm}
              className="flex-1 bg-white text-[#951E3A] font-bold py-2.5 px-5 rounded-xl hover:bg-[#EACE54] transition-colors text-sm">
              Assign this job
            </button>
            <button onClick={onRemoveAndNext}
              className="flex-1 bg-white/20 hover:bg-white/30 text-white font-bold py-2.5 px-5 rounded-xl transition-colors text-sm border border-white/30">
              Remove from wheel
            </button>
            <button onClick={onReject}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white/80 font-bold py-2.5 px-5 rounded-xl transition-colors text-sm">
              Re-spin
            </button>
          </div>
        ) : (
          <p className="text-white/60 text-xs">Waiting for admin to confirm...</p>
        )}
      </div>
    </div>, document.body
  );
}

// ─── Per-Day cycle button: click → Yes → No → Cancel ─────────────────────────
function DayStatus({ assignment, canEdit, onDayStatus }) {
  const scheduled = scheduledDaysFor(assignment.job_title);
  const done = assignment.days_completed || [];
  const notDoneDays = assignment.not_done_days || [];
  return (
    <div className="flex gap-1.5 flex-wrap justify-center">
      {DAYS.filter(d => scheduled.includes(d)).map((day) => {
        const isYes = done.includes(day);
        const isNo = notDoneDays.includes(day);
        const state = isYes ? "yes" : isNo ? "no" : "neutral";
        return (
          <button key={day} type="button"
            title={`${day} — ${state === "yes" ? "Done" : state === "no" ? "Not done" : "Not marked"} (click to cycle)`}
            onClick={() => canEdit && onDayStatus(assignment, day, state)}
            disabled={!canEdit}
            className={`w-9 h-9 rounded-lg text-[11px] font-bold flex items-center justify-center border-2 transition-all
              ${state === "yes" ? "bg-green-500 border-green-500 text-white"
                : state === "no" ? "bg-red-500 border-red-500 text-white"
                : "border-gray-200 text-gray-400 bg-white hover:border-[#951E3A]/30"}
              ${canEdit ? "hover:scale-110 cursor-pointer" : "cursor-default opacity-60"}`}>
            {state === "yes" ? "✓" : state === "no" ? "✗" : day[0]}
          </button>
        );
      })}
    </div>
  );
}

// ─── Job Schedule Table ─────────────────────────────────────────────────────
function JobScheduleTable({ assignments, isAdmin, currentUser, onDayStatus, onDelete }) {
  if (assignments.length === 0) return (
    <p className="text-gray-400 text-sm text-center py-10">
      {isAdmin ? "No jobs assigned yet — spin the wheel!" : "No jobs assigned yet."}
    </p>
  );

  const canEdit = (a) => isAdmin || (currentUser?.email && a.assigned_to_email === currentUser.email);

  return (
    <div className="mobile-horizontal-scroll overflow-x-auto rounded-xl border border-gray-200">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Job</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase">Person</th>
            <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase">Completed</th>
            <th className="text-center px-2 py-2.5 text-xs font-semibold text-gray-500 uppercase">Next Week</th>
            {isAdmin && <th className="w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assignments.map((a) => {
            const scheduled = scheduledDaysFor(a.job_title);
            const done = a.days_completed || [];
            const notDoneDays = a.not_done_days || [];
            const allDone = scheduled.length > 0 && scheduled.every(d => done.includes(d));
            const hasNotDone = notDoneDays.length > 0;
            return (
              <tr key={a.id} className={`hover:bg-gray-50 group transition-colors ${allDone ? "bg-green-50/50" : ""} ${hasNotDone ? "bg-red-50/30" : ""}`}>
                <td className={`px-3 py-3 font-medium text-xs ${allDone ? "text-green-600" : "text-gray-700"}`}>
                  {a.job_title}
                  {a.carried_over && !hasNotDone && <p className="text-[9px] text-amber-600 mt-0.5">carried over</p>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-[#951E3A] flex items-center justify-center shrink-0">
                      <span className="text-white text-[9px] font-bold">{(a.assigned_to_name || "?")[0]}</span>
                    </div>
                    <span className="text-gray-700 text-xs">{a.assigned_to_name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <DayStatus assignment={a} canEdit={canEdit(a)} onDayStatus={onDayStatus} />
                  {allDone && <p className="text-[9px] text-green-600 font-bold mt-1">All done!</p>}
                </td>
                <td className="px-2 py-3 text-center">
                  {hasNotDone ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 border border-red-300 rounded-md px-2 py-1 text-[9px] font-bold text-red-600">
                      <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                      Next Week
                    </span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-2 py-3">
                    <button onClick={() => onDelete(a.id)}
                      className="text-gray-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Spinning For selector (enlarged) ────────────────────────────────────────
function SpinningForTable({ jobs, assignedJobLabels, selectedJobId, onSelect, isAdmin }) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-gray-50 border-b border-gray-200">
            <th className="text-left px-3 py-2 font-semibold text-gray-500 uppercase text-[11px]">Job</th>
            <th className="text-center px-2 py-2 font-semibold text-gray-500 uppercase text-[11px] w-20">Choose</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobs.map((job) => {
            const taken = assignedJobLabels.includes(job.label);
            const selected = selectedJobId === job.id;
            return (
              <tr key={job.id} className={taken ? "bg-gray-50" : ""}>
                <td className={`px-3 py-2.5 ${taken ? "text-gray-300 line-through" : "text-gray-700"}`}>
                  {job.label}
                </td>
                <td className="px-2 py-2 text-center">
                  <button type="button"
                    onClick={() => isAdmin && !taken && onSelect(job.id)}
                    disabled={taken || !isAdmin}
                    className={`w-full text-xs font-bold py-1.5 rounded-lg border-2 transition-all
                      ${taken ? "bg-gray-100 text-gray-300 border-gray-100"
                        : selected ? "bg-[#951E3A] text-white border-[#951E3A] scale-105 shadow"
                        : "bg-white text-gray-600 border-gray-200 hover:border-[#951E3A]/40 cursor-pointer hover:scale-102"}`}>
                    {taken ? "Done" : selected ? "Active" : "Choose"}
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Widget ────────────────────────────────────────────────────────────
export default function JobsWidget({ members, isAdmin, compact = false }) {
  const { user } = useAuth();
  const [selectedJobId, setSelectedJobId] = useState(JOBS[0].id);
  const [fullscreen, setFullscreen] = useState(false);
  const [winner, setWinner] = useState(null); // { member, jobLabel }
  const [removedIds, setRemovedIds] = useState([]); // excluded this session
  const [showStudentMgr, setShowStudentMgr] = useState(false);
  const [jobActionMessage, setJobActionMessage] = useState("");
  const queryClient = useQueryClient();
  const currentWeek = getCurrentWeekLabel();

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.JobAssignment.list("-created_date", 300),
  });

  const studentMembers = members.filter(m => !m.role || m.role === "student");
  const currentAssignments = assignments.filter(a => a.week_label === currentWeek);
  const assignedJobLabels = currentAssignments.map(a => a.job_title);
  const assignedMemberNames = currentAssignments.map(a => a.assigned_to_name);
  const selectedJob = JOBS.find(j => j.id === selectedJobId) || JOBS[0];

  // Members available on wheel: not yet assigned and not removed this session
  const wheelMembers = studentMembers
    .filter(m => !assignedMemberNames.includes(m.name) && !removedIds.includes(m.id))
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  const unassignedStudents = studentMembers.filter(m => !assignedMemberNames.includes(m.name));

  // Auto-reset the wheel when no one is left on it (but unassigned students remain)
  useEffect(() => {
    if (wheelMembers.length === 0 && unassignedStudents.length > 0 && removedIds.length > 0) {
      setRemovedIds([]);
    }
  }, [wheelMembers.length, unassignedStudents.length, removedIds.length]);

  const assignMutation = useMutation({
    mutationFn: (data) => base44.entities.JobAssignment.create(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      const updatedAssigned = [...assignedJobLabels, vars.job_title];
      const next = JOBS.find(j => !updatedAssigned.includes(j.label));
      if (next) setSelectedJobId(next.id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.JobAssignment.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.JobAssignment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const carryMutation = useMutation({
    mutationFn: (data) => base44.entities.JobAssignment.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  });

  const carryToNextWeek = (a) => {
    const nextWeek = getNextWeekLabel(currentWeek);
    const exists = assignments.some(x => x.week_label === nextWeek && x.job_title === a.job_title && x.assigned_to_name === a.assigned_to_name);
    if (exists) return;
    carryMutation.mutate({
      job_title: a.job_title, assigned_to_name: a.assigned_to_name,
      assigned_to_email: a.assigned_to_email || "", week_label: nextWeek,
      completed: false, carried_over: true,
    });
  };

  const handleDayStatus = (a, day, currentState) => {
    const done = a.days_completed || [];
    const notDoneDays = a.not_done_days || [];
    const scheduled = scheduledDaysFor(a.job_title);
    // Cycle: neutral → yes → no → neutral
    if (currentState === "neutral") {
      const newDone = [...done, day];
      const newNotDone = notDoneDays.filter(d => d !== day);
      const completed = scheduled.length > 0 && scheduled.every(d => newDone.includes(d));
      updateMutation.mutate({ id: a.id, data: { days_completed: newDone, not_done_days: newNotDone, completed, not_done: newNotDone.length > 0 } });
    } else if (currentState === "yes") {
      const newDone = done.filter(d => d !== day);
      const newNotDone = [...notDoneDays, day];
      updateMutation.mutate({ id: a.id, data: { days_completed: newDone, not_done_days: newNotDone, completed: false, not_done: true } });
      carryToNextWeek(a);
    } else if (currentState === "no") {
      const newNotDone = notDoneDays.filter(d => d !== day);
      updateMutation.mutate({ id: a.id, data: { not_done_days: newNotDone, not_done: newNotDone.length > 0 } });
    }
  };

  // Handle email action links (?job_action=done&job_id=xxx)
  const handledJobAction = useRef(false);
  useEffect(() => {
    if (handledJobAction.current) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("job_action");
    const jobId = params.get("job_id");
    if (!action || !jobId) return;
    const assignment = assignments.find(a => a.id === jobId);
    if (!assignment) return;
    handledJobAction.current = true;
    const scheduled = scheduledDaysFor(assignment.job_title);
    if (action === "done") {
      updateMutation.mutate({ id: jobId, data: { days_completed: scheduled, not_done_days: [], completed: true, not_done: false } });
      setJobActionMessage(`Marked "${assignment.job_title}" as done!`);
    } else if (action === "notdone") {
      updateMutation.mutate({ id: jobId, data: { days_completed: [], not_done_days: scheduled, completed: false, not_done: true } });
      carryToNextWeek(assignment);
      setJobActionMessage(`Marked "${assignment.job_title}" as not done — carried to next week.`);
    }
    window.history.replaceState({}, "", window.location.pathname);
    setTimeout(() => setJobActionMessage(""), 6000);
  }, [assignments]);

  const handleClearAll = async () => {
    if (!window.confirm("Clear all job assignments for this week?")) return;
    try {
      await base44.entities.JobAssignment.deleteMany({ week_label: currentWeek });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setRemovedIds([]);
    } catch (e) { /* ignore */ }
  };

  const handleSpinComplete = (member) => {
    setWinner({ member, jobLabel: selectedJob.label });
  };

  const handleConfirmAssign = () => {
    if (!winner) return;
    assignMutation.mutate({
      job_title: winner.jobLabel,
      assigned_to_name: winner.member.name,
      assigned_to_email: winner.member.email || "",
      week_label: currentWeek,
      completed: false,
    });
    setWinner(null);
  };

  const handleRemoveAndNext = () => {
    if (!winner) return;
    setRemovedIds(ids => [...ids, winner.member.id]);
    setWinner(null);
  };

  const handleReject = () => setWinner(null);

  const handleToggleDay = (a, day) => {
    const done = a.days_completed || [];
    const newDays = done.includes(day) ? done.filter(d => d !== day) : [...done, day];
    const scheduled = scheduledDaysFor(a.job_title);
    const completed = scheduled.length > 0 && scheduled.every(d => newDays.includes(d));
    updateMutation.mutate({ id: a.id, data: { days_completed: newDays, completed, not_done: false } });
  };

  const wheelAndTable = (isFS) => (
    <div className="space-y-6">
      {jobActionMessage && (
        <div className="rounded-xl p-4 text-center text-white font-semibold text-sm" style={{ background: jobActionMessage.includes("not done") ? "#ef4444" : "#22c55e" }}>
          {jobActionMessage}
        </div>
      )}
      {/* Winner banner — shows for everyone */}
      {winner && (
        <WinnerBanner
          winner={winner.member}
          jobLabel={winner.jobLabel}
          onConfirm={isAdmin ? handleConfirmAssign : undefined}
          onRemoveAndNext={isAdmin ? handleRemoveAndNext : undefined}
          onReject={isAdmin ? handleReject : undefined}
          isAdmin={isAdmin}
        />
      )}

      {/* Top row: Wheel (left, centred) + Spinning For (right) — admin only */}
      {isAdmin && (
        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
          {/* Wheel — centred, bigger */}
          <div className="flex flex-col items-center gap-4 flex-1 min-w-0 w-full">

            {/* Manage Students — admin only, popup over wheel */}
            <div className="w-full flex justify-center mb-2">
              <button onClick={() => setShowStudentMgr(s => !s)}
                className="flex items-center gap-1 text-xs text-[#951E3A] hover:bg-[#951E3A]/5 px-3 py-1.5 rounded-lg border border-[#951E3A]/30 font-semibold transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Manage Students
              </button>
            </div>
            {wheelMembers.length > 0 && (
              <p className="text-xs text-gray-400 font-medium text-center">
                {wheelMembers.length} student{wheelMembers.length !== 1 ? "s" : ""} on the wheel
              </p>
            )}
            {wheelMembers.length > 0 ? (
              <div className="relative w-full flex flex-col items-center gap-4">
                {showStudentMgr && (
                  <div className="w-full max-w-[420px] bg-white rounded-xl shadow-sm border border-gray-200 p-2.5 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{studentMembers.length} Students</p>
                      <button onClick={() => setShowStudentMgr(false)} className="text-gray-400 hover:text-gray-600">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[9px] text-gray-400 mb-1.5">✓ = on wheel</p>
                    <div className="flex gap-1 mb-1.5">
                      <button onClick={() => setRemovedIds([])} className="flex-1 text-[9px] font-bold text-white bg-[#951E3A] rounded py-1 hover:bg-[#7a1830] transition-colors">Add all</button>
                      <button onClick={() => setRemovedIds(studentMembers.map(m => m.id))} className="flex-1 text-[9px] font-bold text-[#951E3A] bg-[#951E3A]/10 rounded py-1 hover:bg-[#951E3A]/20 transition-colors">Clear all</button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {[...studentMembers].sort((a, b) => displayName(a).localeCompare(displayName(b))).map(m => {
                        const onWheel = !removedIds.includes(m.id);
                        return (
                          <label key={m.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border cursor-pointer transition-all select-none ${onWheel ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200 opacity-60"}`}>
                            <input type="checkbox" checked={onWheel} onChange={() => setRemovedIds(ids => ids.includes(m.id) ? ids.filter(i => i !== m.id) : [...ids, m.id])} className="w-3 h-3 rounded accent-[#951E3A] shrink-0" />
                            <span className={`text-[11px] font-medium ${onWheel ? "text-gray-800" : "text-gray-400 line-through"}`}>
                              {displayName(m)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
                <SpinWheel
                  members={wheelMembers}
                  onSpinComplete={handleSpinComplete}
                  disabled={!isAdmin || !!winner || assignedJobLabels.includes(selectedJob?.label)}
                  size={isFS ? 440 : 360}
                />
              </div>
            ) : studentMembers.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-gray-400 text-sm">No students yet</div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
                <p className="text-green-700 font-semibold text-sm">All students assigned!</p>
              </div>
            )}
          </div>

          {/* Spinning For — right side, admin only */}
          <div className="xl:w-72 shrink-0 w-full">
            <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-2">Spinning for:</p>
            <SpinningForTable
              jobs={JOBS}
              assignedJobLabels={assignedJobLabels}
              selectedJobId={selectedJobId}
              onSelect={setSelectedJobId}
              isAdmin={isAdmin}
            />
          </div>
        </div>
      )}

      {/* Bottom: Jobs table — shown for everyone, larger for non-admins */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Week of {formatWeekLabel(currentWeek)} — {currentAssignments.length}/{JOBS.length} assigned
        </p>
        <JobScheduleTable
          assignments={currentAssignments}
          isAdmin={isAdmin}
          currentUser={user}
          onDayStatus={handleDayStatus}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex flex-col">
        <div className="mabis-widget-header bg-[#951E3A] px-4 py-4 flex flex-col items-start gap-3 shrink-0 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mabis-widget-title font-display font-bold text-white text-2xl">Jobs Assignment</h2>
            <p className="text-white/60 text-sm">{formatWeekLabel(currentWeek)}</p>
          </div>
          <div className="mabis-widget-actions flex items-center gap-3">
            {isAdmin && currentAssignments.length > 0 && (
              <Button size="sm" variant="outline"
                className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
                onClick={handleClearAll}>
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </Button>
            )}
            <button onClick={() => setFullscreen(false)} className="text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10">
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
        <div className="mabis-widget-body flex-1 overflow-y-auto p-4 sm:p-8">{wheelAndTable(true)}</div>
      </div>
    );
  }

  if (compact) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Jobs this week — {currentAssignments.length}/{JOBS.length}</p>
          <button onClick={() => setFullscreen(true)} className="flex items-center gap-1 text-xs text-[#951E3A] hover:underline">
            <Maximize2 className="w-3 h-3" /> Full Screen
          </button>
        </div>
        <JobScheduleTable
          assignments={currentAssignments}
          isAdmin={isAdmin}
          currentUser={user}
          onDayStatus={handleDayStatus}
          onDelete={(id) => deleteMutation.mutate(id)}
        />
      </div>
    );
  }

  return (
    <div className="mabis-widget bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="mabis-widget-header bg-[#951E3A] px-4 py-4 flex flex-col items-start gap-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mabis-widget-title font-display font-bold text-white text-xl">Jobs</h2>
          <p className="text-white/60 text-xs mt-0.5">{formatWeekLabel(currentWeek)} — {currentAssignments.length}/{JOBS.length} assigned</p>
        </div>
        <div className="mabis-widget-actions flex items-center gap-2">
          {isAdmin && currentAssignments.length > 0 && (
            <Button size="sm" variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
              onClick={handleClearAll}>
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </Button>
          )}
          <Button size="sm" variant="outline"
            className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
            onClick={() => setFullscreen(true)}>
            <Maximize2 className="w-3.5 h-3.5" /> Full Screen
          </Button>
        </div>
      </div>
      <div className="mabis-widget-body p-4 sm:p-6">{wheelAndTable(false)}</div>
    </div>
  );
}