import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ArrowRight, Pause, Circle, CalendarCog, Lock, Undo2 } from "lucide-react";
import { format, nextFriday, isFriday, getISOWeek, getYear } from "date-fns";
import { base44 } from "@/api/base44Client";
import PasswordModal from "@/components/PasswordModal";

function getNextFriday() {
  const today = new Date();
  return isFriday(today) ? today : nextFriday(today);
}

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

function getMeetingEndedKey() {
  return `mabis_meeting_ended_${getCurrentWeekLabel()}`;
}

function weekLabelForDate(d) {
  const friday = isFriday(d) ? d : nextFriday(d);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

export default function MeetingModeWidget({ onStartMeeting, canStart = true }) {
  const navigate = useNavigate();
  const defaultDate = getNextFriday();
  const [customDate, setCustomDate] = useState(() => localStorage.getItem("mabis_meeting_date") || "");
  const [meetingStatus, setMeetingStatus] = useState(null);
  const [meetingEnded, setMeetingEnded] = useState(() => localStorage.getItem(getMeetingEndedKey()) === "true");
  const [showPassword, setShowPassword] = useState(false);
  const [showUnlockPassword, setShowUnlockPassword] = useState(false);
  const [showDateConfirm, setShowDateConfirm] = useState(false);
  const [pendingDate, setPendingDate] = useState(() => format(new Date(), "yyyy-MM-dd"));

  useEffect(() => {
    const handler = (e) => {
      const status = e.detail?.status || null;
      if (status === "ended") {
        localStorage.setItem(getMeetingEndedKey(), "true");
        setMeetingEnded(true);
      } else if (status === "active" || status === "paused") {
        localStorage.removeItem(getMeetingEndedKey());
        setMeetingEnded(false);
      }
      setMeetingStatus(status);
    };
    window.addEventListener("meetingStatus", handler);
    return () => window.removeEventListener("meetingStatus", handler);
  }, []);

  const handleUndoEnd = () => {
    localStorage.removeItem(getMeetingEndedKey());
    setMeetingEnded(false);
    setMeetingStatus(null);
    window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: null } }));
    window.dispatchEvent(new CustomEvent("meetingUndo"));
  };

  const isFridayToday = isFriday(new Date());
  const todayStr = format(new Date(), "yyyy-MM-dd");
  const meetingDate = customDate ? new Date(customDate) : defaultDate;
  const isToday = format(meetingDate, "yyyy-MM-dd") === todayStr;
  const isLocked = !meetingEnded && !isFridayToday;

  const statusConfig = {
    active: { label: "Meeting Active", icon: Circle, bg: "bg-green-500", text: "text-white" },
    paused: { label: "Meeting Paused", icon: Pause, style: { backgroundColor: "hsl(var(--secondary))", color: "hsl(var(--primary))" } },
  };
  const status = meetingStatus && meetingStatus !== "ended" ? statusConfig[meetingStatus] : null;

  const handleDateChange = (val) => {
    setCustomDate(val);
    if (val) localStorage.setItem("mabis_meeting_date", val);
    else localStorage.removeItem("mabis_meeting_date");
  };

  const handleStartFromPopup = async () => {
    handleDateChange(pendingDate);
    setShowDateConfirm(false);
    const d = new Date(pendingDate);
    if (!isFriday(d)) {
      const wl = weekLabelForDate(d);
      try {
        const existing = await base44.entities.Attendance.filter({ week_label: wl });
        if (existing.length > 0) await base44.entities.Attendance.update(existing[0].id, { meeting_date: pendingDate });
        else await base44.entities.Attendance.create({ week_label: wl, meeting_date: pendingDate, present_names: [] });
      } catch (e) { /* ignore */ }
    }
    onStartMeeting();
  };

  const handleWidgetClick = () => {
    if (meetingEnded) return;
    if (!canStart) return;
    if (isLocked) { setPendingDate(todayStr); setShowUnlockPassword(true); return; }
    onStartMeeting();
  };

  return (
    <>
    <motion.div
      whileHover={{ scale: (meetingEnded || !canStart) ? 1 : 1.01 }}
      whileTap={{ scale: (meetingEnded || !canStart) ? 1 : 0.99 }}
      onClick={handleWidgetClick}
      className={`bg-gradient-to-br from-[#951E3A] to-[#7a1830] rounded-2xl shadow-lg overflow-hidden border border-[#7a1830] select-none ${(meetingEnded || !canStart) ? "" : "cursor-pointer"}`}
      style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.35)" }}
    >
      <div className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/20">
            {meetingEnded || isLocked || !canStart ? <Lock className="w-7 h-7 text-white" /> : <Video className="w-7 h-7 text-white" />}
          </div>
          <div>
            <p className="text-white/70 text-xs uppercase tracking-widest font-semibold mb-0.5">
              {meetingEnded ? "Completed" : !canStart ? "Locked" : isLocked ? "Meeting Locked until Friday" : isToday ? "Today's Meeting" : "Next Meeting"}
            </p>
            <h2 className="font-display font-black text-white text-2xl leading-none">
              {meetingEnded ? "Meeting Ended for the Week" : !canStart ? "Meeting Mode" : "Start Meeting"}
            </h2>
            <p lang="ja" className="font-jp text-white/70 text-sm mt-1">
              {meetingEnded ? "今週の会議は終了しました" : !canStart ? "会議モード" : "会議を始める"}
            </p>
            <div className="flex items-center gap-2 mt-1.5">
              <p className="text-white text-sm font-semibold">
                {isToday ? format(meetingDate, "EEEE — 'Today'") : format(meetingDate, "EEEE, d MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {status && (
            <div className={`flex items-center gap-2 px-4 py-2 rounded-xl ${status.bg || ""} ${status.text || ""} font-bold text-sm shadow-md`}
              style={status.style || {}}>
              <status.icon className="w-4 h-4" />
              {status.label}
            </div>
          )}
          {meetingEnded ? (
            <>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); navigate("/history"); }}
                className="w-10 h-10 rounded-full bg-[#EACE54] flex items-center justify-center shrink-0 shadow-md" title="View History">
                <Lock className="w-5 h-5 text-[#951E3A]" />
              </motion.button>
              {canStart && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setShowPassword(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/15 hover:bg-white/25 text-white font-bold text-sm border border-white/30 transition-colors"
                  title="Undo End Meeting">
                  <Undo2 className="w-4 h-4" /> Undo
                </motion.button>
              )}
            </>
          ) : isLocked || !canStart ? (
            <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center shrink-0 border border-white/30">
              <Lock className="w-5 h-5 text-white/70" />
            </div>
          ) : (
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md">
              <ArrowRight className="w-5 h-5 text-[#951E3A]" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="h-1 w-full bg-gradient-to-r from-[#EACE54] via-white/30 to-[#EACE54]/40" />
    </motion.div>
      <PasswordModal open={showPassword} onClose={() => setShowPassword(false)} onSuccess={handleUndoEnd} title="Undo End Meeting" />
      <PasswordModal open={showUnlockPassword} onClose={() => setShowUnlockPassword(false)} onSuccess={() => { setPendingDate(todayStr); setShowUnlockPassword(false); setShowDateConfirm(true); }} title="Unlock Meeting Mode" />

      <AnimatePresence>
        {showDateConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-native-cursor
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
              <h3 className="font-display font-bold text-gray-800 text-lg mb-1">Start meeting today?</h3>
              <p className="text-sm text-gray-500 mb-4">This will set the meeting date to today and start it now.</p>
              <div className="flex gap-2">
                <button onClick={() => setShowDateConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-semibold text-sm hover:bg-gray-50">Cancel</button>
                <button onClick={handleStartFromPopup}
                  className="flex-1 py-2.5 rounded-xl bg-[#951E3A] hover:bg-[#7a1830] text-white font-bold text-sm">Start Meeting</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}