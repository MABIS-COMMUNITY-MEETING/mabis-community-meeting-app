import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Play, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MemberAvatar from "@/components/shared/MemberAvatar";
import XpBadge from "@/components/shared/XpBadge";
import { format } from "date-fns";

const statusConfig = {
  assigned: { label: "Assigned", icon: Clock, color: "bg-amber-100 text-amber-700 border-amber-200" },
  in_progress: { label: "In Progress", icon: Play, color: "bg-blue-100 text-blue-700 border-blue-200" },
  completed: { label: "Completed", icon: CheckCircle2, color: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function JobCard({ job, onStatusChange, index }) {
  const status = statusConfig[job.status] || statusConfig.assigned;
  const StatusIcon = status.icon;

  const nextStatus = {
    assigned: "in_progress",
    in_progress: "completed",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className={`bg-card rounded-2xl border border-border p-5 hover:shadow-lg transition-all duration-300 ${
        job.status === "completed" ? "opacity-70" : "hover:shadow-primary/5 hover:border-primary/20"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <Badge variant="outline" className={`text-[10px] ${status.color}`}>
          <StatusIcon className="w-3 h-3 mr-1" />
          {status.label}
        </Badge>
        <XpBadge xp={job.xp_reward || 10} />
      </div>

      <h3 className="font-display font-semibold text-foreground mb-1">{job.title}</h3>
      {job.description && (
        <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{job.description}</p>
      )}

      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
          {job.assigned_to_name && (
            <>
              <MemberAvatar name={job.assigned_to_name} size="sm" />
              <span className="text-sm font-medium text-foreground">{job.assigned_to_name}</span>
            </>
          )}
        </div>
        {job.due_date && (
          <span className="text-xs text-muted-foreground">
            Due {format(new Date(job.due_date), "MMM d")}
          </span>
        )}
      </div>

      {nextStatus[job.status] && (
        <Button
          variant="outline"
          size="sm"
          className="w-full mt-4 rounded-xl"
          onClick={() => onStatusChange(job, nextStatus[job.status])}
        >
          {job.status === "assigned" ? "▶️ Start" : "✅ Complete"}
        </Button>
      )}
    </motion.div>
  );
}