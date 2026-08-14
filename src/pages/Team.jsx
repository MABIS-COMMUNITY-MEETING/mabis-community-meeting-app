import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Users, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import MemberAvatar from "@/components/shared/MemberAvatar";
import XpBadge from "@/components/shared/XpBadge";
import OpenMoji from "@/components/OpenMoji";
import { motion } from "framer-motion";

function getLevelInfo(xp) {
  const levels = [
    { name: "Rookie", min: 0, max: 50, openMoji: "1F331" },
    { name: "Apprentice", min: 50, max: 150, openMoji: "2694" },
    { name: "Warrior", min: 150, max: 300, openMoji: "1F6E1" },
    { name: "Champion", min: 300, max: 500, openMoji: "1F3C5" },
    { name: "Legend", min: 500, max: 1000, openMoji: "1F451" },
    { name: "Mythic", min: 1000, max: Infinity, openMoji: "1F525" },
  ];
  const level = levels.find((l) => xp >= l.min && xp < l.max) || levels[0];
  const progress = ((xp - level.min) / (level.max - level.min)) * 100;
  return { ...level, progress: Math.min(progress, 100) };
}

export default function Team() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMember, setNewMember] = useState({ name: "", email: "" });
  const queryClient = useQueryClient();

  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => base44.entities.TeamMember.list("-xp", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.TeamMember.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["members"] });
      setDialogOpen(false);
      setNewMember({ name: "", email: "" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.TeamMember.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["members"] }),
  });

  const sorted = [...members].sort((a, b) => (b.xp || 0) - (a.xp || 0));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Team</h1>
          <p className="text-muted-foreground mt-1">Manage your crew and track their progress</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-accent text-white shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" /> Add Member
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">Add Team Member</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Full name..."
                value={newMember.name}
                onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                className="rounded-xl"
              />
              <Input
                placeholder="Email address..."
                type="email"
                value={newMember.email}
                onChange={(e) => setNewMember({ ...newMember, email: e.target.value })}
                className="rounded-xl"
              />
              <Button
                className="w-full rounded-xl"
                disabled={!newMember.name || !newMember.email}
                onClick={() => createMutation.mutate({ ...newMember, xp: 0, jobs_completed: 0 })}
              >
                Add to Team
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-16 bg-card rounded-2xl border border-border">
          <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-30" />
          <p className="text-lg text-muted-foreground">No team members yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add people to start the fun!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((member, i) => {
            const level = getLevelInfo(member.xp || 0);
            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="relative bg-card rounded-2xl border border-border p-6 hover:shadow-lg hover:shadow-primary/5 transition-all group"
              >
                {i === 0 && sorted.length > 1 && (
                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-amber-400 flex items-center justify-center shadow-lg">
                    <Crown className="w-4 h-4 text-white" />
                  </div>
                )}

                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-3 right-3 h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                  onClick={() => deleteMutation.mutate(member.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>

                <div className="flex flex-col items-center text-center">
                  <MemberAvatar name={member.name} size="xl" />
                  <h3 className="font-display font-bold text-foreground mt-3">{member.name}</h3>
                  <p className="text-xs text-muted-foreground">{member.email}</p>

                  <div className="flex items-center gap-2 mt-3">
                    <OpenMoji hexcode={level.openMoji} className="h-5 w-5" />
                    <span className="text-sm font-display font-semibold text-foreground">{level.name}</span>
                  </div>

                  <div className="w-full mt-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                      <span>Level Progress</span>
                      <XpBadge xp={member.xp || 0} />
                    </div>
                    <Progress value={level.progress} className="h-2 rounded-full" />
                  </div>

                  <div className="flex items-center gap-4 mt-4 text-sm">
                    <div className="text-center">
                      <p className="font-display font-bold text-foreground text-lg">{member.jobs_completed || 0}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Jobs Done</p>
                    </div>
                    <div className="w-px h-8 bg-border" />
                    <div className="text-center">
                      <p className="font-display font-bold text-foreground text-lg">#{i + 1}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Rank</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}