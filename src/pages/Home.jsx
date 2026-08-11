import React, { useState, useEffect } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Palette, Inbox, Settings, Plus } from "lucide-react";
import moment from "moment";
import PageFooter from "@/components/PageFooter";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import SectionReveal from "@/components/SectionReveal";
import Marquee from "@/components/Marquee";
import KineticHeading from "@/components/KineticHeading";
import ScrollVelocity from "@/components/ScrollVelocity";
import ScrollSectionIndicator from "@/components/ScrollSectionIndicator";
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
  const { user, refetchUser, logout } = useAuth();
  usePresenceHeartbeat();
  const isSummerOrBenjamin = user?.email === "summer@montessoribkk.com" || /benjamin/i.test(user?.full_name || "") || /benjamin/i.test(user?.email || "");
  const userRole = user?.role_override || user?.role;

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.Member.list("name", 200)
  });

  const userMatches = members.filter(m =>
    (m.email && user?.email && m.email.toLowerCase() === user.email.toLowerCase()) ||
    (m.name && user?.full_name && m.name.toLowerCase() === user.full_name.toLowerCase())
  );
  const ROLE_RANK = { admin: 5, editor: 4, chair: 3, minutes: 3, teacher: 2, student: 1 };
  const userMember = [...userMatches].sort((a, b) => (ROLE_RANK[b.role] || 0) - (ROLE_RANK[a.role] || 0))[0];
  const isMinutesTaker = userMatches.some(m => m.role === "minutes");

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

  useEffect(() => {
    if (isSummerOrBenjamin && (!userRole || userRole === "user")) {
      base44.auth.updateMe({ role_override: "admin" }).then(() => refetchUser?.()).catch(() => {});
    }
  }, [user?.email, user?.full_name, userRole, isSummerOrBenjamin]);

  const [editingProfile, setEditingProfile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const effectiveAdmin = isAdmin;
  const isFullAdmin = effectiveRole === "admin" || effectiveRole === "editor" || effectiveRole === "minutes" || isMinutesTaker;
  const canSeeInbox = (effectiveRole === "admin" || effectiveRole === "editor") && !isMinutesTaker;
  const roleColor = ROLE_COLOR_VARS[effectiveRole] || "hsl(var(--primary))";

  const { data: newFeedback = [] } = useQuery({
    queryKey: ["feedback", "new"],
    queryFn: () => base44.entities.Feedback.filter({ status: "new" }),
  });
  const hasNewFeedback = newFeedback.length > 0;

  const discussionCanManage = canManage || isMinutesTaker;
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
        <button onClick={() => logout()} data-cursor="EXIT" className="liquid-btn tech-label px-3.5 py-2 border border-foreground/30 bg-bone text-foreground">
          SIGN OUT
        </button>
      </div>
    </>
  );

  const weekLabel = moment().format("YYYY-[W]WW");
  const dateLabel = moment().format("DD.MM.YYYY");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SiteHeader rightSlot={controls} />
      <ScrollSectionIndicator total={10} />
      <ProfileEditor open={editingProfile} onClose={() => setEditingProfile(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} isAdmin={effectiveAdmin} />

      {showDove && <DoveAnimation onComplete={() => setShowDove(false)} />}

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 pt-24 sm:pt-28 pb-8 space-y-6 sm:space-y-8">
        {/* editorial masthead */}
        <motion.section
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="border-b border-foreground/15 pb-7"
        >
          <div className="flex items-center gap-3 mb-5">
            <span className="tech-label text-primary flex items-center gap-1.5">
              <span className="pulse-dot inline-block h-1.5 w-1.5 bg-primary" />／ 00
            </span>
            <span className="tech-label text-muted-foreground">DASHBOARD</span>
            <span className="flex-1 h-px bg-foreground/15" />
            <span className="tech-label text-muted-foreground hidden sm:block tabular-nums">{dateLabel}</span>
          </div>
          <h1 className="font-display font-extralight tracking-ultra leading-[0.9] text-5xl sm:text-7xl md:text-8xl">
            <span className="block">COMMUNITY</span>
            <span className="block text-stroke">MEETING</span>
          </h1>
          <p lang="ja" className="font-jp mt-4 text-xl sm:text-2xl text-foreground/60">コミュニティ・ミーティング</p>
          <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 tech-label text-muted-foreground">
            <span className="tabular-nums">WEEK {weekLabel}</span>
            <Plus className="h-3 w-3 text-primary/60" />
            <span>FRIDAY ／ WEEKLY RITUAL <span lang="ja" className="font-jp normal-case tracking-normal text-foreground/60">毎週金曜日</span></span>
            <Plus className="h-3 w-3 text-primary/60" />
            <span>MABIS ／ BANGKOK</span>
          </div>
        </motion.section>

        {/* kinetic scroll-reactive divider */}
        <section className="py-2 -mx-4 sm:-mx-6 px-4 sm:px-6 overflow-hidden">
          <KineticHeading text="WEEKLY RITUAL" className="text-[15vw] sm:text-[11vw] text-foreground/85" />
          <p lang="ja" className="font-jp mt-1 text-base sm:text-xl text-foreground/50">週の儀式</p>
        </section>

        {/* velocity-driven typographic band */}
        <div className="-mx-4 sm:-mx-6 border-y border-foreground/15 bg-card/40 py-5">
          <ScrollVelocity
            text="SECONDARY COMMUNITY MEETING ／ FRIDAY ／ MABIS BANGKOK ／ "
            className="font-display font-thin tracking-ultra text-foreground/80 text-[6.5vw] sm:text-[4.6vw]"
          />
        </div>

        {/* date marquee */}
        <div className="-mx-4 sm:-mx-6 border-y border-foreground/15 bg-card/50 py-2.5">
          <Marquee speed={40} className="text-muted-foreground">
            {Array.from({ length: 8 }).map((_, i) => (
              <span key={i} className="flex items-center tech-label">
                <span className="px-5">SECONDARY COMMUNITY MEETING</span>
                <Plus className="h-3 w-3 text-primary/60" />
                <span className="px-5">{weekLabel}</span>
                <Plus className="h-3 w-3 text-primary/60" />
                <span className="px-5">LIVE DASHBOARD</span>
                <Plus className="h-3 w-3 text-primary/60" />
              </span>
            ))}
          </Marquee>
        </div>

        <BirthdayBanner />

        <SectionReveal index="01" label="MEETING MODE" jp="会議モード">
          <MeetingModeWidget canStart={canStartMeeting} onStartMeeting={() => {
            window.dispatchEvent(new CustomEvent("startMeetingMode"));
          }} />
        </SectionReveal>

        <SectionReveal index="02" label="ANNOUNCEMENTS" jp="お知らせ">
          <AnnouncementsWidget members={members} isAdmin={canManage} />
        </SectionReveal>

        <SectionReveal index="03" label="DISCUSSION" jp="議題">
          <DiscussionWidget members={members} isAdmin={canManage} canEditTopics={discussionCanManage} />
        </SectionReveal>

        <SectionReveal index="04" label="JOBS ／ ROTATION" jp="当番">
          <JobsWidget members={members} isAdmin={canManage} compact={false} />
        </SectionReveal>

        <SectionReveal index="05" label="CALENDAR" jp="カレンダー">
          <CalendarWidget />
        </SectionReveal>

        <SectionReveal index="06" label="SCHEDULE" jp="時間割">
          <ScheduleWidget isAdmin={canManage} />
        </SectionReveal>

        <SectionReveal index="07" label="LOST ／ FOUND" jp="落とし物">
          <MissingItemsWidget members={members} />
        </SectionReveal>

        <SectionReveal index="08" label="LUNCH MENU" jp="給食の献立">
          <LunchMenuWidget isAdmin={canManage} />
        </SectionReveal>

        <SectionReveal index="09" label="NEWS" jp="ニュース">
          <NewsWidget members={members} isAdmin={canManage} />
        </SectionReveal>

        <SectionReveal index="10" label="MEMBERS" jp="メンバー">
          <MembersWidget isAdmin={canManage} canChangeRoles={isSummerOrBenjamin || isMinutesTaker} />
        </SectionReveal>

        <PageFooter />
      </main>
      <JobReminder />
      <MabisAIAssistant />
      <FeedbackWidget />
    </div>);
}