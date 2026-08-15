import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Users, UserMinus, Maximize2, X } from "lucide-react";
import { displayName } from "@/lib/names";
import { useActivePresence } from "@/hooks/usePresence";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import RemoveMemberPanel from "@/components/members/RemoveMemberPanel";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

const ROLE_CONFIG = {
  student:  { label: "Student",       roleVar: "--role-student",  note: "On Wheel" },
  teacher:  { label: "Teacher",       roleVar: "--role-teacher",  note: "Not on Wheel" },
  chair:    { label: "Meeting Chair", roleVar: "--role-chair",    note: "Meeting Chair" },
  minutes:  { label: "Minutes Taker", roleVar: "--role-minutes",  note: "Minutes Taker" },
  admin:    { label: "Admin",         roleVar: "--role-admin",    note: "App Admin" },
  editor:   { label: "Editor",        roleVar: "--role-editor",   note: "Can Edit Content" },
};

// ── Moved OUTSIDE the component so React keeps stable component identity ──
// (prevents remount/re-animate flashing on every keystroke in the add form)
function MemberRow({ m, currentRole, canChangeRoles, isActive, onRoleChange, onDelete }) {
  const cfg = ROLE_CONFIG[currentRole] || ROLE_CONFIG.student;
  const otherRoles = Object.keys(ROLE_CONFIG).filter(r => r !== currentRole && !(currentRole === "student" && r === "teacher") && !(currentRole === "teacher" && r === "student"));
  return (
    <motion.div key={m.id}
      initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9, height: 0 }}
      className="flex flex-wrap items-center gap-x-2.5 gap-y-2 p-2.5 rounded-xl bg-muted hover:bg-muted transition-colors group">
      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-card" style={{ border: `3px solid hsl(var(${cfg.roleVar}))`, boxSizing: "border-box" }}>
        {m.avatar_url
          ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
          : <img src={MABIS_LOGO} alt="" className="w-full h-full object-contain p-0.5" />}
      </div>
      <div className="flex-1 min-w-[6rem]">
        <p className="text-sm font-medium text-foreground truncate">{displayName(m)}</p>
        {m.email && <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>}
      </div>
      {canChangeRoles && (
        <div className="flex items-center gap-1 ml-auto shrink-0">
          <Select onValueChange={(role) => onRoleChange(m.id, role)}>
            <SelectTrigger className="h-6 text-[10px] w-20 rounded border-border px-1.5 py-0">
              <SelectValue placeholder="Move →" />
            </SelectTrigger>
            <SelectContent>
              {otherRoles.map(r => (
                <SelectItem key={r} value={r} className="text-xs">{ROLE_CONFIG[r].label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <button title={`Remove ${displayName(m)}`}
            onClick={() => { if (window.confirm(`Remove ${displayName(m)} from members?`)) onDelete(m.id); }}
            className="p-1.5 rounded-lg text-red-500 bg-red-50 hover:bg-red-100 transition-colors shrink-0">
            <UserMinus className="w-4 h-4" />
          </button>
        </div>
      )}
      {isActive && (
        <span className="shrink-0 relative inline-flex items-center justify-center w-2.5 h-2.5" title="Active">
          <span className="absolute inset-0 rounded-full bg-primary animate-soft-ping" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
        </span>
      )}
    </motion.div>
  );
}

function SectionHeader({ role, count }) {
  const cfg = ROLE_CONFIG[role];
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: `hsl(var(${cfg.roleVar}))` }} />
      <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">{cfg.label}s</p>
      <span className="ml-auto text-xs text-muted-foreground">{count}</span>
    </div>
  );
}

