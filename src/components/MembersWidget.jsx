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
      className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors group">
      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-white" style={{ border: `3px solid hsl(var(${cfg.roleVar}))`, boxSizing: "border-box" }}>
        {m.avatar_url
          ? <img src={m.avatar_url} alt="" className="w-full h-full object-cover" />
          : <img src={MABIS_LOGO} alt="" className="w-full h-full object-contain p-0.5" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{displayName(m)}</p>
        {m.email && <p className="text-[11px] text-gray-400 truncate">{m.email}</p>}
      </div>
      {canChangeRoles && (
        <div className="flex items-center gap-1">
          <Select onValueChange={(role) => onRoleChange(m.id, role)}>
            <SelectTrigger className="h-6 text-[10px] w-20 rounded border-gray-300 px-1.5 py-0">
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
        <span className="shrink-0 relative inline-flex items-center justify-center w-2.5 h-2.5 mr-2" title="Active">
          <span className="absolute inset-0 rounded-full bg-[#951E3A] animate-soft-ping" />
          <span className="relative w-2.5 h-2.5 rounded-full bg-[#951E3A] shadow-sm" />
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
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{cfg.label}s</p>
      <span className="ml-auto text-xs text-gray-400">{count}</span>
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
    mutationFn: (data) => base44.entities.Member.create(data),
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
    <div className="flex flex-wrap gap-2">
      <Input placeholder="Full name..." value={name} onChange={(e) => setName(e.target.value)}
        className="rounded-xl border-gray-200 flex-1 min-w-[130px]" />
      <Input placeholder="Email..." value={email} onChange={(e) => setEmail(e.target.value)}
        className="rounded-xl border-gray-200 flex-1 min-w-[130px]" />
      <Select value={newRole} onValueChange={setNewRole}>
        <SelectTrigger className="rounded-xl border-gray-200 w-28">
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
        className="bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-xl shrink-0">
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${fullscreen ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div className="bg-[#951E3A] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-white text-xl flex items-center gap-2">
            <Users className="w-5 h-5" /> Community Members
          </h2>
          <p className="text-white/60 text-xs mt-0.5">{members.length} members</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 shrink-0">
          {fullscreen ? (
            <Button size="sm" variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
              onClick={() => setFullscreen(false)}>
              <X className="w-3.5 h-3.5" /> Close
            </Button>
          ) : (
            <Button size="sm" variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
              onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Add member — admin only (top) */}
        {isAdmin && (
          <div className="pb-4 border-b border-gray-100 space-y-2">
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
                {grouped[role].length === 0 && <p className="text-gray-400 text-xs py-1.5">None assigned</p>}
                <AnimatePresence>
                  {grouped[role].map(m => <MemberRow key={m.id} m={m} currentRole={role} canChangeRoles={canChangeRoles} isActive={activeEmails.has((m.email || "").toLowerCase())} onRoleChange={handleRoleChange} onDelete={handleDelete} />)}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-100" />

        {/* Students — 2 columns */}
        <div>
          <SectionHeader role="student" count={grouped.student.length} />
          <div className="grid grid-cols-2 gap-1.5">
            {grouped.student.length === 0 && <p className="text-gray-400 text-xs py-1.5 col-span-2">None yet</p>}
            <AnimatePresence>
              {grouped.student.map(m => <MemberRow key={m.id} m={m} currentRole="student" canChangeRoles={canChangeRoles} isActive={activeEmails.has((m.email || "").toLowerCase())} onRoleChange={handleRoleChange} onDelete={handleDelete} />)}
            </AnimatePresence>
          </div>
        </div>

        {/* Teachers — 2 columns */}
        <div>
          <SectionHeader role="teacher" count={grouped.teacher.length} />
          <div className="grid grid-cols-2 gap-1.5">
            {grouped.teacher.length === 0 && <p className="text-gray-400 text-xs py-1.5 col-span-2">None yet</p>}
            <AnimatePresence>
              {grouped.teacher.map(m => <MemberRow key={m.id} m={m} currentRole="teacher" canChangeRoles={canChangeRoles} isActive={activeEmails.has((m.email || "").toLowerCase())} onRoleChange={handleRoleChange} onDelete={handleDelete} />)}
            </AnimatePresence>
          </div>
        </div>

      </div>
    </div>
  );
}