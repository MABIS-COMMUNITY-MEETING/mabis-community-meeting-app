import { Show, For } from "solid-js";
import { Portal } from "solid-js/web";
import { Trash2, AlertCircle } from "lucide-solid";
import { displayName } from "@/lib/names";
import {
  WEEKDAYS, formatMonthLabel, getScheduledDatesForMonth, getVisibleWeekDates,
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

/** Per-day cycle button: click → Yes → No → Cancel. */
export function DayStatus(props) {
  const scheduled = () => scheduledDaysFor(props.assignment);
  const monthly = () => jobPeriod(props.assignment) === "monthly";

  const entries = () =>
    monthly()
      ? getVisibleWeekDates(props.currentMonth).filter((e) => scheduled().includes(e.day))
      : WEEKDAYS.filter((d) => scheduled().includes(d)).map((day) => ({ day, key: day, shortLabel: day }));

  const done = () => props.assignment.days_completed || [];
  const notDone = () => props.assignment.not_done_days || [];

  return (
    <div class="flex gap-1.5 flex-wrap justify-center">
      <For each={entries()}>
        {(entry) => {
          const state = () =>
            done().includes(entry.key) ? "yes" : notDone().includes(entry.key) ? "no" : "neutral";
          const compactLabel = () => (monthly() ? `${entry.day[0]}${entry.key.slice(-2)}` : entry.day[0]);
          return (
            <button
              type="button"
              title={`${entry.shortLabel} — ${state() === "yes" ? "Done" : state() === "no" ? "Not done" : "Not marked"} (click to cycle)`}
              onClick={() => props.canEdit && props.onDayStatus(props.assignment, entry.key, state())}
              disabled={!props.canEdit}
              class={`min-w-9 h-9 px-1 rounded-lg text-[10px] font-bold flex items-center justify-center border-2 transition-all
                ${state() === "yes" ? "bg-green-500 border-green-500 text-primary-foreground"
                  : state() === "no" ? "bg-red-500 border-red-500 text-primary-foreground"
                  : "border-border text-muted-foreground bg-card hover:border-primary/30"}
                ${props.canEdit ? "hover:scale-110 cursor-pointer" : "cursor-default opacity-60"}`}
            >
              {state() === "yes" ? "✓" : state() === "no" ? "✗" : compactLabel()}
            </button>
          );
        }}
      </For>
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
              <th class="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase">This Week</th>
              <th class="text-center px-2 py-2.5 text-xs font-semibold text-muted-foreground uppercase">Carry</th>
              <Show when={props.isAdmin}><th class="w-8" /></Show>
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
                      <DayStatus
                        assignment={a}
                        canEdit={canEdit(a)}
                        onDayStatus={props.onDayStatus}
                        currentMonth={props.currentMonth}
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
                          onClick={() => props.onDelete(a.id)}
                          class="text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
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
