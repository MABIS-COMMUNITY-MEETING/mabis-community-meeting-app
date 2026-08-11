import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Cake, X, Sparkles } from "lucide-react";
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
    <motion.div
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className="bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-500 rounded-2xl p-4 shadow-lg flex items-center gap-3 text-white relative overflow-hidden">
      <motion.div className="absolute inset-0 pointer-events-none"
        animate={{ opacity: [0, 0.15, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
      <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center shrink-0 backdrop-blur-sm relative z-10">
        <Cake className="w-6 h-6" />
      </div>
      <div className="flex-1 min-w-0 relative z-10">
        <p className="font-display font-black text-lg leading-tight flex items-center gap-1.5">
          <Sparkles className="w-4 h-4" /> Happy Birthday!
        </p>
        <p className="text-white/90 text-sm font-medium truncate">
          {todayBirthdays.map(b => b.name).join(", ")} 🎉
        </p>
      </div>
      <button onClick={handleDismiss} className="p-1.5 rounded-lg hover:bg-white/20 transition-colors shrink-0 relative z-10">
        <X className="w-5 h-5" />
      </button>
    </motion.div>
  );
}