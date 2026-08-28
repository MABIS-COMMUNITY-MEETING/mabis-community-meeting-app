import { createSignal, createMemo, createEffect, onMount, onCleanup, Show, For, Index } from "solid-js";
import { useMutation, useQueryClient } from "@tanstack/solid-query";
import { Plus, Users, UserMinus, Maximize2, X } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { displayName } from "@/lib/names";
import { useActivePresence } from "~/lib/usePresence";
import { MEMBER_QUERY_KEY } from "~/lib/members-query";
import { Button, Input } from "~/components/ui";
import { Select } from "~/components/ui/select";
import { JapaneseText } from "~/components/primitives";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

const ROLE_CONFIG = {
  student: { label: "Student",       ja: "生徒",     roleVar: "--role-student", note: "On Wheel" },
  teacher: { label: "Teacher",       ja: "先生",     roleVar: "--role-teacher", note: "Not on Wheel" },
  chair:   { label: "Meeting Chair", ja: "司会",     roleVar: "--role-chair",   note: "Meeting Chair" },
  minutes: { label: "Minutes Taker", ja: "議事録係", roleVar: "--role-minutes", note: "Minutes Taker" },
  admin:   { label: "Admin",         ja: "管理者",   roleVar: "--role-admin",   note: "App Admin" },
  editor:  { label: "Editor",        ja: "編集者",   roleVar: "--role-editor",  note: "Can Edit Content" },
};

const ROLE_OPTIONS = Object.entries(ROLE_CONFIG).map(([value, c]) => ({ value, label: c.label }));

const MEMBER_RENDER_ORDER = ["chair", "minutes", "admin", "editor", "student", "teacher"];
const FIRST_MEMBER_ROWS = 24;
const MEMBER_ROW_BATCH = 24;

/*
 * Run after the browser has had a rendering opportunity. The timer after rAF
 * matters: promise continuations inside rAF still run before paint.
 */
function afterNextPaint(fn) {
  let frame = 0;
  let timer = 0;
  let cancelled = false;
  const run = () => {
    if (!cancelled) fn();
  };

  if (typeof document === "undefined" || document.hidden
      || typeof requestAnimationFrame !== "function") {
    timer = setTimeout(run, 0);
  } else {
    frame = requestAnimationFrame(() => {
      frame = 0;
      timer = setTimeout(run, 0);
    });
  }

  return () => {
    cancelled = true;
    if (frame) cancelAnimationFrame(frame);
    if (timer) clearTimeout(timer);
  };
}

/*
 * MembersWidget — Solid port of src/components/MembersWidget.jsx.
 *
 * The React file carries this comment on MemberRow:
 *
 *   "Moved OUTSIDE the component so React keeps stable component identity
 *    (prevents remount/re-animate flashing on every keystroke in the add form)"
 *
 * That hazard does not exist here. A Solid component body runs once, so a
 * nested component definition is never re-created and nothing can remount from
 * a keystroke. MemberRow stays at module scope anyway — it reads better — but
 * for organisation, not to dodge a re-render bug.
 */
function MemberRow(props) {
  const cfg = () => ROLE_CONFIG[props.currentRole] || ROLE_CONFIG.student;

  const otherRoles = () =>
    Object.keys(ROLE_CONFIG)
      .filter((r) =>
        r !== props.currentRole
        && !(props.currentRole === "student" && r === "teacher")
        && !(props.currentRole === "teacher" && r === "student"))
      .map((r) => ({ value: r, label: ROLE_CONFIG[r].label }));

  return (
    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-2 p-2.5 rounded-xl bg-muted hover:bg-muted transition-colors group">
      <div
        class="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-card"
        style={{ border: `3px solid hsl(var(${cfg().roleVar}))`, "box-sizing": "border-box" }}
      >
        <Show
          when={props.m.avatar_url}
          fallback={<img src={MABIS_LOGO} alt="" class="w-full h-full object-contain p-0.5" />}
        >
          <img src={props.m.avatar_url} alt="" loading="lazy" class="w-full h-full object-cover" />
        </Show>
      </div>

      <div class="flex-1 min-w-[6rem]">
        <p class="text-sm font-medium text-foreground truncate">{displayName(props.m)}</p>
        <Show when={props.m.email}>
          <p class="text-[11px] text-muted-foreground truncate">{props.m.email}</p>
        </Show>
      </div>

      <Show when={props.canChangeRoles}>
        <div class="flex items-center gap-1 ml-auto shrink-0">
          <Select
            value=""
            onChange={(role) => role && props.onRoleChange(props.m.id, role)}
            options={otherRoles()}
            placeholder="Move →"
            aria-label={`Change role for ${displayName(props.m)}`}
            triggerClass="h-6 text-[10px] w-20 rounded border-border px-1.5 py-0"
          />
          <button
            title={`Remove ${displayName(props.m)}`}
            aria-label={`Remove ${displayName(props.m)}`}
            onClick={() => {
              if (window.confirm(`Remove ${displayName(props.m)} from members?`)) props.onDelete(props.m.id);
            }}
            class="p-1.5 rounded-lg text-destructive bg-destructive/10 hover:bg-destructive/20 transition-colors shrink-0"
          >
            <UserMinus class="w-4 h-4" />
          </button>
        </div>
      </Show>

      <Show when={props.isActive}>
        <span class="shrink-0 relative inline-flex items-center justify-center w-2.5 h-2.5" title="Active">
          <span class="absolute inset-0 rounded-full bg-primary animate-soft-ping" />
          <span class="relative w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
        </span>
      </Show>
    </div>
  );
}

