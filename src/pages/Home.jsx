import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Palette, Inbox, Settings } from "lucide-react";
import PageFooter from "@/components/PageFooter";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import DiscussionWidget from "@/components/DiscussionWidget";
import MembersWidget from "@/components/MembersWidget";
import CalendarWidget from "@/components/CalendarWidget";
import JobsWidget from "@/components/JobsWidget";
import AnnouncementsWidget from "@/components/AnnouncementsWidget";
import NewsWidget from "@/components/NewsWidget";
import MissingItemsWidget from "@/components/MissingItemsWidget";
import LunchMenuWidget from "@/components/LunchMenuWidget";
import ScheduleWidget from "@/components/ScheduleWidget";
import MeetingModeWidget from "@/components/MeetingModeWidget";
import DoveAnimation from "@/components/DoveAnimation";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import MabisAIAssistant from "@/components/MabisAIAssistant";
import FeedbackWidget from "@/components/FeedbackWidget";
import RoleSwitcher from "@/components/RoleSwitcher";
import RolePreviewToggle from "@/components/RolePreviewToggle";
import ProfileEditor from "@/components/ProfileEditor";
import BirthdayBanner from "@/components/BirthdayBanner";
import JobReminder from "@/components/JobReminder";
import SettingsModal from "@/components/SettingsModal";
import { usePresenceHeartbeat } from "@/hooks/usePresence";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { duration: 0.3, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] } })
};

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

const ROLE_COLOR_VARS = {
  student: "hsl(var(--role-student))",
  teacher: "hsl(var(--role-teacher))",
  chair: "hsl(var(--role-chair))",
  minutes: "hsl(var(--role-minutes))",
  admin: "hsl(var(--role-admin))",
  editor: "hsl(var(--role-editor))",
};

