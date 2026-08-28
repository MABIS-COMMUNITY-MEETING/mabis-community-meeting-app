import { Show, For } from "solid-js";
import { Portal } from "solid-js/web";
import { Trash2, AlertCircle, CheckCircle2 } from "lucide-solid";
import { displayName } from "@/lib/names";
import {
  formatMonthLabel, getScheduledDatesForMonth,
  jobPeriod, normalizeJobTitle, scheduledDaysFor,
} from "@/lib/jobsRotation";
import { JapaneseText } from "~/components/primitives";

/*
 * Jobs tables — Solid port from src/components/JobsWidget.jsx.
 *
 * Colour utilities (bg-green-500, text-red-500, bg-amber-…) are kept VERBATIM
 * rather than swapped for theme tokens. They look hardcoded, but index.css
 * remaps them globally — e.g. `body .bg-green-500 { background-color:
 * hsl(var(--secondary)) !important; }` — so they already follow the active
 * theme. Both builds share that stylesheet, so copying them exactly is what
 * keeps the two renders identical; "fixing" them here would change the output.
 */

export function WinnerBanner(props) {
  return (
    <Portal>
      <div class="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
        <div
          class="rounded-2xl p-8 text-center text-primary-foreground shadow-2xl w-full max-w-md"
          style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--ring)))" }}
        >
          <p class="text-sm font-semibold opacity-70 uppercase tracking-widest mb-1">Selected!</p>
          <p class="text-4xl font-display font-black mb-1">{displayName(props.winner)}</p>
          <p class="text-sm opacity-80 mb-5">→ <span class="font-semibold">{props.jobLabel}</span></p>

          <Show
            when={props.isAdmin}
            fallback={<p class="text-primary-foreground-muted text-xs">Waiting for admin to confirm...</p>}
          >
            <div class="flex flex-col sm:flex-row gap-2 justify-center">
              <button
                onClick={() => props.onConfirm?.()}
                disabled={props.canAssign === false}
                class="flex-1 bg-card text-primary font-bold py-2.5 px-5 rounded-xl hover:bg-[#EACE54] transition-colors text-sm disabled:cursor-not-allowed disabled:opacity-55"
              >
                {props.canAssign === false ? "Extra spin only" : "Assign this job"}
              </button>
              <button
                onClick={() => props.onRemoveAndNext?.()}
                class="flex-1 bg-card/20 hover:bg-card/30 text-primary-foreground font-bold py-2.5 px-5 rounded-xl transition-colors text-sm border border-primary-foreground/30"
              >
                Remove from wheel
              </button>
              <button
                onClick={() => props.onReject?.()}
                class="flex-1 bg-card/10 hover:bg-card/20 text-primary-foreground/80 font-bold py-2.5 px-5 rounded-xl transition-colors text-sm"
              >
                Re-spin
              </button>
            </div>
          </Show>

          <Show when={props.isAdmin && props.canAssign === false}>
            <p class="mt-3 text-xs text-primary-foreground-muted">
              This person or job is already assigned. Re-spin as often as you like.
            </p>
          </Show>
        </div>
      </div>
    </Portal>
  );
}

