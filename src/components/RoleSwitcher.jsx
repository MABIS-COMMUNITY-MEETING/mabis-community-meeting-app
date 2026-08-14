import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Pencil, GraduationCap, ChevronDown, Check, BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";

const ROLES = [
  { key: "admin", label: "Admin", icon: Shield, colorVar: "--role-admin" },
  { key: "editor", label: "Editor", icon: Pencil, colorVar: "--role-editor" },
  { key: "teacher", label: "Teacher", icon: BookOpen, colorVar: "--role-teacher" },
  { key: "student", label: "Student", icon: GraduationCap, colorVar: "--role-student" },
];

export default function RoleSwitcher() {
  const { user, updateUser } = useAuth();
  const [open, setOpen] = useState(false);
  const effectiveRole = user?.role_override || user?.role;
  const currentRole = ROLES.find(r => r.key === effectiveRole) || ROLES[2];
  const CurrentIcon = currentRole.icon;
  const currentColor = `hsl(var(${currentRole.colorVar}))`;

  const handleSwitch = async (role) => {
    try {
      // role is a built-in that can't be overridden via updateMe; use a custom role_override field
      await base44.auth.updateMe({ role_override: role });
      await updateUser?.();
    } catch (e) {
      try { await base44.entities.User.update(user.id, { role }); await updateUser?.(); } catch {}
    }
    setOpen(false);
  };

  return (
    <div className="relative">
      <motion.button
        onClick={() => setOpen(!open)}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border-2 text-xs font-bold transition-all hover:scale-105"
        style={{ borderColor: currentColor, color: currentColor, backgroundColor: `${currentColor}15` }}
      >
        <CurrentIcon className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">{currentRole.label}</span>
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              className="absolute top-full right-0 mt-2 bg-card rounded-xl shadow-xl border border-border p-1.5 z-50 w-36"
            >
              {ROLES.map(r => {
                const Icon = r.icon;
                const isActive = effectiveRole === r.key;
                const color = `hsl(var(${r.colorVar}))`;
                return (
                  <motion.button
                    key={r.key}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSwitch(r.key)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${isActive ? "text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
                    style={isActive ? { backgroundColor: color } : {}}
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