export default function Home() {
  const { user, refetchUser } = useAuth();
  usePresenceHeartbeat();
  const isSummerOrBenjamin = user?.email === "summer@montessoribkk.com" || /benjamin/i.test(user?.full_name || "") || /benjamin/i.test(user?.email || "");
  const userRole = user?.role_override || user?.role;

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 200)
  });

  // Detect the minutes-taker (Member with role "minutes") for the signed-in user.
  // A person can have duplicate member records with different roles (e.g. a
  // "student" copy alongside the real "minutes" record), so we match by email or
  // name and detect the minutes-taker if ANY matching member has role "minutes"
  // — rather than trusting the first match .find() would return.
  const userMatches = members.filter(m =>
    (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    (m.name && user?.full_name && m.name.toLowerCase() === user.full_name.toLowerCase())
  );
  const ROLE_RANK = { admin: 5, editor: 4, chair: 3, minutes: 3, teacher: 2, student: 1 };
  const userMember = [...userMatches].sort((a, b) => (ROLE_RANK[b.role] || 0) - (ROLE_RANK[a.role] || 0))[0];
  const isMinutesTaker = userMatches.some(m => m.role === "minutes");

  // Role preview: admins (incl. minutes-taker) can temporarily view the app as another role.
  const canPreview = userRole === "admin" || userRole === "minutes" || isSummerOrBenjamin || isMinutesTaker;
  const [previewRole, setPreviewRole] = useState(() => localStorage.getItem("mabis_preview_role") || "");
  useEffect(() => {
    if (previewRole) localStorage.setItem("mabis_preview_role", previewRole);
    else localStorage.removeItem("mabis_preview_role");
  }, [previewRole]);
  const effectiveRole = (canPreview && previewRole) ? previewRole : userRole;
  const effectiveMemberRole = (canPreview && previewRole) ? previewRole : (userMember?.role || "");

  const isAdmin = effectiveRole === "admin" || effectiveRole === "editor" || effectiveRole === "chair" || effectiveRole === "minutes" || isMinutesTaker || (isSummerOrBenjamin && effectiveRole !== "student" && effectiveRole !== "teacher");
  const canManage = ["admin", "editor", "chair", "minutes", "teacher"].includes(effectiveRole) || isMinutesTaker || (isSummerOrBenjamin && effectiveRole !== "student");
  const [showDove, setShowDove] = useState(false);

  // Auto-set Summer's role to admin on first login
  useEffect(() => {
    if (isSummerOrBenjamin && (!userRole || userRole === "user")) {
      base44.auth.updateMe({ role_override: "admin" }).then(() => refetchUser?.()).catch(() => {});
    }
  }, [user?.email, user?.full_name, userRole, isSummerOrBenjamin]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const effectiveAdmin = isAdmin;
  const isFullAdmin = effectiveRole === "admin" || effectiveRole === "editor" || effectiveRole === "minutes" || isMinutesTaker;
  // The reports inbox is admin/editor only — minutes-takers get everything except this.
  const canSeeInbox = (effectiveRole === "admin" || effectiveRole === "editor") && !isMinutesTaker;
  const roleColor = ROLE_COLOR_VARS[effectiveRole] || "hsl(var(--primary))";

  const { data: newFeedback = [] } = useQuery({
    queryKey: ["feedback", "new"],
    queryFn: () => base44.entities.Feedback.filter({ status: "new" }),
  });
  const hasNewFeedback = newFeedback.length > 0;

  const discussionCanManage = canManage || isMinutesTaker;
  // Meeting start is restricted to lead roles (chair, minutes, teacher, admin, editor),
  // detected from either the app user role or the Member record role.
  const leadRoles = ["admin", "editor", "chair", "minutes", "teacher"];
  const canStartMeeting = canManage || leadRoles.includes(effectiveMemberRole);

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, #f7f5f6 0%, #f1eef0 100%)" }}>
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1440px] mx-auto px-5 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <motion.div
              whileHover={{ scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="w-10 h-10 rounded-xl bg-white shadow-md ring-1 ring-gray-100 flex items-center justify-center shrink-0">
              
              <img src="https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png"
              alt="MABIS" className="w-8 h-8 object-contain" />
            </motion.div>
            <div>
              <h1 className="font-display font-bold text-gray-800 text-base leading-none group-hover:text-[#951E3A] transition-colors">
                MABIS Community Meeting
              </h1>
              <p className="text-gray-400 text-[11px] mt-0.5">Secondary Community Meeting App</p>
            </div>
          </Link>

          <div className="flex items-center gap-3 relative">
            {canSeeInbox && (
              <Link to="/feedback" className="relative hidden sm:flex w-8 h-8 rounded-lg border border-gray-200 bg-white items-center justify-center hover:bg-gray-50 transition-colors shadow-sm" title="View Feedback & Bug Reports">
                <Inbox className="w-4 h-4 text-gray-600" />
                {hasNewFeedback && (
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white" />
                )}
              </Link>
            )}
            {isSummerOrBenjamin ? (
              <RoleSwitcher />
            ) : (
              <>
                {isAdmin && (
                  <span className="hidden sm:inline text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm" style={{ backgroundColor: "#951E3A" }}>Admin</span>
                )}
                {effectiveRole === "editor" && (
                  <span className="hidden sm:inline text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wide shadow-sm" style={{ backgroundColor: "hsl(var(--role-editor))" }}>Editor</span>
                )}
              </>
            )}
            {canPreview && <RolePreviewToggle value={previewRole} onChange={setPreviewRole} realRole={userRole} />}
            <ThemeSwitcher />
            <button onClick={() => setShowSettings(true)}
              className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
              title="Settings">
              <Settings className="w-4 h-4 text-gray-600" />
            </button>

            {/* Avatar + Name + Sign Out — all in one row */}
            <div className="flex items-center gap-2.5">
              <div className="relative shrink-0">
                <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shadow bg-white"
                  style={{ border: `4px solid ${roleColor}`, boxSizing: "border-box" }}>
                  {user?.avatar_url
                    ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    : <img src={MABIS_LOGO} alt="avatar" className="w-full h-full object-contain p-0.5" />
                  }
                </div>
                <button onClick={() => setEditingProfile(!editingProfile)}
                  className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-white shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors border border-gray-200"
                  title="Customize Profile Picture">
                  <Palette className="w-3 h-3 text-[#951E3A]" />
                </button>
              </div>
              <span className="hidden sm:block text-sm font-semibold text-gray-700">
                {user?.full_name?.split(" ")[0] || "User"}
              </span>
              <button onClick={() => base44.auth.logout()}
                className="text-xs font-bold text-white bg-[#951E3A] hover:bg-[#7a1830] px-4 py-2 rounded-lg transition-colors shadow-sm">
                Sign Out
              </button>
            </div>

            <ProfileEditor open={editingProfile} onClose={() => setEditingProfile(false)} />
            <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} isAdmin={effectiveAdmin} />
          </div>
        </div>
      </header>

      {showDove && <DoveAnimation onComplete={() => setShowDove(false)} />}

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
        <BirthdayBanner />
        {/* Meeting Mode — standalone widget */}
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={0}>
          <MeetingModeWidget canStart={canStartMeeting} onStartMeeting={() => {
            window.dispatchEvent(new CustomEvent("startMeetingMode"));
          }} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1}>
          <AnnouncementsWidget members={members} isAdmin={canManage} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={1.5}>
          <DiscussionWidget members={members} isAdmin={canManage} canEditTopics={discussionCanManage} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={3}>
          <JobsWidget members={members} isAdmin={canManage} compact={false} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4}>
          <CalendarWidget />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4.25}>
          <ScheduleWidget isAdmin={canManage} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4.5}>
          <MissingItemsWidget members={members} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={4.75}>
          <LunchMenuWidget isAdmin={canManage} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5}>
          <NewsWidget members={members} isAdmin={canManage} />
        </motion.div>
        <motion.div variants={fadeUp} initial="hidden" animate="show" custom={5.25}>
          <MembersWidget isAdmin={canManage} canChangeRoles={isSummerOrBenjamin || isMinutesTaker} />
        </motion.div>

        <PageFooter />
      </main>
      <JobReminder />
      <MabisAIAssistant />
      <FeedbackWidget />
    </div>);

}