export default function MembersWidget({ isAdmin, canChangeRoles }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [newRole, setNewRole] = useState("student");
  const [fullscreen, setFullscreen] = useState(false);
  const queryClient = useQueryClient();
  const activeEmails = useActivePresence();

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 200),
    placeholderData: (prev) => prev,
  });

  const addMutation = useMutation({
    // Granting someone a second permanent role (e.g. an existing student
    // becoming an editor too) works by adding a brand-new row for the same
    // name/email under the new role — that's how Boss, Olivia, Summer and
    // Taas ended up with more than one row each. A fresh row starts with no
    // avatar_url/avatar_color of its own, so without this the new role would
    // silently go back to the default logo even though the person already
    // has a custom picture on their other row. Carry it over at creation time.
    mutationFn: (data) => {
      const existing = members.find(m => m.email && data.email && m.email.toLowerCase() === data.email.toLowerCase() && (m.avatar_url || m.avatar_color));
      return base44.entities.Member.create(existing ? { ...data, avatar_url: existing.avatar_url, avatar_color: existing.avatar_color } : data);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["members"] }); setName(""); setEmail(""); setNewRole("student"); },
  });
  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Member.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });
  const updateMemberRoleMutation = useMutation({
    mutationFn: ({ id, role }) => base44.entities.Member.update(id, { role }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const handleRoleChange = (id, role) => updateMemberRoleMutation.mutate({ id, role });
  const handleDelete = (id) => deleteMutation.mutate(id);

  const sortTeachers = (list) => [...list].sort((a, b) => {
    const aClaudia = /claudia/i.test(a.name) ? 0 : 1;
    const bClaudia = /claudia/i.test(b.name) ? 0 : 1;
    if (aClaudia !== bClaudia) return aClaudia - bClaudia;
    return displayName(a).localeCompare(displayName(b));
  });
  const sortStudents = (list) => [...list].sort((a, b) => displayName(a).localeCompare(displayName(b)));

  const grouped = {
    student: sortStudents(members.filter(m => !m.role || m.role === "student")),
    teacher: sortTeachers(members.filter(m => m.role === "teacher")),
    chair:   members.filter(m => m.role === "chair"),
    minutes: members.filter(m => m.role === "minutes"),
    admin:   members.filter(m => m.role === "admin"),
    editor:  members.filter(m => m.role === "editor"),
  };

  const renderAddForm = (defaultRole = "student") => (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
      <Input placeholder="Full name..." value={name} onChange={(e) => setName(e.target.value)}
        className="rounded-xl border-border flex-1 min-w-0 sm:min-w-[130px]" />
      <Input placeholder="Email..." value={email} onChange={(e) => setEmail(e.target.value)}
        className="rounded-xl border-border flex-1 min-w-0 sm:min-w-[130px]" />
      <Select value={newRole} onValueChange={setNewRole}>
        <SelectTrigger className="w-full rounded-xl border-border sm:w-28">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {Object.entries(ROLE_CONFIG).map(([r, c]) => (
            <SelectItem key={r} value={r}>{c.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={() => addMutation.mutate({ name: name.trim(), email: email.trim(), role: newRole })}
        disabled={!name.trim() || addMutation.isPending}
        className="w-full bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shrink-0 sm:w-auto">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className={`mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${fullscreen ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div className="mabis-widget-header bg-primary px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <h2 className="mabis-widget-title font-display font-bold text-primary-foreground text-xl flex items-center gap-2">
            <Users className="w-5 h-5" /> Community Members
          </h2>
          <p className="text-primary-foreground-muted text-xs mt-0.5">{members.length} members</p>
        </div>
        <div className="mabis-widget-actions flex items-center flex-wrap gap-2 shrink-0">
          {fullscreen ? (
            <Button size="sm" variant="outline"
              className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
              onClick={() => setFullscreen(false)}>
              <X className="w-3.5 h-3.5" /> Close
            </Button>
          ) : (
            <Button size="sm" variant="outline"
              className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
              onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="mabis-widget-body p-4 space-y-5 sm:p-5">
        {/* Add member — admin only (top) */}
        {isAdmin && (
          <div className="pb-4 border-b border-border space-y-2">
            {renderAddForm()}
            <RemoveMemberPanel members={members} onDelete={handleDelete} />
          </div>
        )}

        {/* Special roles: Chair + Minutes + Admin + Editor */}
        <div className="grid sm:grid-cols-2 gap-5">
          {["chair", "minutes", "admin", "editor"].map(role => (
            <div key={role}>
              <SectionHeader role={role} count={grouped[role].length} />
              <div className="space-y-1.5">
                {grouped[role].length === 0 && <p className="text-muted-foreground text-xs py-1.5">None assigned</p>}
                <AnimatePresence>
                  {grouped[role].map(m => <MemberRow key={m.id} m={m} currentRole={role} canChangeRoles={canChangeRoles} isActive={activeEmails.has((m.email || "").toLowerCase())} onRoleChange={handleRoleChange} onDelete={handleDelete} />)}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-border" />

        {/* Students — 2 columns */}
        <div>
          <SectionHeader role="student" count={grouped.student.length} />
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-1.5">
            {grouped.student.length === 0 && <p className="text-muted-foreground text-xs py-1.5 col-span-2">None yet</p>}
            <AnimatePresence>
              {grouped.student.map(m => <MemberRow key={m.id} m={m} currentRole="student" canChangeRoles={canChangeRoles} isActive={activeEmails.has((m.email || "").toLowerCase())} onRoleChange={handleRoleChange} onDelete={handleDelete} />)}
            </AnimatePresence>
          </div>
        </div>

        {/* Teachers — 2 columns */}
        <div>
          <SectionHeader role="teacher" count={grouped.teacher.length} />
          <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-1.5">
            {grouped.teacher.length === 0 && <p className="text-muted-foreground text-xs py-1.5 col-span-2">None yet</p>}
            <AnimatePresence>
              {grouped.teacher.map(m => <MemberRow key={m.id} m={m} currentRole="teacher" canChangeRoles={canChangeRoles} isActive={activeEmails.has((m.email || "").toLowerCase())} onRoleChange={handleRoleChange} onDelete={handleDelete} />)}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}