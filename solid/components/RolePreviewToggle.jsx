import { createSignal, Index, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Eye, EyeOff, Shield, Pencil, BookOpen, GraduationCap, Gavel, ClipboardList, Check } from "lucide-solid";

const PREVIEW_ROLES = [
  { key: "student", label: "Student", icon: GraduationCap, colorVar: "--role-student" },
  { key: "teacher", label: "Teacher", icon: BookOpen, colorVar: "--role-teacher" },
  { key: "chair", label: "Chair", icon: Gavel, colorVar: "--role-chair" },
  { key: "minutes", label: "Minutes", icon: ClipboardList, colorVar: "--role-minutes" },
  { key: "editor", label: "Editor", icon: Pencil, colorVar: "--role-editor" },
  { key: "admin", label: "Admin", icon: Shield, colorVar: "--role-admin" },
];

/** Preview-as-role control — 1:1 port of src/components/RolePreviewToggle.jsx. */
export default function RolePreviewToggle(props) {
  const [open, setOpen] = createSignal(false);

  const active = () => !!props.value && props.value !== props.realRole;
  const activeRole = () => PREVIEW_ROLES.find((r) => r.key === props.value);
  const activeColor = () => (activeRole() ? `hsl(var(${activeRole().colorVar}))` : "hsl(var(--primary))");

  const handleSelect = (key) => {
    props.onChange(key === props.realRole ? "" : key);
    setOpen(false);
  };

  return (
    <div class="relative">
      <button
        onClick={() => setOpen(!open())}
        class="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
        style={active() ? { "border-color": activeColor(), color: activeColor() } : undefined}
        title={active() ? `Viewing as ${activeRole()?.label}` : "Preview the app as another role"}
      >
        <Show when={active()} fallback={<Eye class="w-4 h-4 text-muted-foreground" />}><EyeOff class="w-4 h-4" /></Show>
      </button>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div class="dropdown-pop absolute top-full right-0 mt-2 bg-card rounded-xl shadow-xl border border-border p-1.5 z-50 w-44">
          <p class="px-2 pt-1 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Preview as role</p>
          <Index each={PREVIEW_ROLES}>
            {(r) => {
              const isActive = () => props.value === r().key || (!props.value && r().key === props.realRole);
              const color = () => `hsl(var(${r().colorVar}))`;
              return (
                <button
                  onClick={() => handleSelect(r().key)}
                  class="tap-95 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-muted-foreground hover:bg-muted"
                  style={isActive() ? { "background-color": color(), color: "white" } : {}}
                >
                  <Dynamic component={r().icon} class="w-3.5 h-3.5" />
                  {r().label}
                  <Show when={isActive()}><Check class="w-3 h-3 ml-auto" /></Show>
                </button>
              );
            }}
          </Index>
        </div>
      </Show>
    </div>
  );
}