/** One checkbox-style status for the whole job assignment. */
export function JobStatus(props) {
  const keys = () =>
    jobPeriod(props.assignment) === "monthly"
      ? getScheduledDatesForMonth(
        props.assignment,
        props.assignment.month_label || props.currentMonth,
      )
      : scheduledDaysFor(props.assignment);
  const done = () => props.assignment.days_completed || [];
  const notDone = () => props.assignment.not_done_days || [];
  const jobDone = () => keys().length > 0 && keys().every((key) => done().includes(key));
  const jobNotDone = () => keys().length > 0 && keys().some((key) => notDone().includes(key));
  const disabled = () => !props.canEdit || props.pending || keys().length === 0;

  const choose = (nextState) => {
    if (disabled()) return;
    const isActive = nextState === "done" ? jobDone() : jobNotDone();
    props.onJobStatus(props.assignment, isActive ? "neutral" : nextState);
  };

  return (
    <div
      class="flex flex-col items-center gap-1.5"
      role="group"
      aria-label={`Completion for ${normalizeJobTitle(props.assignment.job_title)}`}
    >
      <button
        type="button"
        onClick={() => choose("done")}
        disabled={disabled()}
        aria-pressed={jobDone()}
        title={jobDone() ? "Job checked off — click to undo" : "Check off this job"}
        class={`inline-flex min-h-10 min-w-[140px] items-center justify-center gap-1.5 rounded-xl border-2 px-3 text-xs font-bold transition-all
          ${jobDone()
            ? "bg-green-500 border-green-500 text-primary-foreground"
            : "border-primary/30 bg-card text-primary hover:border-primary hover:bg-primary/10"}
          ${disabled() ? "cursor-default opacity-60" : "cursor-pointer hover:-translate-y-0.5 hover:shadow-sm"}`}
      >
        <CheckCircle2 class="h-4 w-4 shrink-0" />
        {jobDone() ? "Job done" : "Check off job"}
      </button>
      <button
        type="button"
        onClick={() => choose("notdone")}
        disabled={disabled()}
        aria-pressed={jobNotDone()}
        title={jobNotDone() ? "Marked not done — click to undo" : "Mark this job not done"}
        class={`inline-flex min-h-8 items-center justify-center gap-1 rounded-lg border px-2 text-[10px] font-bold transition-colors
          ${jobNotDone()
            ? "bg-red-500 border-red-500 text-primary-foreground"
            : "border-border bg-card text-muted-foreground hover:border-red-300 hover:text-red-600"}
          ${disabled() ? "cursor-default opacity-60" : "cursor-pointer"}`}
      >
        <AlertCircle class="h-3 w-3 shrink-0" />
        {jobNotDone() ? "Not done" : "Didn't finish"}
      </button>
    </div>
  );
}