function SectionHeader(props) {
  const cfg = () => ROLE_CONFIG[props.role];
  return (
    <div class="flex items-center gap-2 mb-2">
      <span class="w-2 h-2 rounded-full" style={{ "background-color": `hsl(var(${cfg().roleVar}))` }} />
      <p class="text-xs font-bold text-muted-foreground uppercase tracking-wide">
        <JapaneseText ja={cfg().ja} layout="inline" japaneseClass="ml-1 inline normal-case tracking-normal text-[0.9em]">
          {cfg().label}s
        </JapaneseText>
      </p>
      <span class="ml-auto text-xs text-muted-foreground">{props.count}</span>
    </div>
  );
}

/** Pick a member from a list, then remove them — alternative to the per-row icon. */
function RemoveMemberPanel(props) {
  const [selectedId, setSelectedId] = createSignal("");
  const selected = () => props.members.find((m) => m.id === selectedId());

  const handleRemove = () => {
    const m = selected();
    if (!m) return;
    if (!window.confirm(`Remove ${displayName(m)} from members?`)) return;
    props.onDelete(m.id);
    setSelectedId("");
  };

  return (
    <div class="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <Select
        value={selectedId()}
        onChange={setSelectedId}
        options={props.members.map((m) => ({ value: m.id, label: displayName(m) }))}
        placeholder="Select a member to remove..."
        aria-label="Select a member to remove"
        triggerClass="w-full min-w-0 flex-1 rounded-xl border-border sm:min-w-[180px]"
      />
      <Button
        onClick={handleRemove}
        disabled={!selected()}
        class="w-full shrink-0 gap-1.5 rounded-xl bg-destructive text-primary-foreground hover:bg-destructive/90 sm:w-auto"
      >
        <UserMinus class="w-4 h-4" /> Remove
      </Button>
    </div>
  );
}

