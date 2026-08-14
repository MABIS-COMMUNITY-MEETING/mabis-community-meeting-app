import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Shield, Pencil, BookOpen, GraduationCap, Gavel, ClipboardList, Check } from "lucide-react";

const PREVIEW_ROLES = [
  { key: "student", label: "Student", icon: GraduationCap, colorVar: "--role-student" },
  { key: "teacher", label: "Teacher", icon: BookOpen, colorVar: "--role-teacher" },
  { key: "chair", label: "Chair", icon: Gavel, colorVar: "--role-chair" },
  { key: "minutes", label: "Minutes", icon: ClipboardList, colorVar: "--role-minutes" },
  { key: "editor", label: "Editor", icon: Pencil, colorVar: "--role-editor" },
  { key: "admin", label: "Admin", icon: Shield, colorVar: "--role-admin" },
];

export default function RolePreviewToggle({ value, onChange, realRole }) {
  const [open, setOpen] = useState(false);
  const active = !!value && value !== realRole;
  const activeRole = PREVIEW_ROLES.find(r => r.key === value);
  const activeColor = activeRole ? `hsl(var(${activeRole.colorVar}))` : "hsl(var(--primary))";

  const handleSelect = (key) => {
    onChange(key === realRole ? "" : key);
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
        style={active ? { borderColor: activeColor, color: activeColor } : undefined}
        title={active ? `Viewing as ${activeRole?.label}` : "Preview the app as another role"}
      >
        {active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4 text-muted-foreground" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 bg-card rounded-xl shadow-xl border border-border p-1.5 z-50 w-44"
            >
              <p className="px-2 pt-1 pb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Preview as role</p>
              {PREVIEW_ROLES.map(r => {
                const Icon = r.icon;
                const isActive = value === r.key || (!value && r.key === realRole);
                const color = `hsl(var(${r.colorVar}))`;
                return (
                  <motion.button
                    key={r.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelect(r.key)}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors text-muted-foreground hover:bg-muted"
                    style={isActive ? { backgroundColor: color, color: "white" } : {}}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {r.label}
                    {isActive && <Check className="w-3 h-3 ml-auto" />}
                  </motion.button>
                );
              })}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}