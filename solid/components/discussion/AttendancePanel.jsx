import { createSignal, createEffect, on, createMemo, Show, For } from "solid-js";
import { createStore, produce } from "solid-js/store";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { UserCheck, UserPlus, RefreshCw } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { displayName } from "@/lib/names";
import { dedupeByIdentity } from "@/lib/memberIdentity";
import { Button, Input } from "~/components/ui";
import { Select } from "~/components/ui/select";
import { JapaneseText } from "~/components/primitives";

/** Teachers default absent (depends on the day) — except Ms Claudia, always present. */
export function defaultPresent(m) {
  if (m.role === "teacher") return /claudia/i.test(m.name);
  return true;
}

const KIND_OPTIONS = [
  { value: "student", label: "Student" },
  { value: "teacher", label: "Teacher" },
  { value: "guest", label: "Guest" },
  { value: "other", label: "Other" },
];

/*
 * AttendancePanel — Solid port from src/components/DiscussionWidget.jsx.
 *
 * Behaviour is 1:1, including the "seed once" rule: attendance is hydrated
 * from the server record exactly once, then left alone. Re-seeding on every
 * query settle would stamp over ticks the user just made while the request was
 * in flight — the React version guards this with an attLoaded flag and this
 * port keeps that guard rather than relying on effect timing.
 *
 * Attendance is a STORE rather than a signal holding an object: ticking one
 * person updates that one checkbox instead of re-rendering the whole roster,
 * which matters here because the roster is ~58 people.
 */