export default function MembersWidget(props) {
  const queryClient = useQueryClient();
  const [presenceReady, setPresenceReady] = createSignal(false);
  const activeEmails = useActivePresence(presenceReady);

  const [name, setName] = createSignal("");
  const [email, setEmail] = createSignal("");
  const [newRole, setNewRole] = createSignal("student");
  const [fullscreen, setFullscreen] = createSignal(false);
  const [renderLimit, setRenderLimit] = createSignal(FIRST_MEMBER_ROWS);

  /*
   * Home owns the roster query and passes the same cached array to every
   * widget. Creating a second observer here added setup work while giving
   * Members no data that Home had not already fetched.
   */
  const members = () => Array.isArray(props.members) ? props.members : [];

  /*
   * Active dots are supplemental. Starting their query and realtime transport
   * while 57 member rows are mounting makes the first useful paint compete
   * with work nobody can see yet, so let the roster paint first.
   */
  let stopPresenceStart = () => {};
  onMount(() => {
    stopPresenceStart = afterNextPaint(() => {
      stopPresenceStart = afterNextPaint(() => setPresenceReady(true));
    });
  });
  onCleanup(() => stopPresenceStart());

  const add = useMutation(() => ({
    // Granting a second permanent role adds a NEW row for the same person. A
    // fresh row has no avatar of its own, so without carrying it over the new
    // role silently reverts to the default logo even though that person
    // already has a custom picture on their other row.
    mutationFn: (data) => {
      const existing = members().find((m) =>
        m.email && data.email
        && m.email.toLowerCase() === data.email.toLowerCase()
        && (m.avatar_url || m.avatar_color));
      return base44.entities.Member.create(
        existing ? { ...data, avatar_url: existing.avatar_url, avatar_color: existing.avatar_color } : data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MEMBER_QUERY_KEY });
      setName(""); setEmail(""); setNewRole("student");
    },
  }));

  const remove = useMutation(() => ({
    mutationFn: (id) => base44.entities.Member.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  }));

  const updateRole = useMutation(() => ({
    mutationFn: ({ id, role }) => base44.entities.Member.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  }));

  const handleRoleChange = (id, role) => updateRole.mutate({ id, role });
  const handleDelete = (id) => remove.mutate(id);

  const sortTeachers = (list) => [...list].sort((a, b) => {
    const aC = /claudia/i.test(a.name) ? 0 : 1;
    const bC = /claudia/i.test(b.name) ? 0 : 1;
    if (aC !== bC) return aC - bC;
    return displayName(a).localeCompare(displayName(b));
  });
  const sortStudents = (list) => [...list].sort((a, b) => displayName(a).localeCompare(displayName(b)));

  const grouped = createMemo(() => ({
    student: sortStudents(members().filter((m) => !m.role || m.role === "student")),
    teacher: sortTeachers(members().filter((m) => m.role === "teacher")),
    chair:   members().filter((m) => m.role === "chair"),
    minutes: members().filter((m) => m.role === "minutes"),
    admin:   members().filter((m) => m.role === "admin"),
    editor:  members().filter((m) => m.role === "editor"),
  }));

  /*
   * The old render mounted the entire roster, including one Kobalte Select
   * state machine per editable row, in a single task. Paint the first 24 rows
   * immediately, then add bounded batches after successive paints. Counts,
   * ordering, controls, and data stay identical; only the scheduling changes.
   */
  createEffect(() => {
    const total = members().length;
    let rendered = Math.min(total, FIRST_MEMBER_ROWS);
    let stop = () => {};
    setRenderLimit(rendered);

    const append = () => {
      rendered = Math.min(total, rendered + MEMBER_ROW_BATCH);
      setRenderLimit(rendered);
      if (rendered < total) stop = afterNextPaint(append);
    };

    if (rendered < total) stop = afterNextPaint(append);
    onCleanup(() => stop());
  });

  const visibleGrouped = createMemo(() => {
    let remaining = renderLimit();
    const visible = {};
    for (const role of MEMBER_RENDER_ORDER) {
      const list = grouped()[role];
      visible[role] = list.slice(0, remaining);
      remaining = Math.max(0, remaining - list.length);
    }
    return visible;
  });

  const isActive = (m) => activeEmails().has((m.email || "").toLowerCase());

  return (
    <div class={`mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${fullscreen() ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div class="mabis-widget-header bg-primary px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div class="min-w-0">
          <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl flex items-center gap-2">
            <Users class="w-5 h-5" /> Community Members
          </h2>
          <JapaneseText
            ja={`${members().length}人のメンバー`}
            class="block text-primary-foreground-muted text-xs mt-0.5"
            japaneseClass="block mt-0.5 text-[0.9em]"
          >
            {members().length} members
          </JapaneseText>
        </div>
        <div class="mabis-widget-actions flex items-center flex-wrap gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
            onClick={() => setFullscreen((f) => !f)}
          >
            <Show when={fullscreen()} fallback={<Maximize2 class="w-3.5 h-3.5" />}>
              <X class="w-3.5 h-3.5" /> Close
            </Show>
          </Button>
        </div>
      </div>

      <div class="mabis-widget-body p-4 space-y-5 sm:p-5">
        <Show when={props.isAdmin}>
          <div class="pb-4 border-b border-border space-y-2">
            <div class="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
              <Input
                placeholder="Full name..."
                value={name()}
                onInput={(e) => setName(e.currentTarget.value)}
                class="rounded-xl border-border flex-1 min-w-0 sm:min-w-[130px]"
              />
              <Input
                placeholder="Email..."
                value={email()}
                onInput={(e) => setEmail(e.currentTarget.value)}
                class="rounded-xl border-border flex-1 min-w-0 sm:min-w-[130px]"
              />
              <Select
                value={newRole()}
                onChange={setNewRole}
                options={ROLE_OPTIONS}
                aria-label="Role for new member"
                triggerClass="w-full rounded-xl border-border sm:w-28"
              />
              <Button
                onClick={() => add.mutate({ name: name().trim(), email: email().trim(), role: newRole() })}
                disabled={!name().trim() || add.isPending}
                class="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shrink-0 sm:w-auto"
                aria-label="Add member"
              >
                <Plus class="w-4 h-4" />
              </Button>
            </div>
            <RemoveMemberPanel members={members()} onDelete={handleDelete} />
          </div>
        </Show>

        {/* Special roles */}
        <div class="grid sm:grid-cols-2 gap-5">
          <Index each={["chair", "minutes", "admin", "editor"]}>
            {(role) => (
              <div>
                <SectionHeader role={role()} count={grouped()[role()].length} />
                <div class="space-y-1.5">
                  <Show when={grouped()[role()].length === 0}>
                    <p class="text-muted-foreground text-xs py-1.5">None assigned</p>
                  </Show>
                  <For each={visibleGrouped()[role()]}>
                    {(m) => (
                      <MemberRow
                        m={m}
                        currentRole={role()}
                        canChangeRoles={props.canChangeRoles}
                        isActive={isActive(m)}
                        onRoleChange={handleRoleChange}
                        onDelete={handleDelete}
                      />
                    )}
                  </For>
                </div>
              </div>
            )}
          </Index>
        </div>

        <div class="border-t border-border" />

        <Index each={["student", "teacher"]}>
          {(role) => (
            <div>
              <SectionHeader role={role()} count={grouped()[role()].length} />
              <div class="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-1.5">
                <Show when={grouped()[role()].length === 0}>
                  <p class="text-muted-foreground text-xs py-1.5 col-span-2">None yet</p>
                </Show>
                <For each={visibleGrouped()[role()]}>
                  {(m) => (
                    <MemberRow
                      m={m}
                      currentRole={role()}
                      canChangeRoles={props.canChangeRoles}
                      isActive={isActive(m)}
                      onRoleChange={handleRoleChange}
                      onDelete={handleDelete}
                    />
                  )}
                </For>
              </div>
            </div>
          )}
        </Index>
      </div>
    </div>
  );
}
