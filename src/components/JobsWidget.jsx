import React, { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, Maximize2, X, CheckCircle2, UserPlus, AlertCircle, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/AuthContext";
import { displayName } from "@/lib/names";
import {
  WEEKDAYS,
  assignmentIsCurrent,
  formatMonthLabel,
  formatWeekLabel,
  getCurrentWeekLabel,
  getMonthLabel,
  getNextMonthLabel,
  getNextWeekLabel,
  getScheduledDatesForMonth,
  getVisibleWeekDates,
  isTimeKeeperJob,
  jobPeriod,
  memberRotationKey,
  normalizeJobTitle,
  scheduledDaysFor,
  timeKeeperKeysForYear,
} from "@/lib/jobsRotation";
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
  { id: "time1", label: "Time Keeper (1)", period: "monthly" },
  { id: "time2", label: "Time Keeper (2)", period: "monthly" },
].map((job) => ({ ...job, period: job.period || "weekly" }));

const SCHEDULE_PRESETS = {
  every_weekday: [...WEEKDAYS],
  mon_wed_fri: ["Monday", "Wednesday", "Friday"],
  tue_thu: ["Tuesday", "Thursday"],
};

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
        className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-10 text-base font-bold w-full" size="lg">
        {isSpinning ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />Spinning...</> : "Spin"}
      </Button>
    </div>
  );
}

// ─── Winner Banner ──────────────────────────────────────────────────────────
function WinnerBanner({ winner, jobLabel, onConfirm, onRemoveAndNext, onReject, isAdmin, canAssign = true }) {
  return createPortal(
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="rounded-2xl p-8 text-center text-primary-foreground shadow-2xl w-full max-w-md" style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--ring)))" }}>
        <p className="text-sm font-semibold opacity-70 uppercase tracking-widest mb-1">Selected!</p>
        <p className="text-4xl font-display font-black mb-1">{displayName(winner)}</p>
        <p className="text-sm opacity-80 mb-5">→ <span className="font-semibold">{jobLabel}</span></p>
        {isAdmin ? (
          <div className="flex flex-col sm:flex-row gap-2 justify-center">
            <button onClick={onConfirm} disabled={!canAssign}
              className="flex-1 bg-card text-primary font-bold py-2.5 px-5 rounded-xl hover:bg-[#EACE54] transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-55">
              {canAssign ? "Assign this job" : "Extra spin only"}
            </button>
            <button onClick={onRemoveAndNext}
              className="flex-1 bg-card/20 hover:bg-card/30 text-primary-foreground font-bold py-2.5 px-5 rounded-xl transition-colors text-sm border border-primary-foreground/30">
              Remove from wheel
            </button>
            <button onClick={onReject}
              className="flex-1 bg-card/10 hover:bg-card/20 text-primary-foreground/80 font-bold py-2.5 px-5 rounded-xl transition-colors text-sm">
              Re-spin
            </button>
          </div>
        ) : (
          <p className="text-primary-foreground/60 text-xs">Waiting for admin to confirm...</p>
        )}
        {isAdmin && !canAssign && <p className="mt-3 text-xs text-primary-foreground/70">This person or job is already assigned. Re-spin as often as you like.</p>}
      </div>
    </div>, document.body
  );
}

