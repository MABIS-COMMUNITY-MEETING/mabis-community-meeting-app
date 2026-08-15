import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import SpinWheel from "@/components/wheel/SpinWheel";
import JobCard from "@/components/jobs/JobCard";
import OpenMoji from "@/components/OpenMoji";
import JapaneseText from "@/components/JapaneseText";
import { AnimatePresence } from "framer-motion";

export default function JobWheel() {
  const [selectedMember, setSelectedMember] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [newJob, setNewJob] = useState({ title: "", description: "", xp_reward: 10, due_date: "" });
  const [sendingEmail, setSendingEmail] = useState(false);
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.TeamMember.list("name", 100),
  });

  const { data: jobs = [] } = useQuery({
    queryKey: ["jobs"],
    queryFn: () => base44.entities.Job.list("-created_date", 100),
  });

  const createJobMutation = useMutation({
    mutationFn: async (data) => {
      const job = await base44.entities.Job.create(data);
      // Send email notification
      setSendingEmail(true);
      await base44.integrations.Core.SendEmail({
        to: data.assigned_to_email,
        subject: `New Job Assigned: ${data.title}`,
        body: `
          <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #8B5CF6, #EC4899); padding: 30px; border-radius: 16px; text-align: center; color: white;">
              <h1 style="margin: 0; font-size: 24px;">The Wheel Has Spoken!</h1>
              <p style="margin-top: 8px; opacity: 0.9;">You've been chosen for a new job</p>
            </div>
            <div style="background: #f8f7ff; padding: 24px; border-radius: 16px; margin-top: 16px;">
              <h2 style="color: #1e1b4b; margin: 0;">${data.title}</h2>
              ${data.description ? `<p style="color: #6b7280; margin-top: 8px;">${data.description}</p>` : ""}
              <div style="background: linear-gradient(135deg, #f59e0b, #f97316); color: white; display: inline-block; padding: 6px 16px; border-radius: 20px; font-weight: bold; margin-top: 16px;">
                ${data.xp_reward || 10} XP Reward
              </div>
              ${data.due_date ? `<p style="color: #6b7280; margin-top: 12px; font-size: 14px;">Due: ${data.due_date}</p>` : ""}
            </div>
            <p style="text-align: center; color: #9ca3af; margin-top: 16px; font-size: 14px;">Good luck!</p>
          </div>
        `,
      });
      setSendingEmail(false);
      return job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      setAssignDialogOpen(false);
      setNewJob({ title: "", description: "", xp_reward: 10, due_date: "" });
      toast({ title: "Job assigned!", description: "Email notification sent successfully." });
    },
  });

  const statusMutation = useMutation({
    mutationFn: async ({ job, status }) => {
      await base44.entities.Job.update(job.id, { status });
      // Award XP on completion
      if (status === "completed" && job.assigned_to) {
        const member = members.find((m) => m.id === job.assigned_to);
        if (member) {
          await base44.entities.TeamMember.update(member.id, {
            xp: (member.xp || 0) + (job.xp_reward || 10),
            jobs_completed: (member.jobs_completed || 0) + 1,
          });
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["members"] });
      toast({ title: "Job updated!" });
    },
  });

  const handleWheelResult = (member) => {
    setSelectedMember(member);
    setAssignDialogOpen(true);
  };

  const activeJobs = jobs.filter((j) => j.status !== "completed");
  const completedJobs = jobs.filter((j) => j.status === "completed");

  return (
    <div className="space-y-8">
      <div>
        <h1 className="flex items-center gap-3 text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">
          <OpenMoji hexcode="1F3B0" className="h-8 w-8 md:h-9 md:w-9" />
          <JapaneseText ja="ジョブホイール" japaneseClassName="text-base">Job Wheel</JapaneseText>
        </h1>
        <JapaneseText as="p" ja="ホイールを回して仕事を割り当て―幸運を祈ります！" className="text-muted-foreground mt-1" japaneseClassName="text-[0.9em]">Spin the wheel to assign jobs — may luck be on your side!</JapaneseText>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Trophy className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <JapaneseText as="p" ja="まずチームメンバーを追加してください" className="text-lg text-muted-foreground" japaneseClassName="text-[0.7em] block mt-1">Add team members first</JapaneseText>
          <JapaneseText as="p" ja="チームページで人を追加してください" className="text-sm text-muted-foreground mt-1" japaneseClassName="text-[0.85em] block mt-1">Go to the Team page to add people</JapaneseText>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Wheel Section */}
          <div className="bg-card rounded-2xl border border-border p-6 md:p-8">
            <SpinWheel members={members} onResult={handleWheelResult} />
          </div>

          {/* Active Jobs */}
          <div className="space-y-4">
            <h2 className="font-display font-bold text-lg"><JapaneseText ja={`進行中の仕事（${activeJobs.length}）`} japaneseClassName="text-xs">Active Jobs ({activeJobs.length})</JapaneseText></h2>
            <AnimatePresence>
              {activeJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm bg-card rounded-2xl border border-border">
                  <JapaneseText ja="ホイールを回して仕事を割り当てよう！" japaneseClassName="text-[0.9em] block mt-1">Spin the wheel to assign jobs!</JapaneseText>
                </div>
              ) : (
                activeJobs.map((job, i) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    index={i}
                    onStatusChange={(j, s) => statusMutation.mutate({ job: j, status: s })}
                  />
                ))
              )}
            </AnimatePresence>

            {completedJobs.length > 0 && (
              <>
                <h2 className="font-display font-bold text-lg pt-4"><JapaneseText ja={`完了（${completedJobs.length}）`} japaneseClassName="text-xs">Completed ({completedJobs.length})</JapaneseText></h2>
                {completedJobs.slice(0, 5).map((job, i) => (
                  <JobCard key={job.id} job={job} index={i} onStatusChange={() => {}} />
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {/* Assign Job Dialog */}
      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display">
              <OpenMoji hexcode="1F3AF" className="h-5 w-5" />
              Assign Job to {selectedMember?.name}
              <span lang="ja" className="text-xs font-normal text-muted-foreground">仕事を割り当てる</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <Input
              placeholder="Job title..."
              value={newJob.title}
              onChange={(e) => setNewJob({ ...newJob, title: e.target.value })}
              className="rounded-xl"
            />
            <Textarea
              placeholder="Job description..."
              value={newJob.description}
              onChange={(e) => setNewJob({ ...newJob, description: e.target.value })}
              className="rounded-xl h-20"
            />
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block"><JapaneseText ja="経験値報酬" japaneseClassName="text-[0.9em]">XP Reward</JapaneseText></label>
                <Select
                  value={String(newJob.xp_reward)}
                  onValueChange={(v) => setNewJob({ ...newJob, xp_reward: Number(v) })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">
                      <span className="flex items-center gap-2">
                        <OpenMoji hexcode="26A1" className="h-4 w-4" />
                        5 XP - Easy <span lang="ja" className="text-xs">簡単</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="10">
                      <span className="flex items-center gap-2">
                        <OpenMoji hexcode="26A1" className="h-4 w-4" />
                        10 XP - Medium <span lang="ja" className="text-xs">普通</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="25">
                      <span className="flex items-center gap-2">
                        <OpenMoji hexcode="26A1" className="h-4 w-4" />
                        25 XP - Hard <span lang="ja" className="text-xs">難しい</span>
                      </span>
                    </SelectItem>
                    <SelectItem value="50">
                      <span className="flex items-center gap-2">
                        <OpenMoji hexcode="26A1" className="h-4 w-4" />
                        50 XP - Epic! <span lang="ja" className="text-xs">特別</span>
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground font-medium mb-1 block"><JapaneseText ja="期限" japaneseClassName="text-[0.9em]">Due Date</JapaneseText></label>
                <Input
                  type="date"
                  value={newJob.due_date}
                  onChange={(e) => setNewJob({ ...newJob, due_date: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <Button
              className="w-full rounded-xl"
              disabled={!newJob.title || createJobMutation.isPending}
              onClick={() =>
                createJobMutation.mutate({
                  ...newJob,
                  assigned_to: selectedMember.id,
                  assigned_to_name: selectedMember.name,
                  assigned_to_email: selectedMember.email,
                  status: "assigned",
                })
              }
            >
              {sendingEmail ? (
                <>
                  <Send className="w-4 h-4 mr-2 animate-bounce" /> <JapaneseText ja="メールを送信中..." layout="inline" japaneseClassName="text-[0.8em]">Sending Email...</JapaneseText>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" /> <JapaneseText ja="割り当てて通知" layout="inline" japaneseClassName="text-[0.8em]">Assign & Notify</JapaneseText>
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}