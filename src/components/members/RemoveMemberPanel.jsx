import React, { useState } from "react";
import { UserMinus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { displayName } from "@/lib/names";

/* Pick a member from a list, then remove them — a direct alternative to the
   per-row remove icon. */
export default function RemoveMemberPanel({ members, onDelete }) {
  const [selectedId, setSelectedId] = useState("");
  const selected = members.find((m) => m.id === selectedId);

  const handleRemove = () => {
    if (!selected) return;
    if (!window.confirm(`Remove ${displayName(selected)} from members?`)) return;
    onDelete(selected.id);
    setSelectedId("");
  };

  return (
    <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
      <Select value={selectedId} onValueChange={setSelectedId}>
        <SelectTrigger className="w-full min-w-0 flex-1 rounded-xl border-gray-200 sm:min-w-[180px]">
          <SelectValue placeholder="Select a member to remove..." />
        </SelectTrigger>
        <SelectContent>
          {members.map((m) => (
            <SelectItem key={m.id} value={m.id}>{displayName(m)}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={handleRemove} disabled={!selected}
        className="w-full shrink-0 gap-1.5 rounded-xl bg-red-600 text-white hover:bg-red-700 sm:w-auto">
        <UserMinus className="w-4 h-4" /> Remove
      </Button>
    </div>
  );
}