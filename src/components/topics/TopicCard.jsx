import React from "react";
import { motion } from "framer-motion";
import { ThumbsUp, Clock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import MemberAvatar from "@/components/shared/MemberAvatar";

const statusConfig = {
  pending: { label: "Pending", icon: Clock, className: "bg-amber-100 text-amber-700 border-amber-200" },
  discussed: { label: "Discussed", icon: CheckCircle2, className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  deferred: { label: "Deferred", icon: Clock, className: "bg-muted text-muted-foreground border-border" },
};

export default function TopicCard({ topic, onVote, hasVoted, index }) {
  const status = statusConfig[topic.status] || statusConfig.pending;
  const StatusIcon = status.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="group bg-card rounded-2xl border border-border p-5 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300 hover:border-primary/20"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Badge variant="outline" className={`text-[10px] ${status.className}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {status.label}
            </Badge>
          </div>
          <h3 className="font-display font-semibold text-foreground text-lg leading-tight mb-1">{topic.title}</h3>
          {topic.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{topic.description}</p>
          )}
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {topic.submitted_by && (
              <div className="flex items-center gap-1.5">
                <MemberAvatar name={topic.submitted_by} size="sm" />
                <span>{topic.submitted_by}</span>
              </div>
            )}
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <Button
            variant={hasVoted ? "default" : "outline"}
            size="sm"
            onClick={() => onVote(topic)}
            className={`rounded-xl h-12 w-12 flex flex-col gap-0 p-0 ${
              hasVoted ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25" : ""
            }`}
          >
            <ThumbsUp className="w-4 h-4" />
            <span className="text-[10px] font-bold">{topic.votes || 0}</span>
          </Button>
        </div>
      </div>
    </motion.div>
  );
}