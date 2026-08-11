import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Palette, Inbox, Settings } from "lucide-react";
import PageFooter from "@/components/PageFooter";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
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

  const controls = (
    <>
      {canSeeInbox && (
        <Link to="/feedback" data-cursor="INBOX" title="Feedback & Bug Reports" className="relative hidden sm:flex h-9 w-9 items-center justify-center border border-foreground/30 bg-bone text-foreground hover:bg-foreground hover:text-bone transition-colors">
          <Inbox className="w-4 h-4" />
          {hasNewFeedback && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 bg-primary" />}
        </Link>
      )}
      {isSummerOrBenjamin ? (
        <RoleSwitcher />
      ) : (
        <>
          {isAdmin && (
            <span className="hidden md:inline tech-label px-2.5 py-1 bg-primary text-primary-foreground">ADMIN</span>
          )}
          {effectiveRole === "editor" && (
            <span className="hidden md:inline tech-label px-2.5 py-1 text-bone" style={{ backgroundColor: "hsl(var(--role-editor))" }}>EDITOR</span>
          )}
        </>
      )}
      {canPreview && <RolePreviewToggle value={previewRole} onChange={setPreviewRole} realRole={userRole} />}
      <ThemeSwitcher />
      <button onClick={() => setShowSettings(true)} data-cursor="SET" title="Settings" className="h-9 w-9 flex items-center justify-center border border-foreground/30 bg-bone text-foreground hover:bg-foreground hover:text-bone transition-colors">
        <Settings className="w-4 h-4" />
      </button>
      <div className="hidden sm:flex items-center gap-2.5 pl-1">
        <div className="relative shrink-0">
          <div className="h-9 w-9 overflow-hidden flex items-center justify-center bg-card"
            style={{ border: `2px solid ${roleColor}`, boxSizing: "border-box" }}>
            {user?.avatar_url
              ? <img src={user.avatar_url} alt="avatar" className="w-full h-full object-cover" />
              : <img src={MABIS_LOGO} alt="avatar" className="w-full h-full object-contain p-0.5" />}
          </div>
          <button onClick={() => setEditingProfile(!editingProfile)} title="Customize Profile Picture" className="absolute -bottom-1 -right-1 h-5 w-5 flex items-center justify-center bg-card border border-foreground/30 text-primary">
            <Palette className="w-3 h-3" />
          </button>
        </div>
        <span className="text-xs tech-label text-foreground hidden lg:inline">
          {user?.full_name?.split(" ")[0]?.toUpperCase() || "USER"}
        </span>
        <button onClick={() => base44.auth.logout()} data-cursor="EXIT" className="tech-label px-3.5 py-2 border border-foreground/30 bg-bone text-foreground hover:bg-foreground hover:text-bone transition-colors">
          SIGN OUT
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader rightSlot={controls} />
      <ProfileEditor open={editingProfile} onClose={() => setEditingProfile(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} isAdmin={effectiveAdmin} />

      {showDove && <DoveAnimation onComplete={() => setShowDove(false)} />}

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-8 space-y-5">
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