// ─── Per-Day cycle button: click → Yes → No → Cancel ─────────────────────────
function DayStatus({ assignment, canEdit, onDayStatus, currentMonth }) {
  const scheduled = scheduledDaysFor(assignment);
  const monthly = jobPeriod(assignment) === "monthly";
  const entries = monthly
    ? getVisibleWeekDates(currentMonth).filter((entry) => scheduled.includes(entry.day))
    : WEEKDAYS.filter((day) => scheduled.includes(day)).map((day) => ({ day, key: day, shortLabel: day }));
  const done = assignment.days_completed || [];
  const notDoneDays = assignment.not_done_days || [];

  return (
    <div className="flex gap-1.5 flex-wrap justify-center">
      {entries.map((entry) => {
        const isYes = done.includes(entry.key);
        const isNo = notDoneDays.includes(entry.key);
        const state = isYes ? "yes" : isNo ? "no" : "neutral";
        const compactLabel = monthly ? `${entry.day[0]}${entry.key.slice(-2)}` : entry.day[0];
        return (
          <button key={entry.key} type="button"
            title={`${entry.shortLabel} — ${state === "yes" ? "Done" : state === "no" ? "Not done" : "Not marked"} (click to cycle)`}
            onClick={() => canEdit && onDayStatus(assignment, entry.key, state)}
            disabled={!canEdit}
            className={`min-w-9 h-9 px-1 rounded-lg text-[10px] font-bold flex items-center justify-center border-2 transition-all
              ${state === "yes" ? "bg-green-500 border-green-500 text-primary-foreground"
                : state === "no" ? "bg-red-500 border-red-500 text-primary-foreground"
                : "border-border text-muted-foreground bg-card hover:border-primary/30"}
              ${canEdit ? "hover:scale-110 cursor-pointer" : "cursor-default opacity-60"}`}>
            {state === "yes" ? "✓" : state === "no" ? "✗" : compactLabel}
          </button>
        );
      })}
    </div>
  );
}

