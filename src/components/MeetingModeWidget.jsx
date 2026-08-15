import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Video, ArrowRight, Pause, Circle, Lock, Undo2 } from "lucide-react";
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
    active: { label: "Meeting Active", icon: Circle, bg: "bg-green-500", text: "text-primary-foreground" },
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
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleWidgetClick(); } }}
      className={`relative bg-ink ink-card text-bone border border-ink overflow-hidden select-none ${(meetingEnded || !canStart) ? "" : "cursor-pointer"}`}
    >
      <div className="flex flex-col items-stretch justify-between gap-5 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:p-8">
        <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center border border-bone/25 bg-bone/10 sm:h-14 sm:w-14">
            {meetingEnded || isLocked || !canStart ? <Lock className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </div>
          <div className="min-w-0">
            <p className="tech-label text-bone/60 mb-1.5">
              {meetingEnded ? "Completed" : !canStart ? "Locked" : isLocked ? "Meeting Locked until Friday" : isToday ? "Today's Meeting" : "Next Meeting"}
            </p>
            <h2 className="font-display text-2xl font-extralight leading-[1.05] tracking-ultra sm:text-4xl">
              {meetingEnded ? "Meeting Ended for the Week" : !canStart ? "Meeting Mode" : "Start Meeting"}
            </h2>
            <div className="flex items-center gap-2 mt-3">
              <p className="tech-label text-bone">
                {isToday ? format(meetingDate, "EEEE — 'Today'") : format(meetingDate, "EEEE, d MMMM yyyy")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex w-full flex-wrap items-center gap-3 sm:w-auto">
          {status && (
            <div className={`flex items-center gap-2 px-3.5 py-1.5 tech-label ${status.bg || ""} ${status.text || ""}`}
              style={status.style || {}}>
              <status.icon className="w-4 h-4" />
              {status.label}
            </div>
          )}
          {meetingEnded ? (
            <>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                onClick={(e) => { e.stopPropagation(); navigate("/history"); }}
                className="w-10 h-10 bg-secondary flex items-center justify-center shrink-0" title="View History">
                <Lock className="w-4 h-4 text-ink" />
              </motion.button>
              {canStart && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={(e) => { e.stopPropagation(); setShowPassword(true); }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-bone/10 hover:bg-bone/20 text-bone tech-label border border-bone/30 transition-colors"
                  title="Undo End Meeting">
                  <Undo2 className="w-4 h-4" /> Undo
                </motion.button>
              )}
            </>
          ) : isLocked && canStart ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setPendingDate(todayStr);
                setShowUnlockPassword(true);
              }}
              className="min-h-11 flex items-center gap-2 px-4 bg-bone/10 text-bone border border-bone/30 tech-label touch-manipulation"
              aria-label="Unlock Meeting Mode"
            >
              <Lock className="w-4 h-4 text-bone/70" /> Unlock
            </button>
          ) : !canStart ? (
            <div className="w-10 h-10 bg-bone/10 flex items-center justify-center shrink-0 border border-bone/30">
              <Lock className="w-4 h-4 text-bone/70" />
            </div>
          ) : (
            <motion.div
              animate={{ x: [0, 6, 0] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
              className="w-10 h-10 bg-bone flex items-center justify-center shrink-0">
              <ArrowRight className="w-4 h-4 text-ink" />
            </motion.div>
          )}
        </div>
      </div>

      <div className="h-1 w-full" style={{ background: "linear-gradient(90deg, var(--flag-1, hsl(var(--primary))), var(--flag-3, hsl(var(--secondary))), var(--flag-5, hsl(var(--primary))))" }} />
    </motion.div>
      <PasswordModal open={showPassword} onClose={() => setShowPassword(false)} onSuccess={handleUndoEnd} title="Undo End Meeting" />
      <PasswordModal open={showUnlockPassword} onClose={() => setShowUnlockPassword(false)} onSuccess={() => { setPendingDate(todayStr); setShowUnlockPassword(false); setShowDateConfirm(true); }} title="Unlock Meeting Mode" />

      <AnimatePresence>
        {showDateConfirm && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-native-cursor
            className="mobile-sheet-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <motion.div initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="mobile-sheet-panel bg-card rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6">
              <h3 className="font-display font-bold text-foreground text-lg mb-1">Start meeting today?</h3>
              <p className="text-sm text-muted-foreground mb-4">This will set the meeting date to today and start it now.</p>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={() => setShowDateConfirm(false)}
                  className="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground font-semibold text-sm hover:bg-muted">Cancel</button>
                <button onClick={handleStartFromPopup}
                  className="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm">Start Meeting</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}