import { createSignal, createMemo, createEffect, onMount, lazy, Suspense, Show, For, Index } from "solid-js";
import { createStore } from "solid-js/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { FileDown, Loader2, Trash2, Maximize2, X, CheckCircle2, UserPlus, Plus } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { displayName } from "@/lib/names";
import {
  WEEKDAYS, assignmentIsCurrent, formatMonthLabel, formatWeekLabel,
  getCurrentWeekLabel, getMonthLabel, getNextMonthLabel, getNextWeekLabel,
  getScheduledDatesForMonth, getVisibleWeekDates, isTimeKeeperJob, jobPeriod,
  memberRotationKey, normalizeJobTitle, scheduledDaysFor,
} from "@/lib/jobsRotation";
import { useAuth } from "~/lib/AuthContext";
import { Button } from "~/components/ui";
import { Select } from "~/components/ui/select";
import { JapaneseText } from "~/components/primitives";
import { seededShuffle } from "~/lib/wheel-math";
import SpinWheel from "~/components/jobs/SpinWheel";
import { WinnerBanner, JobScheduleTable, SpinningForTable } from "~/components/jobs/tables";

const JobListStudio = lazy(() => import("~/components/jobs/JobListStudio"));

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

const PERIOD_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

const SCHEDULE_OPTIONS = [
  { value: "every_weekday", label: "Mon–Fri" },
  { value: "mon_wed_fri", label: "Mon/Wed/Fri" },
  { value: "tue_thu", label: "Tue/Thu" },
];


/*
 * JobsWidget — Solid port of src/components/JobsWidget.jsx (1,060 lines).
 *
 * Two guards from the original are load-bearing and are preserved exactly,
 * because both fixed real data corruption:
 *
 *   · carryInFlight — the duplicate-carry guard. The `exists` check reads the
 *     query cache, which only refreshes after a create round-trips. Clicking
 *     again inside that window saw stale data and wrote another row, which is
 *     how one job ended up with five identical assignments seconds apart. A
 *     plain Set updated synchronously rejects repeat clicks immediately. In
 *     Solid this is simply a local (no useRef needed) — the component body
 *     runs once, so a local is already stable across the component's life.
 *
 *   · assign.isPending — clearing the winner guards most double-clicks, but two
 *     clicks in the same tick both still see the old winner.
 *
 * The legacy Time Keeper migration (weekly rows written before Time Keepers
 * became monthly) also carries over, including its once-only flag.
 */