export default function AttendancePanel(props) {
  const queryClient = useQueryClient();
  const [attendance, setAttendance] = createStore({});
  const [guests, setGuests] = createSignal([]);
  const [showAdd, setShowAdd] = createSignal(false);
  const [newName, setNewName] = createSignal("");
  const [newKind, setNewKind] = createSignal("student");
  const [newOtherType, setNewOtherType] = createSignal("");
  const [replacementChair, setReplacementChair] = createSignal("");
  const [replacementMinutes, setReplacementMinutes] = createSignal("");
  let attLoaded = false;

  const members = () => props.members || [];

  const attendanceQuery = useQuery(() => ({
    queryKey: ["attendance", props.weekLabel],
    queryFn: () => base44.entities.Attendance.filter({ week_label: props.weekLabel }),
    enabled: !!props.weekLabel,
  }));

  createEffect(() => {
    const records = attendanceQuery.data || [];
    if (attLoaded || members().length === 0) return;
    if (records.length > 0) {
      const rec = records[0];
      setAttendance(produce((a) => {
        for (const m of members()) {
          if (rec.present_names?.includes(m.name)) a[m.id] = true;
        }
      }));
    }
    attLoaded = true;
  });

  const computePresentNames = (att) =>
    members().filter((m) => (m.id in att ? att[m.id] : defaultPresent(m))).map((m) => m.name);

  const upsertAttendance = (att) => {
    if (!props.weekLabel) return;
    const presentNames = computePresentNames(att);
    base44.entities.Attendance.filter({ week_label: props.weekLabel })
      .then((existing) => {
        if (existing.length > 0) {
          base44.entities.Attendance.update(existing[0].id, { present_names: presentNames });
        } else {
          base44.entities.Attendance.create({ week_label: props.weekLabel, present_names: presentNames });
        }
        queryClient.invalidateQueries({ queryKey: ["attendance"] });
      })
      .catch(() => {});
  };

  const isPresent = (m) => (m.id in attendance ? attendance[m.id] : defaultPresent(m));

  const toggle = (m) => {
    const next = !isPresent(m);
    setAttendance(m.id, next);
    upsertAttendance({ ...attendance, [m.id]: next });
  };

  const setRoleAway = (person) => {
    const next = attendance[person.id] === false ? true : false;
    setAttendance(person.id, next);
    upsertAttendance({ ...attendance, [person.id]: next });
  };

  const addMember = useMutation(() => ({
    mutationFn: (data) => base44.entities.Member.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  }));

  const handleAddPerson = () => {
    const name = newName().trim();
    if (!name) return;
    if (newKind() === "guest" || newKind() === "other") {
      const label = newKind() === "other" && newOtherType().trim() ? newOtherType().trim() : "Guest";
      setGuests((g) => [...g, { id: `guest-${Date.now()}`, name, role: "guest", custom_type: label }]);
      setNewOtherType("");
    } else {
      addMember.mutate({ name, role: newKind() });
    }
    setNewName("");
    setShowAdd(false);
  };

  const chair = () => members().find((m) => m.role === "chair");
  const minutes = () => members().find((m) => m.role === "minutes");
  const chairAbsent = () => chair() && attendance[chair().id] === false;
  const minutesAbsent = () => minutes() && attendance[minutes().id] === false;

  // Collapse duplicate rows for one person (email first, name as fallback)
  // keeping their highest-ranked role, so a stray student row can never hide
  // the real chair/minutes holder from the attendance list.
  const allPeople = createMemo(() => [...dedupeByIdentity(members()), ...guests()]);
  const presentCount = () => allPeople().filter((m) => isPresent(m)).length;

  const teachers = createMemo(() =>
    allPeople()
      .filter((m) => m.role === "teacher")
      .sort((a, b) => {
        const aC = /claudia/i.test(a.name) ? 0 : 1;
        const bC = /claudia/i.test(b.name) ? 0 : 1;
        if (aC !== bC) return aC - bC;
        return displayName(a).localeCompare(displayName(b));
      }));

  const students = createMemo(() =>
    allPeople()
      .filter((m) => m.role !== "chair" && m.role !== "minutes" && m.role !== "teacher")
      .sort((a, b) => displayName(a).localeCompare(displayName(b))));

  const replacementOptions = (excludeId) =>
    dedupeByIdentity(members())
      .filter((m) => m.id !== excludeId)
      .map((m) => ({ value: m.name, label: m.name }));

  return (
    <div class="mabis-widget bg-card rounded-2xl border border-border overflow-hidden">
      <div class="flex flex-col gap-2 border-b border-border bg-muted px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div class="flex items-center gap-2">
          <UserCheck class="w-4 h-4 text-primary" />
          <span class="font-semibold text-sm text-foreground">
            <JapaneseText ja="出席" layout="inline" japaneseClass="ml-1.5 inline text-[0.85em]">Attendance</JapaneseText>
          </span>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-xs text-muted-foreground font-medium">{presentCount()} / {allPeople().length} present</span>
          <button
            onClick={() => setShowAdd((s) => !s)}
            class="flex items-center gap-1 text-[11px] font-semibold text-primary hover:bg-primary/5 px-2 py-1 rounded-lg border border-primary/30"
          >
            <UserPlus class="w-3 h-3" /> Add
          </button>
        </div>
      </div>

      <div class="p-4">
        <Show when={showAdd()}>
          <div class="flex flex-wrap items-center gap-2 mb-4 p-3 bg-muted border border-border rounded-xl">
            <Input
              placeholder="Name..."
              value={newName()}
              onInput={(e) => setNewName(e.currentTarget.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddPerson()}
              class="rounded-lg border-border bg-card h-9 w-full flex-1 min-w-0 text-sm sm:min-w-[140px]"
            />
            <Select
              value={newKind()}
              onChange={setNewKind}
              options={KIND_OPTIONS}
              aria-label="Person type"
              triggerClass="h-9 w-full rounded-lg bg-card text-sm sm:w-28"
            />
            <Show when={newKind() === "other"}>
              <Input
                placeholder="Type (e.g. Parent)..."
                value={newOtherType()}
                onInput={(e) => setNewOtherType(e.currentTarget.value)}
                class="rounded-lg border-border bg-card h-9 w-full text-sm sm:w-32"
              />
            </Show>
            <Button
              onClick={handleAddPerson}
              disabled={!newName().trim()}
              class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-9 text-sm"
            >
              Add
            </Button>
          </div>
        </Show>

        <Show when={chair() || minutes()}>
          <JapaneseText
            ja="司会はミーティングを進め、議事録係はみんなで決めたことを書きます。今日その人がいない場合は名前をタップしてください。"
            class="mb-2 block text-xs leading-[1.6] tracking-[0.02em] text-muted-foreground"
            japaneseClass="mt-1 block text-[0.9em]"
          >
            The Chair leads the meeting and Minutes writes down what everyone decides. Tap a name if that person is away today.
          </JapaneseText>
        </Show>

        <div class="flex flex-wrap gap-2 mb-4">
          <For each={[["chair", chair(), "--role-chair", "Chair"], ["minutes", minutes(), "--role-minutes", "Minutes"]]}>
            {([, person, token, label]) => (
              <Show when={person}>
                {(p) => {
                  const away = () => attendance[p().id] === false;
                  return (
                    <button
                      type="button"
                      aria-pressed={away()}
                      title={away() ? `Mark ${p().name} as here again` : `Mark ${p().name} as away today`}
                      class={`flex min-h-11 items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors select-none ${
                        away() ? "bg-destructive/10 border-destructive/30 text-destructive line-through" : ""
                      }`}
                      style={away() ? {} : {
                        "background-color": `hsl(var(${token}) / 0.15)`,
                        "border-color": `hsl(var(${token}) / 0.35)`,
                        color: `hsl(var(${token}))`,
                      }}
                      onClick={() => setRoleAway(p())}
                    >
                      {label}: {p().name}
                      <Show when={away()}><span class="ml-1 text-[10px]">AWAY</span></Show>
                    </button>
                  );
                }}
              </Show>
            )}
          </For>
        </div>

        <Show when={chairAbsent() || minutesAbsent()}>
          <div class="mb-4 space-y-2 p-3 bg-secondary/10 border border-secondary/40 rounded-xl">
            <p class="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <RefreshCw class="w-3.5 h-3.5" /> Someone needs to stand in
            </p>

            <Show when={chairAbsent()}>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span class="text-xs text-foreground font-medium sm:w-28 sm:shrink-0">Replacement Chair:</span>
                <Select
                  value={replacementChair()}
                  onChange={setReplacementChair}
                  options={replacementOptions(chair()?.id)}
                  placeholder="Pick someone..."
                  aria-label="Replacement chair"
                  triggerClass="h-8 text-xs rounded-lg flex-1 bg-card border-secondary/40"
                />
                <Show when={replacementChair()}>
                  <span class="text-xs font-semibold text-primary">{replacementChair()}</span>
                </Show>
              </div>
            </Show>

            <Show when={minutesAbsent()}>
              <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
                <span class="text-xs text-foreground font-medium sm:w-28 sm:shrink-0">Replacement Minutes:</span>
                <Select
                  value={replacementMinutes()}
                  onChange={setReplacementMinutes}
                  options={replacementOptions(minutes()?.id)}
                  placeholder="Pick someone..."
                  aria-label="Replacement minutes taker"
                  triggerClass="h-8 text-xs rounded-lg flex-1 bg-card border-secondary/40"
                />
                <Show when={replacementMinutes()}>
                  <span class="text-xs font-semibold text-primary">{replacementMinutes()}</span>
                </Show>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={teachers().length > 0}>
          <div class="mb-4">
            <p class="text-[10px] font-bold text-role-teacher uppercase tracking-wide mb-1.5">Teachers</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <For each={teachers()}>
                {(m) => <PersonTick member={m} present={isPresent(m)} onToggle={() => toggle(m)} accent="teacher" />}
              </For>
            </div>
          </div>
        </Show>

        <Show when={students().length > 0}>
          <div>
            <p class="text-[10px] font-bold text-primary uppercase tracking-wide mb-1.5">Students</p>
            <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <For each={students()}>
                {(m) => <PersonTick member={m} present={isPresent(m)} onToggle={() => toggle(m)} accent="student" />}
              </For>
            </div>
          </div>
        </Show>
      </div>
    </div>
  );
}

function PersonTick(props) {
  const label = () =>
    props.member.role === "guest"
      ? `${props.member.name} (${props.member.custom_type || "Guest"})`
      : displayName(props.member);

  return (
    <label
      class={`flex items-center gap-2 px-2.5 py-2 rounded-lg border cursor-pointer transition-all select-none ${
        props.present
          ? `bg-role-${props.accent}/10 border-role-${props.accent}/30`
          : "bg-destructive/10 border-destructive/30 opacity-60"
      }`}
    >
      <input
        type="checkbox"
        checked={props.present}
        onChange={() => props.onToggle()}
        class={`w-3.5 h-3.5 rounded shrink-0 ${props.accent === "teacher" ? "accent-role-teacher" : "accent-primary"}`}
      />
      <span class={`text-xs font-medium truncate ${props.present ? "text-foreground" : "text-muted-foreground line-through"}`}>
        {label()}
      </span>
    </label>
  );
}
