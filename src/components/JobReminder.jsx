import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X } from "lucide-react";
import { getISOWeek, getYear, nextFriday, isFriday } from "date-fns";

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function scheduledDaysFor(jobTitle) {
  if (jobTitle.includes("(1)")) return ["Monday", "Wednesday", "Friday"];
  if (jobTitle.includes("(2)")) return ["Tuesday", "Thursday"];
  return [];
}

export default function JobReminder() {
  const { user } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const todayKey = `job_reminder_${new Date().toDateString()}`;
  const currentWeek = getCurrentWeekLabel();

  const { data: assignments = [] } = useQuery({
    queryKey: ["assignments", currentWeek, user?.email, "reminder"],
    queryFn: () => base44.entities.JobAssignment.filter({
      week_label: currentWeek,
      assigned_to_email: user.email,
    }),
    enabled: Boolean(user?.email),
  });

  useEffect(() => {
    if (localStorage.getItem(todayKey)) setDismissed(true);
  }, []);

  const myJobs = assignments;
  const pending = myJobs.filter(a => {
    const sched = scheduledDaysFor(a.job_title);
    return sched.length > 0 && (a.days_completed || []).length < sched.length;
  });

  if (dismissed || pending.length === 0) return null;

  const handleDismiss = () => { localStorage.setItem(todayKey, "true"); setDismissed(true); };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
        onClick={handleDismiss}>
        <motion.div
          initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-xl bg-[#951E3A]/10 flex items-center justify-center">
                <Bell className="w-5 h-5 text-[#951E3A]" />
              </div>
              <div>
                <h3 className="font-display font-bold text-gray-800">Job Reminder</h3>
                <p className="text-xs text-gray-400">You have jobs to do this week</p>
              </div>
            </div>
            <button onClick={handleDismiss} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-3">
            {pending.map(a => {
              const sched = scheduledDaysFor(a.job_title);
              const done = a.days_completed || [];
              return (
                <div key={a.id} className="bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <p className="font-semibold text-gray-800 text-sm mb-1.5">{a.job_title}</p>
                  <p className="text-xs text-gray-400 mb-2">Do it on these days:</p>
                  <div className="flex gap-1.5 flex-wrap">
                    {sched.map(day => {
                      const isDone = done.includes(day);
                      return (
                        <span key={day} className={`text-xs font-bold px-2.5 py-1 rounded-lg ${isDone ? "bg-green-100 text-green-700" : "bg-[#951E3A]/10 text-[#951E3A]"}`}>
                          {isDone ? "✓ " : ""}{day.slice(0, 3)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
          <button onClick={handleDismiss}
            className="w-full mt-4 h-10 rounded-xl bg-[#951E3A] text-white text-sm font-bold hover:bg-[#7a1830] transition-colors">
            Got it!
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}