import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Palette, Inbox, Settings } from "lucide-react";
import { format, getISOWeek, getISOWeekYear } from "date-fns";
import PageFooter from "@/components/PageFooter";
import { Link } from "react-router-dom";
import SiteHeader from "@/components/SiteHeader";
import EditorialSection from "@/components/home/EditorialSection";
import LazySection from "@/components/home/LazySection";
import HomeMasthead from "@/components/home/HomeMasthead";
import ScrollVelocity from "@/components/ScrollVelocity";
import ScrollScaleRitual from "@/components/home/ScrollScaleRitual";
import ScrollSectionIndicator from "@/components/ScrollSectionIndicator";
import MeetingModeWidget from "@/components/MeetingModeWidget";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import IdleMount from "@/components/IdleMount";
import RoleSwitcher from "@/components/RoleSwitcher";
import RolePreviewToggle from "@/components/RolePreviewToggle";
import BirthdayBanner from "@/components/BirthdayBanner";
import { usePresenceHeartbeat } from "@/hooks/usePresence";

const AnnouncementsWidget = lazy(() => import("@/components/AnnouncementsWidget"));
const DiscussionWidget = lazy(() => import("@/components/DiscussionWidget"));
const MembersWidget = lazy(() => import("@/components/MembersWidget"));
const CalendarWidget = lazy(() => import("@/components/CalendarWidget"));
const JobsWidget = lazy(() => import("@/components/JobsWidget"));
const NewsWidget = lazy(() => import("@/components/NewsWidget"));
const MissingItemsWidget = lazy(() => import("@/components/MissingItemsWidget"));
const LunchMenuWidget = lazy(() => import("@/components/LunchMenuWidget"));
const ScheduleWidget = lazy(() => import("@/components/ScheduleWidget"));
const MabisAIAssistant = lazy(() => import("@/components/MabisAIAssistant"));
const FeedbackWidget = lazy(() => import("@/components/FeedbackWidget"));
const ProfileEditor = lazy(() => import("@/components/ProfileEditor"));
const JobReminder = lazy(() => import("@/components/JobReminder"));
const SettingsModal = lazy(() => import("@/components/SettingsModal"));

