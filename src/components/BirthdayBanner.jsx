import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Cake, X } from "lucide-react";
import { format } from "date-fns";

export default function BirthdayBanner() {
  const [dismissed, setDismissed] = useState(false);
  const todayKey = `birthday_dismissed_${new Date().toDateString()}`;

  useEffect(() => {
    if (localStorage.getItem(todayKey)) setDismissed(true);
  }, []);

  const { data: birthdays = [] } = useQuery({
    queryKey: ["birthdays"],
    queryFn: () => base44.entities.Birthday.list("name", 200),
  });

  const today = new Date();
  const mm = format(today, "MM");
  const dd = format(today, "dd");
  const todayBirthdays = birthdays.filter(b => {
    if (!b.date) return false;
    const parts = b.date.split("-");
    return parts[1] === mm && parts[2] === dd;
  });

  if (dismissed || todayBirthdays.length === 0) return null;

  const handleDismiss = () => { localStorage.setItem(todayKey, "true"); setDismissed(true); };

  return (
    <motion.aside
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="birthday-notice"
      aria-label="Birthday notice"
    >
      <div className="birthday-notice__mark" aria-hidden>
        <Cake className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="tech-label mb-1 text-muted-foreground">
          Birthday / {format(today, "dd.MM")}
        </p>
        <p className="font-display text-lg font-medium leading-tight tracking-[-0.03em]">
          Happy birthday
        </p>
        <p className="mt-1 truncate text-sm text-muted-foreground">
          {todayBirthdays.map(b => b.name).join(", ")}
        </p>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        className="birthday-notice__close"
        aria-label="Dismiss birthday notice"
      >
        <X className="h-4 w-4" />
      </button>
    </motion.aside>
  );
}