export function JobScheduleTable(props) {
  const canEdit = (a) =>
    props.isAdmin || (props.currentUser?.email && a.assigned_to_email === props.currentUser.email);

  return (
    <Show
      when={props.assignments.length > 0}
      fallback={
        <JapaneseText
          ja={props.isAdmin ? "まだ係が決まっていません—ホイールを回してみましょう！" : "まだ係が決まっていません。"}
          class="block text-muted-foreground text-sm text-center py-10"
          japaneseClass="mt-1 block text-[0.9em]"
        >
          {props.isAdmin ? "No jobs assigned yet — spin the wheel!" : "No jobs assigned yet."}
        </JapaneseText>
      }
    >
      <div class="mobile-horizontal-scroll overflow-x-auto rounded-xl border border-border">
        <table class="w-full min-w-[640px] text-sm">
          <thead>
            <tr class="bg-muted border-b border-border">
              <th class="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Job</th>
              <th class="text-left px-3 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Person</th>
              <th class="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Done</th>
              <th class="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Carry</th>
              <Show when={props.isAdmin}>
                <th class="w-24 px-2 py-2.5 text-center text-xs font-semibold uppercase text-muted-foreground">Remove</th>
              </Show>
            </tr>
          </thead>
          <tbody class="divide-y divide-border">
            <For each={props.assignments}>
              {(a) => {
                const monthly = () => jobPeriod(a) === "monthly";
                const scheduled = () =>
                  monthly()
                    ? getScheduledDatesForMonth(a, a.month_label || props.currentMonth)
                    : scheduledDaysFor(a);
                const done = () => a.days_completed || [];
                const notDone = () => a.not_done_days || [];
                const allDone = () => scheduled().length > 0 && scheduled().every((d) => done().includes(d));
                const hasNotDone = () => notDone().length > 0;

                return (
                  <tr class={`hover:bg-muted group transition-colors ${allDone() ? "bg-green-50/50" : ""} ${hasNotDone() ? "bg-red-50/30" : ""}`}>
                    <td class={`px-3 py-3 font-medium text-xs ${allDone() ? "text-green-600" : "text-foreground"}`}>
                      {normalizeJobTitle(a.job_title)}
                      <p class="text-[9px] text-muted-foreground mt-0.5">
                        {monthly() ? `Monthly · ${formatMonthLabel(a.month_label || props.currentMonth)}` : "Weekly"}
                      </p>
                      <Show when={a.carried_over && !hasNotDone()}>
                        <p class="text-[9px] text-amber-600 mt-0.5">carried over</p>
                      </Show>
                    </td>
                    <td class="px-3 py-3">
                      <div class="flex items-center gap-1.5">
                        <div class="w-6 h-6 rounded-full bg-primary flex items-center justify-center shrink-0">
                          <span class="text-primary-foreground text-[9px] font-bold">{(a.assigned_to_name || "?")[0]}</span>
                        </div>
                        <span class="text-foreground text-xs">{a.assigned_to_name}</span>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-center">
                      <JobStatus
                        assignment={a}
                        canEdit={canEdit(a)}
                        onJobStatus={props.onJobStatus}
                        currentMonth={props.currentMonth}
                        pending={props.statusPending}
                      />
                      <Show when={allDone()}>
                        <p class="text-[9px] text-green-600 font-bold mt-1">All done!</p>
                      </Show>
                    </td>
                    <td class="px-2 py-3 text-center">
                      <Show
                        when={hasNotDone()}
                        fallback={<span class="text-muted-foreground text-xs">—</span>}
                      >
                        <span class="inline-flex items-center gap-1 bg-red-100 border border-red-300 rounded-md px-2 py-1 text-[9px] font-bold text-red-600">
                          <AlertCircle class="w-2.5 h-2.5 shrink-0" />
                          {monthly() ? "Next Month" : "Next Week"}
                        </span>
                      </Show>
                    </td>
                    <Show when={props.isAdmin}>
                      <td class="px-2 py-3">
                        <button
                          type="button"
                          onClick={() => props.onDelete(a)}
                          disabled={props.deletePending}
                          aria-label={`Remove ${normalizeJobTitle(a.job_title)} from ${a.assigned_to_name}`}
                          title="Remove only this job assignment"
                          class="inline-flex min-h-9 items-center gap-1 rounded-lg border border-primary/25 px-2 text-[10px] font-bold text-primary transition-colors hover:bg-primary/10 disabled:cursor-wait disabled:opacity-50"
                        >
                          <Trash2 class="h-3.5 w-3.5" />
                          <span>Remove</span>
                        </button>
                      </td>
                    </Show>
                  </tr>
                );
              }}
            </For>
          </tbody>
        </table>
      </div>
    </Show>
  );
}

export function SpinningForTable(props) {
  return (
    <div class="border border-border rounded-xl overflow-hidden">
      <table class="w-full text-sm">
        <thead>
          <tr class="bg-muted border-b border-border">
            <th class="text-left px-3 py-2 font-semibold text-muted-foreground uppercase text-[11px]">Job</th>
            <th class="text-center px-2 py-2 font-semibold text-muted-foreground uppercase text-[11px] w-20">Choose</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-border">
          <For each={props.jobs}>
            {(job) => {
              const taken = () => props.assignedJobLabels.includes(job.label);
              const selected = () => props.selectedJobId === job.id;
              return (
                <tr class={taken() ? "bg-muted" : ""}>
                  <td class={`px-3 py-2.5 ${taken() ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {job.label}
                    <span class="ml-2 text-[9px] uppercase tracking-wide text-muted-foreground">{job.period || "weekly"}</span>
                  </td>
                  <td class="px-2 py-2 text-center">
                    <button
                      type="button"
                      onClick={() => props.isAdmin && !taken() && props.onSelect(job.id)}
                      disabled={taken() || !props.isAdmin}
                      class={`w-full text-xs font-bold py-1.5 rounded-lg border-2 transition-all
                        ${taken() ? "bg-muted text-muted-foreground border-border"
                          : selected() ? "bg-primary text-primary-foreground border-primary scale-105 shadow"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40 cursor-pointer hover:scale-102"}`}
                    >
                      {taken() ? "Done" : selected() ? "Active" : "Choose"}
                    </button>
                  </td>
                </tr>
              );
            }}
          </For>
        </tbody>
      </table>
    </div>
  );
}