function WidgetFallback({ minHeight = 320 }) {
  return <div className="widget-loading-shell" style={{ "--widget-fallback-height": `${minHeight}px` }} aria-hidden />;
}

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

  const { userMatches, userMember, isMinutesTaker } = useMemo(() => {
    const matches = members.filter((member) =>
      (member.email && user?.email && member.email.toLowerCase() === user.email.toLowerCase()) ||
      (member.name && user?.full_name && member.name.toLowerCase() === user.full_name.toLowerCase())
    );
    const roleRank = { admin: 5, editor: 4, chair: 3, minutes: 3, teacher: 2, student: 1 };
    const member = [...matches].sort((a, b) => (roleRank[b.role] || 0) - (roleRank[a.role] || 0))[0];
    return {
      userMatches: matches,
      userMember: member,
      isMinutesTaker: matches.some((candidate) => candidate.role === "minutes"),
    };
  }, [members, user?.email, user?.full_name]);

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
    enabled: canSeeInbox,
  });
  const hasNewFeedback = newFeedback.length > 0;

  const discussionCanManage = canManage || isMinutesTaker;
  const leadRoles = ["admin", "editor", "chair", "minutes", "teacher"];
  const canStartMeeting = canManage || leadRoles.includes(effectiveMemberRole);

  const controls = (
    <>
      {canSeeInbox && (
        <Link to="/feedback" data-cursor="INBOX" title="Feedback & Bug Reports" className="relative flex h-9 w-9 items-center justify-center border border-foreground/30 bg-background text-foreground hover:bg-foreground hover:text-background transition-colors">
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
            <span className="hidden md:inline tech-label px-2.5 py-1 text-white" style={{ backgroundColor: "hsl(var(--role-editor))" }}>EDITOR</span>
          )}
        </>
      )}
      {canPreview && <RolePreviewToggle value={previewRole} onChange={setPreviewRole} realRole={userRole} />}
      <ThemeSwitcher />
      <button onClick={() => setShowSettings(true)} data-cursor="SET" title="Settings" className="h-9 w-9 flex items-center justify-center border border-foreground/30 bg-background text-foreground hover:bg-foreground hover:text-background transition-colors">
        <Settings className="w-4 h-4" />
      </button>
      <div className="flex items-center gap-2.5 pl-1">
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
        <button onClick={() => logout()} data-cursor="EXIT" className="liquid-btn tech-label px-3.5 py-2 border border-foreground/30 bg-background text-foreground">
          SIGN OUT
        </button>
      </div>
    </>
  );

  const now = new Date();
  const weekLabel = `${getISOWeekYear(now)}-W${String(getISOWeek(now)).padStart(2, "0")}`;
  const dateLabel = format(now, "dd.MM.yyyy");

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      <SiteHeader rightSlot={controls} />
      <ScrollSectionIndicator total={10} />
      {editingProfile && (
        <Suspense fallback={null}>
          <ProfileEditor open onClose={() => setEditingProfile(false)} />
        </Suspense>
      )}
      {showSettings && (
        <Suspense fallback={null}>
          <SettingsModal open onClose={() => setShowSettings(false)} isAdmin={effectiveAdmin} />
        </Suspense>
      )}

      <main className="mx-auto max-w-[1600px] px-4 pb-8 pt-20 sm:px-10 sm:pt-32">
        <HomeMasthead week_label={weekLabel} date_label={dateLabel} />

        {/* restrained editorial interlude */}
        <div className="-mx-4 overflow-hidden border-b py-3 jp-rule sm:-mx-10 sm:py-5">
          <ScrollVelocity
            items={["MABIS", "COMMUNITY", "FRIDAY", "BANGKOK"]}
            className="font-display font-light tracking-[-0.035em] text-foreground/16 text-[clamp(1.35rem,7vw,2.15rem)] sm:text-[4.2vw]"
          />
        </div>

        <ScrollScaleRitual />

        <div className="pb-8 pt-4 sm:pb-14 sm:pt-6">
          <BirthdayBanner />
        </div>

        <div className="space-y-12 sm:space-y-24">

        <EditorialSection index="01" label="MEETING MODE">
          <MeetingModeWidget canStart={canStartMeeting} onStartMeeting={() => {
            window.dispatchEvent(new CustomEvent("startMeetingMode"));
          }} />
        </EditorialSection>

        <EditorialSection index="02" label="ANNOUNCEMENTS">
          <LazySection minHeight={360}>
            <Suspense fallback={<WidgetFallback minHeight={360} />}>
              <AnnouncementsWidget members={members} isAdmin={canManage} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="03" label="DISCUSSION">
          <LazySection minHeight={560}>
            <Suspense fallback={<WidgetFallback minHeight={560} />}>
              <DiscussionWidget members={members} isAdmin={canManage} canEditTopics={discussionCanManage} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="04" label="JOBS AND ROTATION">
          <LazySection minHeight={560}>
            <Suspense fallback={<WidgetFallback minHeight={560} />}>
              <JobsWidget members={members} isAdmin={canManage} compact={false} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="05" label="CALENDAR">
          <LazySection minHeight={620}>
            <Suspense fallback={<WidgetFallback minHeight={620} />}>
              <CalendarWidget />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="06" label="SCHEDULE">
          <LazySection minHeight={420}>
            <Suspense fallback={<WidgetFallback minHeight={420} />}>
              <ScheduleWidget isAdmin={canManage} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="07" label="LOST AND FOUND">
          <LazySection minHeight={420}>
            <Suspense fallback={<WidgetFallback minHeight={420} />}>
              <MissingItemsWidget members={members} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="08" label="LUNCH MENU">
          <LazySection minHeight={420}>
            <Suspense fallback={<WidgetFallback minHeight={420} />}>
              <LunchMenuWidget isAdmin={canManage} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="09" label="NEWS">
          <LazySection minHeight={480}>
            <Suspense fallback={<WidgetFallback minHeight={480} />}>
              <NewsWidget members={members} isAdmin={canManage} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        <EditorialSection index="10" label="MEMBERS">
          <LazySection minHeight={560}>
            <Suspense fallback={<WidgetFallback minHeight={560} />}>
              <MembersWidget isAdmin={canManage} canChangeRoles={isSummerOrBenjamin || isMinutesTaker} />
            </Suspense>
          </LazySection>
        </EditorialSection>

        </div>

        <PageFooter />
      </main>
      <IdleMount timeout={1800}>
        <Suspense fallback={null}>
          <JobReminder />
          <MabisAIAssistant />
          <FeedbackWidget />
        </Suspense>
      </IdleMount>
    </div>);
}