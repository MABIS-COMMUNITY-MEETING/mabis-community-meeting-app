import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { CalendarDays, MessageSquare, Trophy, Users, Zap, ArrowRight, CheckCircle2, Clock } from "lucide-react";
import { format } from "date-fns";
import XpBadge from "@/components/shared/XpBadge";
import MemberAvatar from "@/components/shared/MemberAvatar";

function StatCard({ icon: Icon, label, value, gradient, link }) {
  return (
    <Link to={link}>
      <motion.div
        whileHover={{ y: -2 }}
        className={`relative overflow-hidden rounded-2xl p-5 text-white ${gradient} shadow-lg cursor-pointer group`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-white/10 -translate-y-6 translate-x-6" />
        <Icon className="w-6 h-6 mb-3 opacity-90" />
        <p className="text-3xl font-display font-bold">{value}</p>
        <p className="text-sm opacity-80 mt-1">{label}</p>
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
        <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">Your meeting hub at a glance</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={CalendarDays} label="Meetings" value={meetings.length} gradient="bg-gradient-to-br from-violet-500 to-purple-700" link="/meetings" />
        <StatCard icon={MessageSquare} label="Topics" value={pendingTopics.length} gradient="bg-gradient-to-br from-pink-500 to-rose-600" link="/topics" />
        <StatCard icon={Trophy} label="Active Jobs" value={activeJobs.length} gradient="bg-gradient-to-br from-blue-500 to-indigo-600" link="/wheel" />
        <StatCard icon={Users} label="Team" value={members.length} gradient="bg-gradient-to-br from-emerald-500 to-teal-600" link="/team" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming Meetings */}
        <div className="bg-card rounded-2xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display font-bold text-lg">Upcoming Meetings</h2>
            <Link to="/meetings" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {upcomingMeetings.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No upcoming meetings</p>
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
            <h2 className="font-display font-bold text-lg">🏆 Leaderboard</h2>
            <Link to="/team" className="text-sm text-primary hover:underline">View all</Link>
          </div>
          {topMembers.length === 0 ? (
            <p className="text-muted-foreground text-sm py-6 text-center">No team members yet</p>
          ) : (
            <div className="space-y-3">
              {topMembers.map((m, i) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-secondary/50 transition-colors">
                  <span className="w-6 text-center font-display font-bold text-muted-foreground">
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`}
                  </span>
                  <MemberAvatar name={m.name} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{m.name}</p>
                    <p className="text-xs text-muted-foreground">{m.jobs_completed || 0} jobs done</p>
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