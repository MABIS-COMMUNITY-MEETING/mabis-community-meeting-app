import React from "react";

const COLORS = [
  "bg-violet-500", "bg-pink-500", "bg-blue-500", "bg-emerald-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-indigo-500"
];

export default function MemberAvatar({ name, color, size = "md" }) {
  const initials = (name || "?").split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  const bgColor = color || COLORS[name ? name.charCodeAt(0) % COLORS.length : 0];

  const sizeClasses = {
    sm: "w-7 h-7 text-[10px]",
    md: "w-9 h-9 text-xs",
    lg: "w-12 h-12 text-sm",
    xl: "w-16 h-16 text-lg",
  };

  return (
    <div className={`${sizeClasses[size]} ${bgColor} rounded-full flex items-center justify-center font-display font-bold text-primary-foreground shadow-md`}>
      {initials}
    </div>
  );
}