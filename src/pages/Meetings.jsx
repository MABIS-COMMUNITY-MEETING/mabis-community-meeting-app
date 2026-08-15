import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { addMonths, format } from "date-fns";
import { Plus, CalendarDays, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger } from "@/components/ui/select";
import MeetingCalendar from "@/components/meetings/MeetingCalendar";
import JapaneseText from "@/components/JapaneseText";
import { motion } from "framer-motion";

export default function Meetings() {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newMeeting, setNewMeeting] = useState({ title: "", date: "", status: "upcoming" });
  const queryClient = useQueryClient();

  const { data: meetings = [], isLoading } = useQuery({
    queryKey: ["meetings"],
    queryFn: () => base44.entities.Meeting.list("-date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Meeting.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setDialogOpen(false);
      setNewMeeting({ title: "", date: "", status: "upcoming" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Meeting.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Meeting.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meetings"] }),
  });

  const statusColors = {
    upcoming: "bg-blue-100 text-blue-700",
    in_progress: "bg-amber-100 text-amber-700",
    completed: "bg-emerald-100 text-emerald-700",
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <JapaneseText as="h1" ja="ミーティング" className="text-3xl md:text-4xl font-display font-bold text-foreground tracking-tight" japaneseClassName="text-base">Meetings</JapaneseText>
          <JapaneseText as="p" ja="ミーティングの予定と管理" className="text-muted-foreground mt-1" japaneseClassName="text-[0.9em]">Schedule and manage your meetings</JapaneseText>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25">
              <Plus className="w-4 h-4 mr-2" /> <JapaneseText ja="新規ミーティング" layout="inline" japaneseClassName="text-[0.8em]">New Meeting</JapaneseText>
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle className="font-display"><JapaneseText ja="ミーティングを作成">Create Meeting</JapaneseText></DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <Input
                placeholder="Meeting title..."
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                className="rounded-xl"
              />
              <Input
                type="datetime-local"
                value={newMeeting.date}
                onChange={(e) => setNewMeeting({ ...newMeeting, date: e.target.value })}
                className="rounded-xl"
              />
              <Button
                className="w-full rounded-xl"
                disabled={!newMeeting.title || !newMeeting.date}
                onClick={() => createMutation.mutate(newMeeting)}
              >
                <JapaneseText ja="ミーティングを作成" layout="inline" japaneseClassName="text-[0.8em]">Create Meeting</JapaneseText>
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <MeetingCalendar
            meetings={meetings}
            currentMonth={currentMonth}
            onMonthChange={(dir) => setCurrentMonth(addMonths(currentMonth, dir))}
            onDayClick={() => {}}
          />
        </div>

        <div className="lg:col-span-2 space-y-3">
          <JapaneseText as="h2" ja="すべてのミーティング" className="font-display font-bold text-lg text-foreground" japaneseClassName="text-xs">All Meetings</JapaneseText>
          {meetings.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarDays className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <JapaneseText as="p" ja="まだミーティングがありません。作成してみましょう！" japaneseClassName="text-[0.85em] block mt-1">No meetings yet. Create one!</JapaneseText>
            </div>
          )}
          {meetings.map((m, i) => (
            <motion.div
              key={m.id}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-2xl border border-border p-4 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground truncate">{m.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(m.date), "MMM d, yyyy · h:mm a")}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={m.status}
                    onValueChange={(val) => updateMutation.mutate({ id: m.id, data: { status: val } })}
                  >
                    <SelectTrigger className="h-7 text-[10px] rounded-lg w-auto border-none">
                      <Badge className={`${statusColors[m.status]} text-[10px]`}>
                        {m.status.replace("_", " ")}
                      </Badge>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="upcoming"><JapaneseText ja="予定" layout="inline" japaneseClassName="text-[0.8em]">Upcoming</JapaneseText></SelectItem>
                      <SelectItem value="in_progress"><JapaneseText ja="進行中" layout="inline" japaneseClassName="text-[0.8em]">In Progress</JapaneseText></SelectItem>
                      <SelectItem value="completed"><JapaneseText ja="完了" layout="inline" japaneseClassName="text-[0.8em]">Completed</JapaneseText></SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 text-destructive"
                    onClick={() => deleteMutation.mutate(m.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}