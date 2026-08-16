import { createSignal, For, Index, Show } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import { Bell, X } from "lucide-solid";
import { useAuth } from "~/lib/AuthContext";
import { getWeekLabel } from "~/lib/weeks";

/*
 * Weekly job reminder — port of src/components/JobReminder.jsx.
 *
 * ── Deliberate behaviour preservation, please read before "fixing" this ──
 *
 * `scheduledDaysFor` below is JobReminder's OWN copy, kept byte-for-byte, and
 * it disagrees with the shared `scheduledDaysFor` in @/lib/jobsRotation:
 *
 *   shared: honours a job's configurable `schedule_days`, and falls back to
 *           ALL FIVE weekdays for a title with no (1)/(2) marker.
 *   local:  ignores `schedule_days` entirely, and returns [] for any title
 *           with no (1)/(2) marker.
 *
 * Because `pending` filters on `sched.length > 0`, the local copy means this
 * reminder silently never fires for jobs with a custom schedule or a plainly
 * named job. That is a real bug — but it is the LIVE behaviour, and swapping in
 * the shared helper would start showing this modal to people who have never
 * seen it. That is a product decision, not a port decision, so it is preserved
 * here and raised separately. If it is fixed, fix it in BOTH builds at once.
 */
function scheduledDaysFor(jobTitle) {
  if (jobTitle.includes("(1)")) return ["Monday", "Wednesday", "Friday"];
  if (jobTitle.includes("(2)")) return ["Tuesday", "Thursday"];
  return [];
}

export default function JobReminder() {
  const auth = useAuth();
  /*
   * Read synchronously during setup, NOT in onMount.
   *
   * onMount runs after the first render, so dismissed() was false for that
   * frame on every single load. This component renders a full-viewport
   * bg-black/50 backdrop-blur overlay, and one frame of that is a very visible
   * dark flash — the reminder appeared to "splash" even after being dismissed.
   */
  const [dismissed, setDismissed] = createSignal((() => {
    try {
      return !!localStorage.getItem(`job_reminder_${new Date().toDateString()}`);
    } catch {
      return false;   // private mode: the reminder simply shows again
    }
  })());
  const todayKey = `job_reminder_${new Date().toDateString()}`;
  const currentWeek = getWeekLabel(new Date());

  const assignmentsQuery = useQuery(() => ({
    queryKey: ["assignments"],
    queryFn: () => base44.entities.JobAssignment.list("-created_date", 300),
  }));


  const myJobs = () => (assignmentsQuery.data || []).filter((a) =>
    a.week_label === currentWeek && auth.user()?.email && a.assigned_to_email === auth.user().email
  );

  const pending = () => myJobs().filter((a) => {
    const sched = scheduledDaysFor(a.job_title);
    return sched.length > 0 && (a.days_completed || []).length < sched.length;
  });

  const handleDismiss = () => {
    try {
      localStorage.setItem(todayKey, "true");
    } catch { /* private mode */ }
    setDismissed(true);
  };

  /*
   * Gated on isSuccess, not on data being present.
   *
   * ["assignments"] is shared with the Jobs widget and the warm-up, so any
   * invalidateQueries on that key refetches here too — and restoreOfflineQueries
   * invalidates every persisted root right after hydration, so that happens on
   * every load. While a refetch is in flight `data` can be momentarily absent,
   * which emptied pending(), hid the overlay, then showed it again when the data
   * returned: one full-screen flash per invalidation.
   *
   * isSuccess stays true across a background refetch, so the overlay's
   * visibility now depends only on whether there is anything to remind about.
   */
  return (
    <Show when={!dismissed() && assignmentsQuery.isSuccess && pending().length > 0}>
      <div
        class="fade-in fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
        onClick={handleDismiss}
      >
        <div
          class="modal-pop bg-card rounded-2xl shadow-2xl p-6 w-full max-w-md"
          onClick={(e) => e.stopPropagation()}
        >
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center gap-2.5">
              <div class="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <Bell class="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 class="font-display font-bold text-foreground">Job Reminder</h3>
                <p class="text-xs text-muted-foreground">You have jobs to do this week</p>
              </div>
            </div>
            <button onClick={handleDismiss} class="text-muted-foreground hover:text-muted-foreground p-1 rounded-lg hover:bg-muted">
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-3">
            <For each={pending()}>
              {(a) => {
                const sched = scheduledDaysFor(a.job_title);
                const done = a.days_completed || [];
                return (
                  <div class="bg-muted rounded-xl p-3 border border-border">
                    <p class="font-semibold text-foreground text-sm mb-1.5">{a.job_title}</p>
                    <p class="text-xs text-muted-foreground mb-2">Do it on these days:</p>
                    <div class="flex gap-1.5 flex-wrap">
                      <Index each={sched}>
                        {(day) => (
                          <span class={`text-xs font-bold px-2.5 py-1 rounded-lg ${done.includes(day()) ? "bg-green-100 text-green-700" : "bg-primary/10 text-primary"}`}>
                            {done.includes(day()) ? "✓ " : ""}{day().slice(0, 3)}
                          </span>
                        )}
                      </Index>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>

          <button
            onClick={handleDismiss}
            class="w-full mt-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-bold hover:bg-primary/90 transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </Show>
  );
}