// ─── Job Schedule Table ─────────────────────────────────────────────────────
function JobScheduleTable({ assignments, isAdmin, currentUser, onDayStatus, onDelete, currentMonth }) {
  if (assignments.length === 0) return (
    <p className="text-muted-foreground text-sm text-center py-10">
      {isAdmin ? "No jobs assigned yet — spin the wheel!" : "No jobs assigned yet."}
    </p>
  );

  const canEdit = (a) => isAdmin || (currentUser?.email && a.assigned_to_email === currentUser.email);

  return (
    <div className="mobile-horizontal-scroll overflow-x-auto rounded-xl border border-border">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Job</th>
            <th className="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Person</th>
            <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase">This Week</th>
            <th className="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Carry</th>
            {isAdmin && <th className="w-8" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {assignments.map((a) => {
            const monthly = jobPeriod(a) === "monthly";
            const scheduled = monthly
              ? getScheduledDatesForMonth(a, a.month_label || currentMonth)
              : scheduledDaysFor(a);
            const done = a.days_completed || [];
            const notDoneDays = a.not_done_days || [];
            const allDone = scheduled.length > 0 && scheduled.every((day) => done.includes(day));
            const hasNotDone = notDoneDays.length > 0;
            return (
              <tr key={a.id} className={`hover:bg-muted group transition-colors ${allDone ? "bg-green-50/50" : ""} ${hasNotDone ? "bg-red-50/30" : ""}`}>
                <td className={`px-3 py-3 font-medium text-xs ${allDone ? "text-green-600" : "text-foreground"}`}>
                  {normalizeJobTitle(a.job_title)}
                  <p className="text-[9px] text-muted-foreground mt-0.5">{monthly ? `Monthly · ${formatMonthLabel(a.month_label || currentMonth)}` : "Weekly"}</p>
                  {a.carried_over && !hasNotDone && <p className="text-[9px] text-amber-600 mt-0.5">carried over</p>}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <span className="text-primary-foreground text-[9px] font-bold">{(a.assigned_to_name || "?")[0]}</span>
                    </div>
                    <span className="text-foreground text-xs">{a.assigned_to_name}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-center">
                  <DayStatus assignment={a} canEdit={canEdit(a)} onDayStatus={onDayStatus} currentMonth={currentMonth} />
                  {allDone && <p className="text-[9px] text-green-600 font-bold mt-1">All done!</p>}
                </td>
                <td className="px-2 py-3 text-center">
                  {hasNotDone ? (
                    <span className="inline-flex items-center gap-1 bg-red-100 border border-red-300 rounded-md px-2 py-1 text-[9px] font-bold text-red-600">
                      <AlertCircle className="w-2.5 h-2.5 shrink-0" />
                      {monthly ? "Next Month" : "Next Week"}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </td>
                {isAdmin && (
                  <td className="px-2 py-3">
                    <button onClick={() => onDelete(a.id)}
                      className="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
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
    <div className="border border-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-muted border-b border-border">
            <th className="text-left px-3 py-2 font-semibold text-muted-foreground uppercase text-[11px]">Job</th>
            <th className="text-center px-2 py-2 font-semibold text-muted-foreground uppercase text-[11px] w-20">Choose</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {jobs.map((job) => {
            const taken = assignedJobLabels.includes(job.label);
            const selected = selectedJobId === job.id;
            return (
              <tr key={job.id} className={taken ? "bg-muted" : ""}>
                <td className={`px-3 py-2.5 ${taken ? "text-muted-foreground line-through" : "text-foreground"}`}>
                  {job.label}
                  <span className="ml-2 text-[9px] uppercase tracking-wide text-muted-foreground">{job.period || "weekly"}</span>
                </td>
                <td className="px-2 py-2 text-center">
                  <button type="button"
                    onClick={() => isAdmin && !taken && onSelect(job.id)}
                    disabled={taken || !isAdmin}
                    className={`w-full text-xs font-bold py-1.5 rounded-lg border-2 transition-all
                      ${taken ? "bg-muted text-muted-foreground border-border"
                        : selected ? "bg-primary text-primary-foreground border-primary scale-105 shadow"
                        : "bg-card text-muted-foreground border-border hover:border-primary/40 cursor-pointer hover:scale-102"}`}>
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
  const [winner, setWinner] = useState(null);
  const [removedIds, setRemovedIds] = useState([]);
  const [showStudentMgr, setShowStudentMgr] = useState(false);
  const [showAddJob, setShowAddJob] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", period: "weekly", schedule: "every_weekday" });
  const [addJobError, setAddJobError] = useState("");
  const [jobActionMessage, setJobActionMessage] = useState("");
  const queryClient = useQueryClient();
  const currentWeek = getCurrentWeekLabel();
  const currentMonth = getMonthLabel();
  const currentYear = currentMonth.slice(0, 4);

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.JobAssignment.list("-created_date", 500),
  });

  const { data: jobDefinitions = [] } = useQuery({
    queryKey: ["job-definitions"],
    queryFn: () => base44.entities.JobDefinition.list("title", 100),
  });

  const migratedLegacyTimeKeepersRef = useRef(false);
  useEffect(() => {
    if (migratedLegacyTimeKeepersRef.current || assignments.length === 0) return;
    const legacyCurrent = assignments.filter((assignment) => (
      isTimeKeeperJob(assignment.job_title)
      && !assignment.month_label
      && assignment.week_label === currentWeek
    ));
    migratedLegacyTimeKeepersRef.current = true;
    if (legacyCurrent.length === 0) return;

    Promise.all(legacyCurrent.map((assignment) => base44.entities.JobAssignment.update(assignment.id, {
      job_title: normalizeJobTitle(assignment.job_title),
      assignment_period: "monthly",
      month_label: currentMonth,
      schedule_days: scheduledDaysFor(assignment),
    }))).then(() => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    }).catch(() => {
      migratedLegacyTimeKeepersRef.current = false;
    });
  }, [assignments, currentMonth, currentWeek, queryClient]);

  const customJobs = jobDefinitions
    .filter((job) => job.active !== false)
    .map((job) => ({
      id: `custom-${job.id}`,
      definitionId: job.id,
      label: normalizeJobTitle(job.title),
      period: job.period || "weekly",
      schedule_days: job.schedule_days,
    }));
  const allJobs = [...JOBS, ...customJobs];
  const studentMembers = members.filter((member) => !member.role || member.role === "student");
  const currentAssignments = assignments.filter((assignment) => assignmentIsCurrent(assignment, currentWeek, currentMonth));
  const assignedJobLabels = currentAssignments.map((assignment) => normalizeJobTitle(assignment.job_title));
  const assignedMemberKeys = new Set(currentAssignments.map((assignment) => memberRotationKey({
    email: assignment.assigned_to_email,
    name: assignment.assigned_to_name,
  })));
  const selectedJob = allJobs.find((job) => job.id === selectedJobId) || allJobs[0] || JOBS[0];
  const servedTimeKeeperKeys = timeKeeperKeysForYear(assignments, currentYear);
  const selectingTimeKeeper = isTimeKeeperJob(selectedJob?.label);

  const assignmentEligibleStudents = studentMembers.filter((member) => (
    !assignedMemberKeys.has(memberRotationKey(member))
    && (!selectingTimeKeeper || !servedTimeKeeperKeys.has(memberRotationKey(member)))
  ));
  const repeatSpinMode = !selectingTimeKeeper && assignmentEligibleStudents.length === 0 && studentMembers.length > 0;
  const spinCandidates = repeatSpinMode ? studentMembers : assignmentEligibleStudents;
  const wheelMembers = spinCandidates
    .filter((member) => !removedIds.includes(member.id))
    .sort((a, b) => displayName(a).localeCompare(displayName(b)));
  const unassignedStudents = spinCandidates;
  const winnerCanBeAssigned = !!winner
    && !assignedMemberKeys.has(memberRotationKey(winner.member))
    && !assignedJobLabels.includes(normalizeJobTitle(winner.jobLabel))
    && (!isTimeKeeperJob(winner.jobLabel) || !servedTimeKeeperKeys.has(memberRotationKey(winner.member)));

  useEffect(() => {
    if (wheelMembers.length === 0 && unassignedStudents.length > 0 && removedIds.length > 0) {
      setRemovedIds([]);
    }
  }, [wheelMembers.length, unassignedStudents.length, removedIds.length]);

  const addJobMutation = useMutation({
    mutationFn: (data) => base44.entities.JobDefinition.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["job-definitions"] });
      if (created?.id) setSelectedJobId(`custom-${created.id}`);
      setNewJob({ title: "", period: "weekly", schedule: "every_weekday" });
      setAddJobError("");
      setShowAddJob(false);
    },
  });

  const handleAddJob = () => {
    const title = normalizeJobTitle(newJob.title.trim());
    if (!title) {
      setAddJobError("Enter a job name.");
      return;
    }
    if (allJobs.some((job) => job.label.toLocaleLowerCase() === title.toLocaleLowerCase())) {
      setAddJobError("That job already exists.");
      return;
    }
    addJobMutation.mutate({
      title,
      period: newJob.period,
      schedule_days: SCHEDULE_PRESETS[newJob.schedule] || SCHEDULE_PRESETS.every_weekday,
      active: true,
    });
  };

  const assignMutation = useMutation({
    mutationFn: (data) => base44.entities.JobAssignment.create(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      const updatedAssigned = [...assignedJobLabels, normalizeJobTitle(vars.job_title)];
      const next = allJobs.find((job) => !updatedAssigned.includes(job.label));
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

  const statusKeysFor = (assignment) => (
    jobPeriod(assignment) === "monthly"
      ? getScheduledDatesForMonth(assignment, assignment.month_label || currentMonth)
      : scheduledDaysFor(assignment)
  );

  // Carry-overs already in flight, keyed by job + person + period.
  //
  // The `exists` check below reads the React Query cache, which only refreshes
  // after the create round-trips and the query refetches. Clicking again inside
  // that window sees stale data, finds nothing, and writes another row — which
  // is how one job ended up with five identical assignments 3 seconds apart.
  // This ref updates synchronously, so repeat clicks are rejected immediately.
  const carryInFlight = useRef(new Set());

  const carryToNextPeriod = (assignment) => {
    const period = jobPeriod(assignment);
    const nextWeek = period === "weekly" ? getNextWeekLabel(assignment.week_label || currentWeek) : null;
    const nextMonth = period === "monthly" ? getNextMonthLabel(assignment.month_label || currentMonth) : null;
    const exists = assignments.some((candidate) => (
      normalizeJobTitle(candidate.job_title) === normalizeJobTitle(assignment.job_title)
      && candidate.assigned_to_name === assignment.assigned_to_name
      && (period === "monthly" ? candidate.month_label === nextMonth : candidate.week_label === nextWeek)
    ));
    const inFlightKey = [
      normalizeJobTitle(assignment.job_title),
      assignment.assigned_to_name,
      period === "monthly" ? nextMonth : nextWeek,
    ].join("|");
    if (exists || carryInFlight.current.has(inFlightKey)) return;
    carryInFlight.current.add(inFlightKey);

    carryMutation.mutate({
      job_title: normalizeJobTitle(assignment.job_title),
      assigned_to_name: assignment.assigned_to_name,
      assigned_to_email: assignment.assigned_to_email || "",
      assignment_period: period,
      schedule_days: scheduledDaysFor(assignment),
      ...(period === "monthly" ? { month_label: nextMonth } : { week_label: nextWeek }),
      completed: false,
      carried_over: true,
    }, {
      onSettled: () => carryInFlight.current.delete(inFlightKey),
    });
  };

  const handleDayStatus = (assignment, day, currentState) => {
    const done = assignment.days_completed || [];
    const notDoneDays = assignment.not_done_days || [];
    const scheduled = statusKeysFor(assignment);

    if (currentState === "neutral") {
      const newDone = [...new Set([...done, day])];
      const newNotDone = notDoneDays.filter((entry) => entry !== day);
      const completed = scheduled.length > 0 && scheduled.every((entry) => newDone.includes(entry));
      updateMutation.mutate({ id: assignment.id, data: { days_completed: newDone, not_done_days: newNotDone, completed, not_done: newNotDone.length > 0 } });
    } else if (currentState === "yes") {
      const newDone = done.filter((entry) => entry !== day);
      const newNotDone = [...new Set([...notDoneDays, day])];
      updateMutation.mutate({ id: assignment.id, data: { days_completed: newDone, not_done_days: newNotDone, completed: false, not_done: true } });
      carryToNextPeriod(assignment);
    } else {
      const newNotDone = notDoneDays.filter((entry) => entry !== day);
      updateMutation.mutate({ id: assignment.id, data: { not_done_days: newNotDone, not_done: newNotDone.length > 0 } });
    }
  };

  const handledJobAction = useRef(false);
  useEffect(() => {
    if (handledJobAction.current) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("job_action");
    const jobId = params.get("job_id");
    if (!action || !jobId) return;
    const assignment = assignments.find((candidate) => candidate.id === jobId);
    if (!assignment) return;

    handledJobAction.current = true;
    const period = jobPeriod(assignment);
    const allScheduled = statusKeysFor(assignment);
    const actionKeys = period === "monthly"
      ? getVisibleWeekDates(assignment.month_label || currentMonth)
        .filter((entry) => scheduledDaysFor(assignment).includes(entry.day))
        .map((entry) => entry.key)
      : scheduledDaysFor(assignment);
    const done = assignment.days_completed || [];
    const notDone = assignment.not_done_days || [];

    if (action === "done") {
      const nextDone = [...new Set([...done, ...actionKeys])];
      const nextNotDone = notDone.filter((entry) => !actionKeys.includes(entry));
      updateMutation.mutate({ id: jobId, data: {
        days_completed: nextDone,
        not_done_days: nextNotDone,
        completed: allScheduled.every((entry) => nextDone.includes(entry)),
        not_done: nextNotDone.length > 0,
      } });
      setJobActionMessage(`Marked "${normalizeJobTitle(assignment.job_title)}" as done.`);
    } else if (action === "notdone") {
      const nextDone = done.filter((entry) => !actionKeys.includes(entry));
      const nextNotDone = [...new Set([...notDone, ...actionKeys])];
      updateMutation.mutate({ id: jobId, data: { days_completed: nextDone, not_done_days: nextNotDone, completed: false, not_done: true } });
      carryToNextPeriod(assignment);
      setJobActionMessage(`Marked "${normalizeJobTitle(assignment.job_title)}" as not done — carried to the next ${period === "monthly" ? "month" : "week"}.`);
    }

    window.history.replaceState({}, "", window.location.pathname);
    window.setTimeout(() => setJobActionMessage(""), 6000);
  }, [assignments]);

  const handleClearAll = async () => {
    if (!window.confirm("Clear all current weekly and monthly job assignments?")) return;
    try {
      await Promise.all(currentAssignments.map((assignment) => base44.entities.JobAssignment.delete(assignment.id)));
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setRemovedIds([]);
    } catch {
      setJobActionMessage("Could not clear the current assignments.");
    }
  };

  const handleSpinComplete = (member) => {
    setWinner({ member, job: selectedJob, jobLabel: selectedJob.label });
  };

  const handleConfirmAssign = () => {
    // Clearing the winner below guards most double-clicks, but state updates are
    // async: two clicks in the same tick both still see the old winner. The
    // pending flag closes that gap.
    if (!winner || !winnerCanBeAssigned || assignMutation.isPending) return;
    const job = winner.job || selectedJob;
    const period = job.period || "weekly";
    assignMutation.mutate({
      job_title: winner.jobLabel,
      assigned_to_name: winner.member.name,
      assigned_to_email: winner.member.email || "",
      assignment_period: period,
      schedule_days: scheduledDaysFor(job),
      ...(period === "monthly" ? { month_label: currentMonth } : { week_label: currentWeek }),
      completed: false,
    });
    setWinner(null);
  };

  const handleRemoveAndNext = () => {
    if (!winner) return;
    setRemovedIds((ids) => [...ids, winner.member.id]);
    setWinner(null);
  };

  const handleReject = () => setWinner(null);

  const wheelAndTable = (isFS) => (
    <div className="space-y-6">
      {jobActionMessage && (
        <div className={`rounded-xl p-4 text-center font-semibold text-sm ${jobActionMessage.includes("not done") || jobActionMessage.includes("Could not") ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>
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
          canAssign={winnerCanBeAssigned}
        />
      )}

      {isAdmin && (
        <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3" aria-label="How to assign a job">
          {["1. Choose a job", "2. Spin the wheel", "3. Confirm or re-spin"].map((step) => (
            <div key={step} className="bg-card px-3 py-2.5 text-center text-xs font-semibold text-card-foreground">{step}</div>
          ))}
        </div>
      )}

      {/* Top row: Wheel (left, centred) + Spinning For (right) — admin only */}
      {isAdmin && (
        <div className="flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
          {/* Wheel — centred, bigger */}
          <div className="flex flex-col items-center gap-4 flex-1 min-w-0 w-full">

            {/* Manage Students — admin only, popup over wheel */}
            <div className="w-full flex justify-center mb-2">
              <button onClick={() => setShowStudentMgr(s => !s)}
                className="flex items-center gap-1 text-xs text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/30 font-semibold transition-colors">
                <UserPlus className="w-3.5 h-3.5" /> Manage Students
              </button>
            </div>
            {wheelMembers.length > 0 && (
              <p className="text-xs text-muted-foreground font-medium text-center">
                {wheelMembers.length} student{wheelMembers.length !== 1 ? "s" : ""} on the wheel
                {repeatSpinMode ? " · extra spins are unlimited" : ""}
              </p>
            )}
            {wheelMembers.length > 0 ? (
              <div className="relative w-full flex flex-col items-center gap-4">
                {showStudentMgr && (
                  <div className="w-full max-w-[420px] bg-card rounded-xl shadow-sm border border-border p-2.5 max-h-64 overflow-y-auto">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">{studentMembers.length} Students</p>
                      <button onClick={() => setShowStudentMgr(false)} className="text-muted-foreground hover:text-muted-foreground">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <p className="text-[9px] text-muted-foreground mb-1.5">✓ = on wheel</p>
                    <div className="flex gap-1 mb-1.5">
                      <button onClick={() => setRemovedIds([])} className="flex-1 text-[9px] font-bold text-primary-foreground bg-primary rounded py-1 hover:bg-primary/90 transition-colors">Add all</button>
                      <button onClick={() => setRemovedIds(studentMembers.map(m => m.id))} className="flex-1 text-[9px] font-bold text-primary bg-primary/10 rounded py-1 hover:bg-primary/20 transition-colors">Clear all</button>
                    </div>
                    <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
                      {[...studentMembers].sort((a, b) => displayName(a).localeCompare(displayName(b))).map((member) => {
                        const hardEligible = spinCandidates.some((candidate) => candidate.id === member.id);
                        const onWheel = hardEligible && !removedIds.includes(member.id);
                        return (
                          <label key={member.id} className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border transition-all select-none ${onWheel ? "bg-green-50 border-green-200 cursor-pointer" : "bg-red-50 border-red-200 opacity-60"}`}>
                            <input
                              type="checkbox"
                              checked={onWheel}
                              disabled={!hardEligible}
                              onChange={() => setRemovedIds((ids) => ids.includes(member.id) ? ids.filter((id) => id !== member.id) : [...ids, member.id])}
                              className="w-3 h-3 rounded accent-primary shrink-0"
                            />
                            <span className={`text-[11px] font-medium ${onWheel ? "text-foreground" : "text-muted-foreground"}`}>
                              {displayName(member)}
                              {!hardEligible && selectingTimeKeeper ? " · already served" : ""}
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
                  disabled={!isAdmin || !!winner}
                  size={isFS ? 440 : 360}
                />
              </div>
            ) : studentMembers.length === 0 ? (
              <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">No students on the rotation yet. Add people in the Members section.</div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-center gap-2">
                <CheckCircle2 className="w-10 h-10 text-green-400" />
                <p className="text-green-700 font-semibold text-sm">
                  {selectingTimeKeeper ? "Everyone eligible has already served as Time Keeper this year." : "No students are available for this spin."}
                </p>
              </div>
            )}
          </div>

          {/* Spinning For — right side, admin only */}
          <div className="xl:w-72 shrink-0 w-full">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Spinning for:</p>
              <button
                type="button"
                onClick={() => {
                  setShowAddJob((open) => !open);
                  setAddJobError("");
                }}
                className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <Plus className="h-3.5 w-3.5" /> Add Job
              </button>
            </div>
            {showAddJob && (
              <div className="mb-3 space-y-2 rounded-xl border border-border bg-card p-3">
                <label className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Job name
                  <input
                    autoFocus
                    value={newJob.title}
                    onChange={(event) => {
                      setNewJob((job) => ({ ...job, title: event.target.value }));
                      setAddJobError("");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") handleAddJob();
                    }}
                    placeholder="e.g. Organize bookshelf"
                    className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Period
                    <span className="mt-0.5 block text-[11px] font-normal normal-case leading-[1.5] tracking-normal text-muted-foreground">How long one person keeps this job</span>
                    <select
                      value={newJob.period}
                      onChange={(event) => setNewJob((job) => ({ ...job, period: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs font-normal normal-case text-foreground"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>
                  <label className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Days
                    <span className="mt-0.5 block text-[11px] font-normal normal-case leading-[1.5] tracking-normal text-muted-foreground">Which weekdays it gets done</span>
                    <select
                      value={newJob.schedule}
                      onChange={(event) => setNewJob((job) => ({ ...job, schedule: event.target.value }))}
                      className="mt-1 h-10 w-full rounded-lg border border-input bg-background px-2 text-xs font-normal normal-case text-foreground"
                    >
                      <option value="every_weekday">Mon–Fri</option>
                      <option value="mon_wed_fri">Mon/Wed/Fri</option>
                      <option value="tue_thu">Tue/Thu</option>
                    </select>
                  </label>
                </div>
                {addJobError && <p className="text-xs text-primary" role="alert">{addJobError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" onClick={handleAddJob} disabled={addJobMutation.isPending}>
                    {addJobMutation.isPending ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Plus className="mr-1 h-3.5 w-3.5" />}
                    Add Job
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddJob(false)}>Cancel</Button>
                </div>
              </div>
            )}
            <SpinningForTable
              jobs={allJobs}
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
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Week of {formatWeekLabel(currentWeek)} · Time Keepers: {formatMonthLabel(currentMonth)} — {currentAssignments.length}/{allJobs.length} assigned
        </p>
        <JobScheduleTable
          assignments={currentAssignments}
          isAdmin={isAdmin}
          currentUser={user}
          onDayStatus={handleDayStatus}
          onDelete={(id) => deleteMutation.mutate(id)}
          currentMonth={currentMonth}
        />
      </div>
    </div>
  );

  if (fullscreen) {
    return (
      <div className="fixed inset-0 bg-card z-50 flex flex-col">
        <div className="mabis-widget-header bg-primary px-4 py-4 flex flex-col items-start gap-3 shrink-0 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="mabis-widget-title font-display font-bold text-primary-foreground text-2xl">Jobs Assignment</h2>
            <p className="text-primary-foreground/60 text-sm">Weekly jobs: {formatWeekLabel(currentWeek)} · Time Keepers: {formatMonthLabel(currentMonth)}</p>
          </div>
          <div className="mabis-widget-actions flex items-center gap-3">
            {isAdmin && currentAssignments.length > 0 && (
              <Button size="sm" variant="outline"
                className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
                onClick={handleClearAll}>
                <Trash2 className="w-3.5 h-3.5" /> Clear All
              </Button>
            )}
            <button onClick={() => setFullscreen(false)} className="text-primary-foreground/70 hover:text-primary-foreground p-2 rounded-lg hover:bg-card/10">
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
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Current jobs — {currentAssignments.length}/{allJobs.length}</p>
          <button onClick={() => setFullscreen(true)} className="flex items-center gap-1 text-xs text-primary hover:underline">
            <Maximize2 className="w-3 h-3" /> Full Screen
          </button>
        </div>
        <JobScheduleTable
          assignments={currentAssignments}
          isAdmin={isAdmin}
          currentUser={user}
          onDayStatus={handleDayStatus}
          onDelete={(id) => deleteMutation.mutate(id)}
          currentMonth={currentMonth}
        />
      </div>
    );
  }

  return (
    <div className="mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div className="mabis-widget-header bg-primary px-4 py-4 flex flex-col items-start gap-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Jobs</h2>
          <p className="text-primary-foreground/60 text-xs mt-0.5">Weekly: {formatWeekLabel(currentWeek)} · Time Keepers: {formatMonthLabel(currentMonth)} — {currentAssignments.length}/{allJobs.length} assigned</p>
        </div>
        <div className="mabis-widget-actions flex items-center gap-2">
          {isAdmin && currentAssignments.length > 0 && (
            <Button size="sm" variant="outline"
              className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
              onClick={handleClearAll}>
              <Trash2 className="w-3.5 h-3.5" /> Clear All
            </Button>
          )}
          <Button size="sm" variant="outline"
            className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
            onClick={() => setFullscreen(true)}>
            <Maximize2 className="w-3.5 h-3.5" /> Full Screen
          </Button>
        </div>
      </div>
      <div className="mabis-widget-body p-4 sm:p-6">{wheelAndTable(false)}</div>
    </div>
  );
}