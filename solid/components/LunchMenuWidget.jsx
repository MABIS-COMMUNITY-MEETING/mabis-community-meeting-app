import { createSignal, createEffect, on, Show, For, Index } from "solid-js";
import { createStore } from "solid-js/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { UtensilsCrossed, Loader2, Save } from "lucide-solid";
import { isFriday, nextFriday, getISOWeek, getYear, format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { JapaneseText } from "~/components/primitives";

/*
 * LunchMenuWidget — Solid port of src/components/LunchMenuWidget.jsx.
 *
 * Reference port for the data layer: query + mutation + a local draft form.
 * Markup and classes are unchanged. Three things are done differently, and
 * each is a genuine improvement rather than a translation artefact:
 *
 * 1. The draft is a STORE, not a signal holding an object.
 *    The React version keeps the whole draft in one useState and replaces the
 *    object on every keystroke — so every keystroke re-renders all ten
 *    textareas. A Solid store is fine-grained: setDraft(field, value) notifies
 *    only the one textarea bound to that field. Typing cost stops scaling
 *    with the number of inputs on screen.
 *
 * 2. Query options are a FUNCTION.
 *    solid-query takes an accessor so it can re-run when reactive inputs
 *    change; passing a plain object would capture the first value forever.
 *
 * 3. <Index> rather than <For> for the five day cards.
 *    The list is fixed and never reorders, so the keyed reconciliation <For>
 *    carries is pure overhead. <Index> keeps the DOM and updates in place.
 */

const DAYS = [
  ["monday", "Mon", "月"],
  ["tuesday", "Tue", "火"],
  ["wednesday", "Wed", "水"],
  ["thursday", "Thu", "木"],
  ["friday", "Fri", "金"],
];

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function fridayOfCurrentWeek() {
  const today = new Date();
  return isFriday(today) ? today : nextFriday(today);
}

function emptyDraft() {
  const d = {};
  for (const [key] of DAYS) {
    d[`${key}_snack`] = "";
    d[`${key}_lunch`] = "";
  }
  return d;
}

export default function LunchMenuWidget(props) {
  const weekLabel = getCurrentWeekLabel();
  const queryClient = useQueryClient();
  const [draft, setDraft] = createStore(emptyDraft());

  const query = useQuery(() => ({
    queryKey: ["lunchmenu", weekLabel],
    queryFn: () => base44.entities.LunchMenu.filter({ week_label: weekLabel }),
  }));

  const record = () => query.data?.[0];

  // Re-seed the draft when a different record arrives (keyed on id, exactly
  // like the React effect) — not on every query settle, which would discard
  // whatever the admin is currently typing.
  createEffect(on(() => record()?.id, () => {
    const r = record();
    for (const [key] of DAYS) {
      setDraft(`${key}_snack`, r?.[`${key}_snack`] || "");
      setDraft(`${key}_lunch`, r?.[`${key}_lunch`] || "");
    }
  }));

  const upsert = useMutation(() => ({
    mutationFn: async (data) => {
      const r = record();
      if (r) return base44.entities.LunchMenu.update(r.id, data);
      return base44.entities.LunchMenu.create({ week_label: weekLabel, ...data });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lunchmenu"] }),
  }));

  const jaWeek = () =>
    `${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(fridayOfCurrentWeek())}の週`;

  return (
    <div class="mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div class="mabis-widget-header bg-primary px-4 py-4 flex items-center gap-3 sm:px-6">
        <UtensilsCrossed class="w-5 h-5 text-primary-foreground" />
        <div>
          <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Snacks &amp; Lunch</h2>
          <JapaneseText
            ja={jaWeek()}
            class="block text-primary-foreground-muted text-xs mt-0.5"
            japaneseClass="block mt-0.5 text-[0.9em]"
          >
            Week of {format(fridayOfCurrentWeek(), "d MMMM yyyy")}
          </JapaneseText>
        </div>
      </div>

      <div class="mabis-widget-body p-4 sm:p-5">
        <Show
          when={!query.isLoading}
          fallback={
            <div class="flex justify-center py-8">
              <Loader2 class="w-6 h-6 animate-spin text-primary" />
            </div>
          }
        >
          <div class="mobile-horizontal-scroll flex snap-x gap-3 overflow-x-auto pb-2 sm:grid sm:grid-cols-2 sm:overflow-visible sm:pb-0 md:grid-cols-5">
            <Index each={DAYS}>
              {(day) => {
                const key = () => day()[0];
                const label = () => day()[1];
                const ja = () => day()[2];
                return (
                  <div class="w-[82vw] max-w-[18rem] shrink-0 snap-start overflow-hidden rounded-xl border border-border sm:w-auto sm:max-w-none">
                    <div class="bg-primary/10 px-3 py-2 text-center">
                      <span class="text-xs font-bold text-primary uppercase tracking-wide">
                        <JapaneseText ja={ja()} layout="inline" japaneseClass="ml-1 inline text-[0.9em]">{label()}</JapaneseText>
                      </span>
                    </div>
                    <div class="p-3 space-y-2.5">
                      <Field
                        label="Snack"
                        ja="おやつ"
                        isAdmin={props.isAdmin}
                        value={draft[`${key()}_snack`]}
                        onInput={(v) => setDraft(`${key()}_snack`, v)}
                      />
                      <Field
                        label="Lunch"
                        ja="ランチ"
                        isAdmin={props.isAdmin}
                        value={draft[`${key()}_lunch`]}
                        onInput={(v) => setDraft(`${key()}_lunch`, v)}
                      />
                    </div>
                  </div>
                );
              }}
            </Index>
          </div>

          <Show when={props.isAdmin}>
            <div class="flex justify-stretch mt-4 sm:justify-end">
              <button
                onClick={() => upsert.mutate({ ...draft })}
                disabled={upsert.isPending}
                class="flex w-full items-center justify-center gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-semibold px-5 py-2 rounded-lg transition-colors disabled:opacity-60 sm:w-auto"
              >
                <Show when={upsert.isPending} fallback={<Save class="w-4 h-4" />}>
                  <Loader2 class="w-4 h-4 animate-spin" />
                </Show>
                <JapaneseText ja="メニューを保存" layout="inline" japaneseClass="ml-1.5 inline text-[0.85em]">Save Menu</JapaneseText>
              </button>
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}

function Field(props) {
  return (
    <div>
      <p class="text-[10px] font-semibold text-muted-foreground uppercase mb-1">
        <JapaneseText ja={props.ja} layout="inline" japaneseClass="ml-1 inline normal-case text-[0.9em]">{props.label}</JapaneseText>
      </p>
      <Show
        when={props.isAdmin}
        fallback={<p class="text-sm text-foreground min-h-[2.5rem] whitespace-pre-wrap">{props.value || "—"}</p>}
      >
        <textarea
          value={props.value || ""}
          onInput={(e) => props.onInput(e.currentTarget.value)}
          rows={2}
          placeholder="—"
          class="w-full text-sm rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground px-2.5 py-2 resize-none focus:outline-none focus:border-primary/50"
        />
      </Show>
    </div>
  );
}
