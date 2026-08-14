import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/AuthContext";
import TopicCard from "@/components/topics/TopicCard";
import OpenMoji from "@/components/OpenMoji";

export default function Topics() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [newTopic, setNewTopic] = useState({ title: "", description: "" });
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: topics = [] } = useQuery({
    queryKey: ["topics"],
    queryFn: () => base44.entities.DiscussionTopic.list("-votes", 200),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.DiscussionTopic.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["topics"] });
      setDialogOpen(false);
      setNewTopic({ title: "", description: "" });
    },
  });

  const voteMutation = useMutation({
    mutationFn: async (topic) => {
      const userId = user?.id || "anon";
      const votedBy = topic.voted_by || [];
      const hasVoted = votedBy.includes(userId);

      return base44.entities.DiscussionTopic.update(topic.id, {
        votes: hasVoted ? Math.max(0, (topic.votes || 0) - 1) : (topic.votes || 0) + 1,
        voted_by: hasVoted ? votedBy.filter((v) => v !== userId) : [...votedBy, userId],
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  });

  const userId = user?.id || "anon";
  const filtered = filter === "all" ? topics : topics.filter((t) => t.status === filter);

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight">Discussion Board</h1>
          <p className="text-muted-foreground mt-1">Submit and vote on topics for the next meeting</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" /> Add Topic
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display">New Discussion Topic</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Topic title..."
                value={newTopic.title}
                onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                className="rounded-xl"
              />
              <Textarea
                placeholder="Describe what you'd like to discuss..."
                value={newTopic.description}
                onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                className="rounded-xl h-24"
              />
              <Button
                className="w-full rounded-xl"
                disabled={!newTopic.title}
                onClick={() =>
                  createMutation.mutate({
                    ...newTopic,
                    submitted_by: user?.full_name || "Anonymous",
                    votes: 0,
                    voted_by: [],
                    status: "pending",
                  })
                }
              >
                Submit Topic
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={filter} onValueChange={setFilter}>
        <TabsList className="bg-secondary rounded-xl">
          <TabsTrigger value="all" className="rounded-lg">All</TabsTrigger>
          <TabsTrigger value="pending" className="rounded-lg">
            <span className="flex items-center gap-1.5">
              <OpenMoji hexcode="1F525" className="h-4 w-4" />
              Pending
            </span>
          </TabsTrigger>
          <TabsTrigger value="discussed" className="rounded-lg">
            <span className="flex items-center gap-1.5">
              <OpenMoji hexcode="2705" className="h-4 w-4" />
              Discussed
            </span>
          </TabsTrigger>
          <TabsTrigger value="deferred" className="rounded-lg">
            <span className="flex items-center gap-1.5">
              <OpenMoji hexcode="23F3" className="h-4 w-4" />
              Deferred
            </span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg">No topics yet</p>
          <p className="text-sm mt-1">Be the first to add something to discuss!</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((topic, i) => (
            <TopicCard
              key={topic.id}
              topic={topic}
              index={i}
              hasVoted={(topic.voted_by || []).includes(userId)}
              onVote={(t) => voteMutation.mutate(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}