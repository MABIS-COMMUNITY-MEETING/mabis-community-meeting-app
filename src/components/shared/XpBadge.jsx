import React from "react";
import { Zap } from "lucide-react";

export default function XpBadge({ xp, size = "sm" }) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5 gap-1",
    md: "text-sm px-3 py-1 gap-1.5",
    lg: "text-base px-4 py-1.5 gap-2",
  };

  return (
    <span className={`inline-flex items-center font-display font-bold rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-primary-foreground ${sizeClasses[size]}`}>
      <Zap className={size === "sm" ? "w-3 h-3" : size === "md" ? "w-4 h-4" : "w-5 h-5"} />
      {xp} XP
    </span>
  );
}