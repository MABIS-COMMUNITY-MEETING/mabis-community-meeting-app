import { createSignal, Index, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Shield, Pencil, GraduationCap, ChevronDown, Check, BookOpen } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { useAuth } from "~/lib/AuthContext";

const ROLES = [
  { key: "admin", label: "Admin", icon: Shield, colorVar: "--role-admin" },
  { key: "editor", label: "Editor", icon: Pencil, colorVar: "--role-editor" },
  { key: "teacher", label: "Teacher", icon: BookOpen, colorVar: "--role-teacher" },
  { key: "student", label: "Student", icon: GraduationCap, colorVar: "--role-student" },
];

/** Role switcher — 1:1 port of src/components/RoleSwitcher.jsx. */
export default function RoleSwitcher() {
  const auth = useAuth();
  const [open, setOpen] = createSignal(false);

  const effectiveRole = () => auth.user()?.role_override || auth.user()?.role;
  const currentRole = () => ROLES.find((r) => r.key === effectiveRole()) || ROLES[2];
  const currentColor = () => `hsl(var(${currentRole().colorVar}))`;

  const handleSwitch = async (role) => {
    try {
      // role is a built-in that can't be overridden via updateMe; use a custom
      // role_override field
      await base44.auth.updateMe({ role_override: role });
      await auth.updateUser?.();
    } catch {
      try {
        await base44.entities.User.update(auth.user().id, { role });
        await auth.updateUser?.();
      } catch { /* ignore */ }
    }
    setOpen(false);
  };

  return (
    <div class="relative">
      <button
        onClick={() => setOpen(!open())}
        class="tap-95 flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all hover:scale-105"
        style={{ "border-color": currentColor(), color: currentColor(), "background-color": `${currentColor()}15` }}
      >
        <Dynamic component={currentRole().icon} class="w-3.5 h-3.5" />
        <span class="hidden sm:inline">{currentRole().label}</span>
        <ChevronDown class={`w-3 h-3 transition-transform ${open() ? "rotate-180" : ""}`} />
      </button>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div class="dropdown-pop absolute top-full right-0 mt-2 bg-card rounded-xl shadow-xl border border-border p-1.5 z-50 w-36">
          <Index each={ROLES}>
            {(r) => {
              const isActive = () => effectiveRole() === r().key;
              const color = () => `hsl(var(${r().colorVar}))`;
              return (
                <button
                  onClick={() => handleSwitch(r().key)}
                  class={`tap-95 w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isActive() ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                  style={isActive() ? { "background-color": color() } : {}}
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