export default function JobsWidget(props) {
  const auth = useAuth();
  const queryClient = useQueryClient();

  // Home and Meeting Mode receive the same session from Home, so their
  // wheels mirror the chosen job, winner, and temporary removals. Standalone
  // mounts still get a private session for tests and any future reuse.
  const localWheelSession = {
    selectedJobId: createSignal(JOBS[0].id),
    winner: createSignal(null),
    removedIds: createSignal([]),
    shuffleSeed: createSignal(0),
  };
  const [selectedJobId, setSelectedJobId] = props.wheelSession?.selectedJobId || localWheelSession.selectedJobId;
  const [winner, setWinner] = props.wheelSession?.winner || localWheelSession.winner;
  const [removedIds, setRemovedIds] = props.wheelSession?.removedIds || localWheelSession.removedIds;
  const [shuffleSeed, setShuffleSeed] = props.wheelSession?.shuffleSeed || localWheelSession.shuffleSeed;
  const [fullscreen, setFullscreen] = createSignal(false);
  const [showStudentMgr, setShowStudentMgr] = createSignal(false);
  const [showAddJob, setShowAddJob] = createSignal(false);
  const [showJobListStudio, setShowJobListStudio] = createSignal(false);
  const [newJob, setNewJob] = createStore({ title: "", period: "weekly", schedule: "every_weekday" });
  const [addJobError, setAddJobError] = createSignal("");
  const [jobActionMessage, setJobActionMessage] = createSignal("");
  const [rotationBusy, setRotationBusy] = createSignal(false);

  const currentWeek = getCurrentWeekLabel();
  const currentMonth = getMonthLabel();

  const members = () => props.members || [];
  const isAdmin = () => props.isAdmin;

  const assignmentsQuery = useQuery(() => ({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.JobAssignment.list("-created_date", 500),
  }));

  const jobDefsQuery = useQuery(() => ({
    queryKey: ["job-definitions"],
    queryFn: () => base44.entities.JobDefinition.list("title", 100),
  }));

  const assignments = () => assignmentsQuery.data || [];

  // ── legacy Time Keeper migration (runs at most once) ──────────────────────
  let migratedLegacyTimeKeepers = false;
  createEffect(() => {
    const list = assignments();
    if (migratedLegacyTimeKeepers || list.length === 0) return;
    const legacyCurrent = list.filter((a) =>
      isTimeKeeperJob(a.job_title) && !a.month_label && a.week_label === currentWeek);
    migratedLegacyTimeKeepers = true;
    if (legacyCurrent.length === 0) return;

    Promise.all(legacyCurrent.map((a) => base44.entities.JobAssignment.update(a.id, {
      job_title: normalizeJobTitle(a.job_title),
      assignment_period: "monthly",
      month_label: currentMonth,
      schedule_days: scheduledDaysFor(a),
    })))
      .then(() => queryClient.invalidateQueries({ queryKey: ["assignments"] }))
      .catch(() => { migratedLegacyTimeKeepers = false; });
  });

  // ── derived ───────────────────────────────────────────────────────────────
  const customJobs = createMemo(() =>
    (jobDefsQuery.data || [])
      .filter((j) => j.active !== false)
      .map((j) => ({
        id: `custom-${j.id}`,
        definitionId: j.id,
        label: normalizeJobTitle(j.title),
        period: j.period || "weekly",
        schedule_days: j.schedule_days,
      })));

  const allJobs = createMemo(() => [...JOBS, ...customJobs()]);
  const studentMembers = createMemo(() => members().filter((m) => !m.role || m.role === "student"));
  const rotationMembers = createMemo(() =>
    studentMembers().filter((m) => m.job_rotation_enabled !== false));
  const sortedStudentMembers = createMemo(() =>
    [...studentMembers()].sort((a, b) => displayName(a).localeCompare(displayName(b))));
  const currentAssignments = createMemo(() =>
    assignments().filter((a) => assignmentIsCurrent(a, currentWeek, currentMonth)));
  const assignedJobLabels = createMemo(() => currentAssignments().map((a) => normalizeJobTitle(a.job_title)));
  const assignedMemberKeys = createMemo(() => new Set(
    currentAssignments().map((a) => memberRotationKey({ email: a.assigned_to_email, name: a.assigned_to_name }))));

  const selectedJob = createMemo(() =>
    allJobs().find((j) => j.id === selectedJobId()) || allJobs()[0] || JOBS[0]);
  const selectingTimeKeeper = () => isTimeKeeperJob(selectedJob()?.label);

  // Time Keepers stay on the wheel after being selected. They may be picked
  // again for another Time Keeper slot or a later month; the exact job slot
  // still cannot be assigned twice.
  const assignmentEligibleStudents = createMemo(() =>
    selectingTimeKeeper()
      ? rotationMembers()
      : rotationMembers().filter((m) =>
        !assignedMemberKeys().has(memberRotationKey(m))));

  const repeatSpinMode = () =>
    !selectingTimeKeeper() && assignmentEligibleStudents().length === 0 && rotationMembers().length > 0;
  const spinCandidates = createMemo(() => repeatSpinMode() ? rotationMembers() : assignmentEligibleStudents());

  const wheelMembers = createMemo(() => {
    const ordered = spinCandidates()
      .filter((m) => !removedIds().includes(m.id))
      .sort((a, b) => displayName(a).localeCompare(displayName(b)));
    const seed = shuffleSeed();
    return seed ? seededShuffle(ordered, seed) : ordered;
  });
  const directPickOptions = createMemo(() =>
    wheelMembers().map((m) => ({ value: m.id, label: displayName(m) })));

  const winnerCanBeAssigned = () => {
    const w = winner();
    return !!w
      && (isTimeKeeperJob(w.jobLabel) || !assignedMemberKeys().has(memberRotationKey(w.member)))
      && !assignedJobLabels().includes(normalizeJobTitle(w.jobLabel));
  };

  createEffect(() => {
    if (wheelMembers().length === 0 && spinCandidates().length > 0 && removedIds().length > 0) {
      setRemovedIds([]);
    }
  });

  // ── mutations ─────────────────────────────────────────────────────────────
  const addJobMutation = useMutation(() => ({
    mutationFn: (data) => base44.entities.JobDefinition.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ["job-definitions"] });
      if (created?.id) setSelectedJobId(`custom-${created.id}`);
      setNewJob({ title: "", period: "weekly", schedule: "every_weekday" });
      setAddJobError("");
      setShowAddJob(false);
    },
  }));

  const assign = useMutation(() => ({
    mutationFn: (data) => base44.entities.JobAssignment.create(data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      const updatedAssigned = [...assignedJobLabels(), normalizeJobTitle(vars.job_title)];
      const next = allJobs().find((j) => !updatedAssigned.includes(j.label));
      if (next) setSelectedJobId(next.id);
    },
  }));

  const removeAssignment = useMutation(() => ({
    mutationFn: (assignment) => base44.entities.JobAssignment.delete(assignment.id),
    onSuccess: (_, assignment) => {
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setJobActionMessage(
        `Removed "${normalizeJobTitle(assignment.job_title)}" from ${assignment.assigned_to_name}. Only that assignment was removed.`,
      );
      window.setTimeout(() => setJobActionMessage(""), 5000);
    },
    onError: () => setJobActionMessage("Could not remove that job assignment."),
  }));

  const handleRemoveAssignment = (assignment) => {
    if (!assignment || removeAssignment.isPending) return;
    const jobTitle = normalizeJobTitle(assignment.job_title);
    if (!window.confirm(
      `Remove "${jobTitle}" from ${assignment.assigned_to_name}? This removes only this job assignment.`,
    )) return;
    removeAssignment.mutate(assignment);
  };

  const updateAssignment = useMutation(() => ({
    mutationFn: ({ id, data }) => base44.entities.JobAssignment.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  }));

  const carry = useMutation(() => ({
    mutationFn: (data) => base44.entities.JobAssignment.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["assignments"] }),
  }));

  const statusKeysFor = (a) =>
    jobPeriod(a) === "monthly"
      ? getScheduledDatesForMonth(a, a.month_label || currentMonth)
      : scheduledDaysFor(a);

  // Synchronous duplicate guard — see the note at the top of this file.
  const carryInFlight = new Set();

  const carryToNextPeriod = (a) => {
    const period = jobPeriod(a);
    const nextWeek = period === "weekly" ? getNextWeekLabel(a.week_label || currentWeek) : null;
    const nextMonth = period === "monthly" ? getNextMonthLabel(a.month_label || currentMonth) : null;
    const exists = assignments().some((c) =>
      normalizeJobTitle(c.job_title) === normalizeJobTitle(a.job_title)
      && c.assigned_to_name === a.assigned_to_name
      && (period === "monthly" ? c.month_label === nextMonth : c.week_label === nextWeek));

    const inFlightKey = [
      normalizeJobTitle(a.job_title),
      a.assigned_to_name,
      period === "monthly" ? nextMonth : nextWeek,
    ].join("|");
    if (exists || carryInFlight.has(inFlightKey)) return;
    carryInFlight.add(inFlightKey);

    carry.mutate({
      job_title: normalizeJobTitle(a.job_title),
      assigned_to_name: a.assigned_to_name,
      assigned_to_email: a.assigned_to_email || "",
      assignment_period: period,
      schedule_days: scheduledDaysFor(a),
      ...(period === "monthly" ? { month_label: nextMonth } : { week_label: nextWeek }),
      completed: false,
      carried_over: true,
    }, {
      onSettled: () => carryInFlight.delete(inFlightKey),
    });
  };

  const handleDayStatus = (a, day, currentState) => {
    const done = a.days_completed || [];
    const notDoneDays = a.not_done_days || [];
    const scheduled = statusKeysFor(a);

    if (currentState === "neutral") {
      const newDone = [...new Set([...done, day])];
      const newNotDone = notDoneDays.filter((e) => e !== day);
      const completed = scheduled.length > 0 && scheduled.every((e) => newDone.includes(e));
      updateAssignment.mutate({ id: a.id, data: { days_completed: newDone, not_done_days: newNotDone, completed, not_done: newNotDone.length > 0 } });
    } else if (currentState === "yes") {
      const newDone = done.filter((e) => e !== day);
      const newNotDone = [...new Set([...notDoneDays, day])];
      updateAssignment.mutate({ id: a.id, data: { days_completed: newDone, not_done_days: newNotDone, completed: false, not_done: true } });
      carryToNextPeriod(a);
    } else {
      const newNotDone = notDoneDays.filter((e) => e !== day);
      updateAssignment.mutate({ id: a.id, data: { not_done_days: newNotDone, not_done: newNotDone.length > 0 } });
    }
  };

  // Deep-link job actions from the reminder email (?job_action=&job_id=).
  let handledJobAction = false;
  createEffect(() => {
    const list = assignments();
    if (handledJobAction || list.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const action = params.get("job_action");
    const jobId = params.get("job_id");
    if (!action || !jobId) return;
    const a = list.find((c) => c.id === jobId);
    if (!a) return;

    handledJobAction = true;
    const period = jobPeriod(a);
    const allScheduled = statusKeysFor(a);
    const actionKeys = period === "monthly"
      ? getVisibleWeekDates(a.month_label || currentMonth)
        .filter((e) => scheduledDaysFor(a).includes(e.day))
        .map((e) => e.key)
      : scheduledDaysFor(a);
    const done = a.days_completed || [];
    const notDone = a.not_done_days || [];

    if (action === "done") {
      const nextDone = [...new Set([...done, ...actionKeys])];
      const nextNotDone = notDone.filter((e) => !actionKeys.includes(e));
      updateAssignment.mutate({ id: jobId, data: {
        days_completed: nextDone,
        not_done_days: nextNotDone,
        completed: allScheduled.every((e) => nextDone.includes(e)),
        not_done: nextNotDone.length > 0,
      } });
      setJobActionMessage(`Marked "${normalizeJobTitle(a.job_title)}" as done.`);
    } else if (action === "notdone") {
      const nextDone = done.filter((e) => !actionKeys.includes(e));
      const nextNotDone = [...new Set([...notDone, ...actionKeys])];
      updateAssignment.mutate({ id: jobId, data: { days_completed: nextDone, not_done_days: nextNotDone, completed: false, not_done: true } });
      carryToNextPeriod(a);
      setJobActionMessage(`Marked "${normalizeJobTitle(a.job_title)}" as not done — carried to the next ${period === "monthly" ? "month" : "week"}.`);
    }

    window.history.replaceState({}, "", window.location.pathname);
    window.setTimeout(() => setJobActionMessage(""), 6000);
  });

  const handleAddJob = () => {
    const title = normalizeJobTitle(newJob.title.trim());
    if (!title) { setAddJobError("Enter a job name."); return; }
    if (allJobs().some((j) => j.label.toLocaleLowerCase() === title.toLocaleLowerCase())) {
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

  const setRotationForMembers = async (targets, enabled) => {
    if (rotationBusy()) return;
    const changed = targets.filter((member) =>
      member?.id && (member.job_rotation_enabled !== false) !== enabled);
    if (changed.length === 0) return;

    const targetIds = new Set(changed.map((member) => member.id));
    const previousMembers = queryClient.getQueryData(["members"]);
    setRotationBusy(true);
    queryClient.setQueryData(["members"], (current = []) =>
      current.map((member) =>
        targetIds.has(member.id) ? { ...member, job_rotation_enabled: enabled } : member));

    if (enabled) {
      setRemovedIds((ids) => ids.filter((id) => !targetIds.has(id)));
    } else if (winner() && targetIds.has(winner().member.id)) {
      setWinner(null);
    }

    try {
      await Promise.all(changed.map((member) =>
        base44.entities.Member.update(member.id, { job_rotation_enabled: enabled })));
      const subject = changed.length === 1 ? displayName(changed[0]) : `${changed.length} students`;
      setJobActionMessage(
        `${subject} ${enabled ? "added to" : "removed from"} the job list.`,
      );
      window.setTimeout(() => setJobActionMessage(""), 4000);
    } catch {
      if (previousMembers !== undefined) {
        queryClient.setQueryData(["members"], previousMembers);
      }
      setJobActionMessage("Could not update the job list. Please try again.");
    } finally {
      setRotationBusy(false);
      queryClient.invalidateQueries({ queryKey: ["members"] });
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Clear all current weekly and monthly job assignments?")) return;
    try {
      await Promise.all(currentAssignments().map((a) => base44.entities.JobAssignment.delete(a.id)));
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setRemovedIds([]);
    } catch {
      setJobActionMessage("Could not clear the current assignments.");
    }
  };

  const handleSpinComplete = (member) =>
    setWinner({ member, job: selectedJob(), jobLabel: selectedJob().label });

  const handleConfirmAssign = () => {
    const w = winner();
    if (!w || !winnerCanBeAssigned() || assign.isPending) return;
    const job = w.job || selectedJob();
    const period = job.period || "weekly";
    assign.mutate({
      job_title: w.jobLabel,
      assigned_to_name: w.member.name,
      assigned_to_email: w.member.email || "",
      assignment_period: period,
      schedule_days: scheduledDaysFor(job),
      ...(period === "monthly" ? { month_label: currentMonth } : { week_label: currentWeek }),
      completed: false,
    });
    setWinner(null);
  };

  const handleRemoveAndNext = () => {
    const w = winner();
    if (!w) return;
    setRemovedIds((ids) => [...ids, w.member.id]);
    setWinner(null);
  };

  /* No banner here on purpose. Every other jobActionMessage reports something
     the reader cannot see — an assignment removed, a job marked done, a save
     that failed. A shuffle is the one action whose entire result is on screen
     already: the wheel visibly reorders under the button that was just
     pressed. Announcing it said nothing new and pushed the wheel down the page
     for three seconds each time. */
  const handleShuffleWheel = () => {
    if (wheelMembers().length < 2 || winner()) return;
    setShuffleSeed((seed) => ((seed + 1) >>> 0) || 1);
  };

  const JobListStudioPanel = () => (
    <Show when={showJobListStudio()}>
      <Suspense
        fallback={
          <JapaneseText
            as="p"
            role="status"
            ja="係リスト作成画面を読み込んでいます…"
            class="block border-y border-border px-3 py-8 text-center text-sm text-muted-foreground"
            japaneseClass="mt-1 block text-[0.86em]"
          >
            Loading Job List Studio…
          </JapaneseText>
        }
      >
        <JobListStudio
          assignments={currentAssignments()}
          periodLabel={`Week of ${formatWeekLabel(currentWeek)} / Time Keepers: ${formatMonthLabel(currentMonth)}`}
          currentUser={auth.user()}
          isAdmin={isAdmin()}
          onClose={() => setShowJobListStudio(false)}
        />
      </Suspense>
    </Show>
  );

  const WheelAndTable = (p) => (
    <div class="space-y-6">
      <Show when={jobActionMessage()}>
        <div class={`rounded-xl p-4 text-center font-semibold text-sm ${
          jobActionMessage().includes("not done") || jobActionMessage().includes("Could not")
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-secondary-foreground"
        }`}>
          {jobActionMessage()}
        </div>
      </Show>

      {/* Winner banner — shows for everyone */}
      <Show when={winner()}>
        <WinnerBanner
          winner={winner().member}
          jobLabel={winner().jobLabel}
          onConfirm={isAdmin() ? handleConfirmAssign : undefined}
          onRemoveAndNext={isAdmin() ? handleRemoveAndNext : undefined}
          onReject={isAdmin() ? (() => setWinner(null)) : undefined}
          isAdmin={isAdmin()}
          canAssign={winnerCanBeAssigned()}
        />
      </Show>

      <Show when={isAdmin()}>
        <div class="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3" aria-label="How to assign a job">
          <Index each={["1. Choose a job", "2. Spin the wheel", "3. Confirm or re-spin"]}>
            {(step) => <div class="bg-card px-3 py-2.5 text-center text-xs font-semibold text-card-foreground">{step()}</div>}
          </Index>
        </div>
      </Show>

      <Show when={isAdmin()}>
        <div class="flex flex-col xl:flex-row gap-6 xl:gap-8 items-start">
          <div class="flex flex-col items-center gap-4 flex-1 min-w-0 w-full">
            <div class="w-full flex justify-center mb-2">
              <button
                onClick={() => setShowStudentMgr((s) => !s)}
                class="flex items-center gap-1 text-xs text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/30 font-semibold transition-colors"
              >
                <UserPlus class="w-3.5 h-3.5" /> Manage Students
              </button>
            </div>

            <Show when={wheelMembers().length > 0}>
              <JapaneseText
                ja={`ホイールに${wheelMembers().length}人${repeatSpinMode() ? "。追加スピンは無制限です" : ""}`}
                class="block text-xs text-muted-foreground font-medium text-center"
                japaneseClass="block mt-0.5 text-[0.9em]"
              >
                {wheelMembers().length} student{wheelMembers().length !== 1 ? "s" : ""} on the wheel
                {repeatSpinMode() ? " · extra spins are unlimited" : ""}
              </JapaneseText>
            </Show>
            <Show when={selectingTimeKeeper() && wheelMembers().length > 0}>
              <JapaneseText
                as="p"
                ja="タイムキーパーに選ばれた人もホイールに残り、もう一度選ばれることがあります。"
                class="block text-center text-[11px] leading-relaxed text-primary"
                japaneseClass="mt-0.5 block text-[0.9em]"
              >
                Time Keepers stay on the wheel after being picked and can be picked again.
              </JapaneseText>
            </Show>

            {/* Pick someone directly instead of spinning. Routed through the
                same handler as a spin, so the confirm step, eligibility rules
                and double-write guards all apply unchanged. */}
            <Show when={wheelMembers().length > 0}>
              <div class="flex w-full max-w-[420px] flex-col gap-1">
                <label class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Or choose someone yourself
                </label>
                <p class="text-[11px] leading-[1.5] tracking-[0.02em] text-muted-foreground">
                  Picks that person instead of spinning. You still confirm before anything is saved.
                </p>
                <Select
                  value=""
                  onChange={(v) => {
                    const picked = wheelMembers().find((m) => m.id === v);
                    if (picked) handleSpinComplete(picked);
                  }}
                  options={directPickOptions()}
                  placeholder="Pick a person…"
                  aria-label="Pick a person directly"
                  triggerClass="mt-0.5 h-10 w-full rounded-lg"
                />
              </div>
            </Show>

            <Show
              when={wheelMembers().length > 0}
              fallback={
                <Show
                  when={studentMembers().length > 0}
                  fallback={
                    <div class="h-40 flex items-center justify-center text-muted-foreground text-sm">
                      No students on the rotation yet. Add people in the Members section.
                    </div>
                  }
                >
                  <Show
                    when={rotationMembers().length > 0}
                    fallback={
                      <div class="h-40 flex flex-col items-center justify-center text-center gap-2 text-muted-foreground text-sm">
                        <p>No students are included in the job list.</p>
                        <p class="text-xs">Use Manage Students to add someone.</p>
                      </div>
                    }
                  >
                    <div class="h-40 flex flex-col items-center justify-center text-center gap-2">
                      <CheckCircle2 class="w-10 h-10 text-green-400" />
                      <p class="text-green-700 font-semibold text-sm">
                        No students are available for this spin.
                      </p>
                    </div>
                  </Show>
                </Show>
              }
            >
              <div class="w-full flex justify-center">
                <SpinWheel
                  members={wheelMembers()}
                  onSpinComplete={handleSpinComplete}
                  onShuffle={handleShuffleWheel}
                  disabled={!isAdmin() || !!winner()}
                  size={p.fullscreen ? 440 : 360}
                />
              </div>
            </Show>

            <Show when={showStudentMgr()}>
              <div data-cursor-lite class="w-full max-w-[420px] rounded-xl border border-border bg-card p-3">
                <div class="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                      {rotationMembers().length}/{studentMembers().length} on job list
                    </p>
                    <p class="text-[10px] text-muted-foreground">Removing someone here does not delete their profile.</p>
                  </div>
                  <div class="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => setRotationForMembers(studentMembers(), true)}
                      disabled={rotationBusy() || rotationMembers().length === studentMembers().length}
                      class="rounded bg-primary px-2 py-1 text-[9px] font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-45"
                    >
                      Add all
                    </button>
                    <button
                      type="button"
                      onClick={() => setRotationForMembers(rotationMembers(), false)}
                      disabled={rotationBusy() || rotationMembers().length === 0}
                      class="rounded bg-primary/10 px-2 py-1 text-[9px] font-bold text-primary transition-colors hover:bg-primary/20 disabled:opacity-45"
                    >
                      Remove all
                    </button>
                  </div>
                </div>
                <div class="max-h-56 space-y-1 overflow-y-auto">
                  <For
                    each={sortedStudentMembers()}
                    fallback={<p class="px-2 py-5 text-center text-xs text-muted-foreground">No student profiles yet.</p>}
                  >
                    {(member) => {
                      const included = () => member.job_rotation_enabled !== false;
                      return (
                        <div class="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-muted">
                          <div class="min-w-0">
                            <p class={`truncate text-xs ${included() ? "text-foreground" : "text-muted-foreground line-through"}`}>
                              {displayName(member)}
                            </p>
                            <p class="text-[9px] text-muted-foreground">
                              {included() ? "On job list" : "Removed from job list"}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => setRotationForMembers([member], !included())}
                            disabled={rotationBusy()}
                            aria-label={`${included() ? "Remove" : "Add"} ${displayName(member)} ${included() ? "from" : "to"} the job list`}
                            class={`min-h-8 shrink-0 rounded-lg border px-2.5 text-[10px] font-bold transition-colors disabled:cursor-wait disabled:opacity-50 ${
                              included()
                                ? "border-primary/30 text-primary hover:bg-primary/10"
                                : "border-primary bg-primary text-primary-foreground hover:bg-primary/90"
                            }`}
                          >
                            {included() ? "Remove" : "Add"}
                          </button>
                        </div>
                      );
                    }}
                  </For>
                </div>
              </div>
            </Show>
          </div>

          {/* Spinning For — right side, admin only */}
          <div class="xl:w-72 shrink-0 w-full">
            <div class="mb-2 flex items-center justify-between gap-2">
              <p class="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Spinning for:</p>
              <button
                type="button"
                onClick={() => { setShowAddJob((o) => !o); setAddJobError(""); }}
                class="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/30 px-2.5 text-xs font-semibold text-primary hover:bg-primary/10"
              >
                <Plus class="h-3.5 w-3.5" /> Add Job
              </button>
            </div>

            <Show when={showAddJob()}>
              <div class="mb-3 space-y-2 rounded-xl border border-border bg-card p-3">
                <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  Job name
                  <input
                    autofocus
                    value={newJob.title}
                    onInput={(e) => { setNewJob("title", e.currentTarget.value); setAddJobError(""); }}
                    onKeyDown={(e) => { if (e.key === "Enter") handleAddJob(); }}
                    placeholder="e.g. Organize bookshelf"
                    class="mt-1 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm font-normal normal-case tracking-normal text-foreground outline-none focus:border-primary"
                  />
                </label>
                <div class="grid grid-cols-2 gap-2">
                  <label class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Period
                    <span class="mt-0.5 block text-[11px] font-normal normal-case leading-[1.5] tracking-normal text-muted-foreground">
                      How long one person keeps this job
                    </span>
                    <Select
                      value={newJob.period}
                      onChange={(v) => setNewJob("period", v)}
                      options={PERIOD_OPTIONS}
                      aria-label="Job period"
                      triggerClass="mt-1 h-10 w-full rounded-lg text-xs"
                    />
                  </label>
                  <label class="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    Days
                    <span class="mt-0.5 block text-[11px] font-normal normal-case leading-[1.5] tracking-normal text-muted-foreground">
                      Which weekdays it gets done
                    </span>
                    <Select
                      value={newJob.schedule}
                      onChange={(v) => setNewJob("schedule", v)}
                      options={SCHEDULE_OPTIONS}
                      aria-label="Job days"
                      triggerClass="mt-1 h-10 w-full rounded-lg text-xs"
                    />
                  </label>
                </div>
                <Show when={addJobError()}>
                  <p class="text-xs text-primary" role="alert">{addJobError()}</p>
                </Show>
                <div class="flex gap-2">
                  <Button size="sm" class="flex-1" onClick={handleAddJob} disabled={addJobMutation.isPending}>
                    <Show when={addJobMutation.isPending} fallback={<Plus class="mr-1 h-3.5 w-3.5" />}>
                      <Loader2 class="mr-1 h-3.5 w-3.5 animate-spin" />
                    </Show>
                    Add Job
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowAddJob(false)}>Cancel</Button>
                </div>
              </div>
            </Show>

            <SpinningForTable
              jobs={allJobs()}
              assignedJobLabels={assignedJobLabels()}
              selectedJobId={selectedJobId()}
              onSelect={setSelectedJobId}
              isAdmin={isAdmin()}
            />
          </div>
        </div>
      </Show>

      {/* Bottom: jobs table — shown for everyone, larger for non-admins */}
      <div>
        <div class="mb-3 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <JapaneseText
            ja={`今週：${formatWeekLabel(currentWeek)}・タイムキーパー：${formatMonthLabel(currentMonth)}—${currentAssignments().length}/${allJobs().length}件割り当て済み`}
            class="block text-xs font-semibold text-muted-foreground uppercase tracking-wide"
            japaneseClass="mt-0.5 block normal-case tracking-normal text-[0.9em]"
          >
            Week of {formatWeekLabel(currentWeek)} · Time Keepers: {formatMonthLabel(currentMonth)} — {currentAssignments().length}/{allJobs().length} assigned
          </JapaneseText>
          <Button
            type="button"
            size="sm"
            variant="outline"
            class="min-h-10 shrink-0 self-start rounded-sm border-primary/45 text-primary sm:self-auto"
            onClick={() => setShowJobListStudio((open) => !open)}
            aria-expanded={showJobListStudio()}
          >
            <FileDown class="h-4 w-4" />
            <JapaneseText ja="予定表を印刷・保存" layout="inline">Print / Save Schedule</JapaneseText>
          </Button>
        </div>
        <JobListStudioPanel />
        <JobScheduleTable
          assignments={currentAssignments()}
          isAdmin={isAdmin()}
          currentUser={auth.user()}
          onDayStatus={handleDayStatus}
          onDelete={handleRemoveAssignment}
          deletePending={removeAssignment.isPending}
          currentMonth={currentMonth}
        />
      </div>
    </div>
  );

  // ── fullscreen ────────────────────────────────────────────────────────────
  return (
    <Show when={!fullscreen()} fallback={
      <div class="fixed inset-0 bg-card z-50 flex flex-col">
        <div class="mabis-widget-header bg-primary px-4 py-4 flex flex-col items-start gap-3 shrink-0 sm:px-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-2xl">Jobs Assignment</h2>
            <JapaneseText
              ja={`今週の係：${formatWeekLabel(currentWeek)}・タイムキーパー：${formatMonthLabel(currentMonth)}`}
              class="block text-primary-foreground-muted text-sm"
              japaneseClass="block mt-0.5 text-[0.85em]"
            >
              Weekly jobs: {formatWeekLabel(currentWeek)} · Time Keepers: {formatMonthLabel(currentMonth)}
            </JapaneseText>
          </div>
          <div class="mabis-widget-actions flex items-center gap-3">
            <Show when={isAdmin() && currentAssignments().length > 0}>
              <Button
                size="sm"
                variant="outline"
                class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
                onClick={handleClearAll}
              >
                <Trash2 class="w-3.5 h-3.5" /> Clear All
              </Button>
            </Show>
            <button
              onClick={() => setFullscreen(false)}
              class="text-primary-foreground/70 hover:text-primary-foreground p-2 rounded-lg hover:bg-card/10"
              aria-label="Exit full screen"
            >
              <X class="w-6 h-6" />
            </button>
          </div>
        </div>
        <div class="mabis-widget-body flex-1 overflow-y-auto p-4 sm:p-8">
          <WheelAndTable fullscreen />
        </div>
      </div>
    }>
      <Show when={!props.compact} fallback={
        <div>
          <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
            <JapaneseText
              as="p"
              ja={`現在の係：${currentAssignments().length}/${allJobs().length}件`}
              class="block text-xs font-semibold uppercase tracking-wide text-muted-foreground"
              japaneseClass="ml-1.5 inline normal-case tracking-normal"
              layout="inline"
            >
              Current jobs — {currentAssignments().length}/{allJobs().length}
            </JapaneseText>
            <div class="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                class="min-h-9 rounded-sm border-primary/45 px-2.5 text-xs text-primary"
                onClick={() => setShowJobListStudio((open) => !open)}
                aria-expanded={showJobListStudio()}
              >
                <FileDown class="h-3.5 w-3.5" />
                <JapaneseText ja="予定表を印刷・保存" layout="inline">Print / Save Schedule</JapaneseText>
              </Button>
              <button onClick={() => setFullscreen(true)} class="flex min-h-9 items-center gap-1 px-1 text-xs text-primary hover:underline">
                <Maximize2 class="w-3 h-3" /> Full Screen
              </button>
            </div>
          </div>
          <JobListStudioPanel />
          <JobScheduleTable
            assignments={currentAssignments()}
            isAdmin={isAdmin()}
            currentUser={auth.user()}
            onDayStatus={handleDayStatus}
            onDelete={handleRemoveAssignment}
            deletePending={removeAssignment.isPending}
            currentMonth={currentMonth}
          />
        </div>
      }>
        <div class="mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
          <div class="mabis-widget-header bg-primary px-4 py-4 flex flex-col items-start gap-3 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Jobs</h2>
              <JapaneseText
                ja={`今週：${formatWeekLabel(currentWeek)}・タイムキーパー：${formatMonthLabel(currentMonth)}—${currentAssignments().length}/${allJobs().length}件割り当て済み`}
                class="block text-primary-foreground-muted text-xs mt-0.5"
                japaneseClass="block mt-0.5 text-[0.9em]"
              >
                Weekly: {formatWeekLabel(currentWeek)} · Time Keepers: {formatMonthLabel(currentMonth)} — {currentAssignments().length}/{allJobs().length} assigned
              </JapaneseText>
            </div>
            <div class="mabis-widget-actions flex items-center gap-2">
              <Show when={isAdmin() && currentAssignments().length > 0}>
                <Button
                  size="sm"
                  variant="outline"
                  class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
                  onClick={handleClearAll}
                >
                  <Trash2 class="w-3.5 h-3.5" /> Clear All
                </Button>
              </Show>
              <Button
                size="sm"
                variant="outline"
                class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
                onClick={() => setFullscreen(true)}
              >
                <Maximize2 class="w-3.5 h-3.5" /> Full Screen
              </Button>
            </div>
          </div>
          <div class="mabis-widget-body p-4 sm:p-5">
            <WheelAndTable />
          </div>
        </div>
      </Show>
    </Show>
  );
}
