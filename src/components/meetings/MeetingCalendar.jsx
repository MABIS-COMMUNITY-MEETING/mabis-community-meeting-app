import React from "react";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval, startOfWeek, endOfWeek, isToday, isSameMonth } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MeetingCalendar({ meetings, currentMonth, onMonthChange, onDayClick }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const getMeetingsForDay = (day) =>
    meetings.filter((m) => isSameDay(new Date(m.date), day));

  return (
    <div className="bg-card rounded-2xl border border-border p-5 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-display font-bold text-xl text-foreground">
          {format(currentMonth, "MMMM yyyy")}
        </h2>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => onMonthChange(-1)}
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="rounded-xl"
            onClick={() => onMonthChange(1)}
          >
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
          <div key={d} className="text-center text-[10px] font-medium text-muted-foreground uppercase tracking-wider py-2">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, i) => {
          const dayMeetings = getMeetingsForDay(day);
          const inMonth = isSameMonth(day, currentMonth);
          const today = isToday(day);

          return (
            <button
              key={i}
              onClick={() => onDayClick(day)}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                !inMonth ? "text-muted-foreground/30" : "text-foreground hover:bg-secondary"
              } ${today ? "bg-primary/10 font-bold ring-2 ring-primary/30" : ""}`}
            >
              <span>{format(day, "d")}</span>
              {dayMeetings.length > 0 && (
                <div className="flex gap-0.5 mt-0.5">
                  {dayMeetings.slice(0, 3).map((_, j) => (
                    <div key={j} className="w-1.5 h-1.5 rounded-full bg-primary" />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}