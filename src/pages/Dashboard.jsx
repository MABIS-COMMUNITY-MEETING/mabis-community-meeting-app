import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, MessageSquare, Trophy, Users, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import XpBadge from "@/components/shared/XpBadge";
import MemberAvatar from "@/components/shared/MemberAvatar";
import OpenMoji from "@/components/OpenMoji";
import JapaneseText from "@/components/JapaneseText";

function StatCard({ icon: Icon, label, ja, value, gradient, link }) {
  return (
    <Link to={link}>
      <motion.div
        whileHover={{ y: -2 }}
        className={`relative overflow-hidden rounded-2xl p-5 text-primary-foreground ${gradient} shadow-lg cursor-pointer group`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-card/10 -translate-y-6 translate-x-6" />
        <Icon className="w-6 h-6 mb-3 opacity-90" />
        <p className="text-3xl font-display font-bold">{value}</p>
        <JapaneseText as="p" ja={ja} className="text-sm opacity-80 mt-1" japaneseClassName="text-[0.85em] opacity-80">{label}</JapaneseText>
        <ArrowRight className="w-4 h-4 absolute bottom-5 right-5 opacity-0 group-hover:opacity-80 transition-opacity" />
      </motion.div>
    </Link>
  );
}

export default function Dashboard() {
  const { data: meetings = [] } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => base44.entities.Meeting.list("-date", 50),
  });

  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-created_date", 50),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 50),
  });

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.TeamMember.list("-xp", 50),
  });

  const upcomingMeetings = meetings.filter((m) => m.status === "upcoming").slice(0, 3);
  const activeJobs = jobs.filter((j) => j.status !== "completed");
  const pendingTopics = topics.filter((t) => t.status === "pending");
  const topMembers = [...members].sort((a, b) => (b.xp || 0) - (a.xp || 0)).slice(0, 5);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <JapaneseText as="h1" ja="ダッシュボード" className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight" japaneseClassName="text-base">
          Dashboard
        </JapaneseText>
        <JapaneseText as="p" ja="ミーティングの状況をひと目で" className="text-muted-foreground mt-1" japaneseClassName="text-[0.9em]">Your meeting hub at a glance</JapaneseText>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Meetings" ja="ミーティング" value={meetings.length} gradient="bg-gradient-to-br from-violet-500 to-purple-700" link="/meetings" />
        <StatCard icon={MessageSquare} label="Topics" ja="トピック" value={pendingTopics.length} gradient="bg-gradient-to-br from-pink-500 to-rose-600" link="/topics" />
        <StatCard icon={Trophy} label="Active Jobs" ja="進行中の仕事" value={activeJobs.length} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" link="/wheel" />
        <StatCard icon={Users} label="Team" ja="チーム" value={members.length} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" link="/team" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <JapaneseText as="h2" ja="次回のミーティング" className="font-display font-bold text-lg" japaneseClassName="text-xs">Upcoming Meetings</JapaneseText>
            <Link to="/meetings" className="text-sm text-primary hover:underline"><JapaneseText ja="すべて見る" layout="inline" japaneseClassName="text-[0.85em]">View all</JapaneseText></Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <JapaneseText as="p" ja="予定されているミーティングはありません" className="text-muted-foreground text-sm py-6 text-center" japaneseClassName="text-[0.85em] block mt-1">No upcoming meetings</JapaneseText>
          ) : (
            <div className="space-y-3">
              {upcomingMeetings.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-secondary/50 hover:bg-secondary transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <CalendarDays className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{m.title}</p>
                    <p className="text-xs text-muted-foreground">{format(new Date(m.date), "MMM d, yyyy · h:mm a")}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Leaderboard */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="flex items-center gap-2 font-display font-bold text-lg">
              <OpenMoji hexcode="1F3C6" className="h-5 w-5" />
              <JapaneseText ja="リーダーボード" japaneseClassName="text-xs">Leaderboard</JapaneseText>
            </h2>
            <Link to="/team" className="text-sm text-primary hover:underline"><JapaneseText ja="すべて見る" layout="inline" japaneseClassName="text-[0.85em]">View all</JapaneseText></Link>
          </div>
          {topMembers.length === 0 ? (
            <JapaneseText as="p" ja="チームメンバーがまだいません" className="text-muted-foreground text-sm py-6 text-center" japaneseClassName="text-[0.85em] block mt-1">No team members yet</JapaneseText>
          ) : (
            <div className="space-y-3">
              {topMembers.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <span className="flex w-6 items-center justify-center text-center font-display font-bold text-muted-foreground">
                    {i < 3 ? (
                      <OpenMoji
                        hexcode={["1F947", "1F948", "1F949"][i]}
                        className="h-5 w-5"
                      />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <MemberAvatar name={m.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{m.name}</p>
                    <JapaneseText as="p" ja={`${m.jobs_completed || 0}件の仕事完了`} className="text-xs text-muted-foreground" japaneseClassName="text-[0.9em]">{m.jobs_completed || 0} jobs done</JapaneseText>
                  </div>
                  <XpBadge xp={m.xp || 0} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}