import React, { useState, useRef, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Plus, X, Calendar, Loader2, ScanText, Maximize2 } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFriday, getDay,
  startOfWeek, endOfWeek } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { askGeminiVision } from "@/lib/geminiClient";

const EVENT_COLORS = {
  event:    { bg: "bg-[#951E3A]/10",  text: "text-[#951E3A]",  label: "Event",    dot: "#c98a96", pill: "bg-[#951E3A]/10 text-[#951E3A]" },
  holiday:  { bg: "bg-[#EACE54]/25",  text: "text-amber-800",  label: "Holiday",  dot: "#EACE54", pill: "bg-[#EACE54]/25 text-amber-800" },
  meeting:  { bg: "bg-[#951E3A]/20",  text: "text-[#951E3A]",  label: "Meeting",  dot: "#951E3A", pill: "bg-[#951E3A]/20 text-[#951E3A]" },
  birthday: { bg: "bg-[#EACE54]/12",  text: "text-[#951E3A]",  label: "Birthday", dot: "#d9a441", pill: "bg-[#EACE54]/12 text-[#951E3A]" },
  other:    { bg: "bg-[#EACE54]/18",  text: "text-amber-800",  label: "Other",    dot: "#b08948", pill: "bg-[#EACE54]/18 text-amber-800" },
};

const VIEWS = ["Day", "Month", "Year", "Week"];

const THAI_HOLIDAYS = [
  { id: "th-2026-01-01", title: "New Year's Day", date: "2026-01-01", type: "holiday", description: "Thailand National Holiday" },
  { id: "th-2026-01-10", title: "Children's Day", date: "2026-01-10", type: "holiday" },
  { id: "th-2026-01-16", title: "Teacher's Day", date: "2026-01-16", type: "holiday" },
  { id: "th-2026-02-17", title: "Chinese New Year", date: "2026-02-17", type: "holiday" },
  { id: "th-2026-02-28", title: "Makha Bucha Day", date: "2026-02-28", type: "holiday", description: "Buddhist holiday (lunar-based, approximate)" },
  { id: "th-2026-04-06", title: "Chakri Memorial Day", date: "2026-04-06", type: "holiday" },
  { id: "th-2026-04-13", title: "Songkran Festival", date: "2026-04-13", type: "holiday", description: "Thai New Year (Day 1 of 3)" },
  { id: "th-2026-04-14", title: "Songkran Festival", date: "2026-04-14", type: "holiday", description: "Thai New Year (Day 2 of 3)" },
  { id: "th-2026-04-15", title: "Songkran Festival", date: "2026-04-15", type: "holiday", description: "Thai New Year (Day 3 of 3)" },
  { id: "th-2026-05-01", title: "National Labour Day", date: "2026-05-01", type: "holiday" },
  { id: "th-2026-05-04", title: "Coronation Day", date: "2026-05-04", type: "holiday" },
  { id: "th-2026-05-13", title: "Royal Ploughing Ceremony", date: "2026-05-13", type: "holiday", description: "Annual ceremonial event (date approximate)" },
  { id: "th-2026-05-31", title: "Visakha Bucha Day", date: "2026-05-31", type: "holiday", description: "Buddhist holiday (lunar-based, approximate)" },
  { id: "th-2026-07-20", title: "Asalha Bucha Day", date: "2026-07-20", type: "holiday", description: "Buddhist holiday (lunar-based, approximate)" },
  { id: "th-2026-07-21", title: "Buddhist Lent (Khao Phansa)", date: "2026-07-21", type: "holiday", description: "Start of Buddhist Lent (lunar-based, approximate)" },
  { id: "th-2026-07-28", title: "King's Birthday", date: "2026-07-28", type: "holiday", description: "H.M. King Maha Vajiralongkorn's Birthday" },
  { id: "th-2026-08-12", title: "Queen's Birthday / Mother's Day", date: "2026-08-12", type: "holiday", description: "H.M. Queen Sirikit's Birthday" },
  { id: "th-2026-10-13", title: "King Bhumibol Memorial Day", date: "2026-10-13", type: "holiday" },
  { id: "th-2026-10-23", title: "King Chulalongkorn Memorial Day", date: "2026-10-23", type: "holiday" },
  { id: "th-2026-12-05", title: "King Bhumibol's Birthday / Father's Day", date: "2026-12-05", type: "holiday" },
  { id: "th-2026-12-10", title: "Constitution Day", date: "2026-12-10", type: "holiday" },
  { id: "th-2026-12-31", title: "New Year's Eve", date: "2026-12-31", type: "holiday" },
];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_NAMES_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export default function CalendarWidget() {
  const [viewDate, setViewDate] = useState(new Date());
  const [view, setView] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches
      ? "Day"
      : "Month"
  );
  const queryClient = useQueryClient();
  const eventYear = viewDate.getFullYear();
  const { data: dbEvents = [] } = useQuery({
    queryKey: ["calendarevents", eventYear],
    queryFn: () => base44.entities.CalendarEvent.filter({
      date: {
        $gte: `${eventYear - 1}-12-20`,
        $lte: `${eventYear + 1}-01-10`,
      },
    }),
  });
  const events = useMemo(() => [
    ...THAI_HOLIDAYS,
    ...dbEvents.map(e => ({ id: e.id, title: e.title, date: e.date, time: e.time || "", type: e.type, description: e.description || "" })),
  ], [dbEvents]);

  const createEventMutation = useMutation({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendarevents"] }),
  });
  const updateEventMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendarevents"] }),
  });
  const deleteEventMutation = useMutation({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendarevents"] }),
  });
  const [showForm, setShowForm] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDate, setNewDate] = useState("");
  const [newType, setNewType] = useState("event");
  const [newDesc, setNewDesc] = useState("");
  const [newTime, setNewTime] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const screenshotInputRef = useRef(null);
  const [fullscreen, setFullscreen] = useState(false);

  const handleImportScreenshot = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    try {
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(",")[1]);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const result = await askGeminiVision({
        prompt: `Analyze this screenshot/image of a calendar, schedule, class birthday list, or event list. Extract ALL events, holidays, meetings, birthdays, or important dates visible. For each item: title, date (YYYY-MM-DD format; for birthdays without a year use ${new Date().getFullYear()} as the year), type (one of: "event", "holiday", "meeting", "birthday", "other"), and optional description. For birthdays, set the title to the person's name and type to "birthday". Return JSON: { "events": [...] }.`,
        imageBase64: base64,
        mimeType: file.type || "image/jpeg",
      });
      const extracted = result.events || [];
      if (extracted.length === 0) {
        setImportMsg("No events found in the screenshot.");
      } else {
        const validTypes = ["event", "holiday", "meeting", "birthday", "other"];
        const newEvents = extracted.map(ev => ({
          title: ev.title || "Untitled",
          date: ev.date,
          type: validTypes.includes(ev.type) ? ev.type : "event",
          description: ev.description || ""
        }));
        if (newEvents.length > 0) {
          base44.entities.CalendarEvent.bulkCreate(newEvents).catch(() => {});
        }
        const bdayEvents = newEvents.filter(ev => ev.type === "birthday" && ev.date);
        if (bdayEvents.length > 0) {
          base44.entities.Birthday.bulkCreate(
            bdayEvents.map(ev => ({ name: ev.title, date: ev.date }))
          ).catch(() => {});
        }
        setImportMsg(`Added ${newEvents.length} item${newEvents.length !== 1 ? "s" : ""}!`);
      }
      setTimeout(() => setImportMsg(""), 5000);
    } catch (err) {
      setImportMsg("Could not read the screenshot. Try another image.");
      setTimeout(() => setImportMsg(""), 5000);
    }
    setImporting(false);
    e.target.value = "";
  };

  const goBack = () => {
    const d = new Date(viewDate);
    if (view === "Month") d.setMonth(d.getMonth() - 1);
    else if (view === "Week") d.setDate(d.getDate() - 7);
    else if (view === "Day") d.setDate(d.getDate() - 1);
    else d.setFullYear(d.getFullYear() - 1);
    setViewDate(d);
  };
  const goForward = () => {
    const d = new Date(viewDate);
    if (view === "Month") d.setMonth(d.getMonth() + 1);
    else if (view === "Week") d.setDate(d.getDate() + 7);
    else if (view === "Day") d.setDate(d.getDate() + 1);
    else d.setFullYear(d.getFullYear() + 1);
    setViewDate(d);
  };
  const goToday = () => setViewDate(new Date());

  const resetForm = () => {
    setNewTitle(""); setNewDate(""); setNewTime(""); setNewType("event"); setNewDesc("");
    setEditingId(null); setShowForm(false);
  };
  const saveEvent = () => {
    if (!newTitle.trim() || !newDate) return;
    const payload = { title: newTitle.trim(), date: newDate, time: newTime, type: newType, description: newDesc };
    const existing = dbEvents.find(e => e.id === editingId);
    if (existing) updateEventMutation.mutate({ id: editingId, data: payload });
    else createEventMutation.mutate(payload);
    resetForm();
  };
  const editEvent = (ev) => {
    setEditingId(ev.id); setNewTitle(ev.title); setNewDate(ev.date); setNewTime(ev.time || "");
    setNewType(ev.type); setNewDesc(ev.description || "");
    setShowForm(true); setSelectedEvent(null);
  };
  const removeEvent = (id) => {
    if (String(id).startsWith("th-")) return; // static holidays aren't deletable
    deleteEventMutation.mutate(id);
  };
  const eventsForDay = (day) => events.filter(e => {
    if (e.date === format(day, "yyyy-MM-dd")) return true;
    if (e.type === "birthday" && e.date) {
      const [, em, ed] = e.date.split("-");
      return em === format(day, "MM") && ed === format(day, "dd");
    }
    return false;
  });

  const headerTitle = () => {
    if (view === "Month") return format(viewDate, "MMMM yyyy");
    if (view === "Week") {
      const ws = startOfWeek(viewDate, { weekStartsOn: 0 });
      const we = endOfWeek(viewDate, { weekStartsOn: 0 });
      return `${format(ws, "d MMM")} – ${format(we, "d MMM yyyy")}`;
    }
    if (view === "Day") return format(viewDate, "EEEE, d MMMM yyyy");
    return viewDate.getFullYear().toString();
  };

  // ── Month view ───────────────────────────────────────────────────────────────
  const MonthView = () => {
    const monthStart = startOfMonth(viewDate);
    const monthEnd = endOfMonth(viewDate);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startPad = getDay(monthStart);
    const padDays = Array(startPad).fill(null);
    const trailingPad = Array((7 - ((padDays.length + days.length) % 7)) % 7).fill(null);

    return (
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {DAY_NAMES.map((d, i) => (
            <div key={i} className={`text-center text-xs font-semibold py-2 ${i === 5 ? "text-[#951E3A]" : "text-gray-400"}`}>{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {padDays.map((_, i) => (
            <div key={`p${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50/50" />
          ))}
          {days.map((day) => {
            const isFri = isFriday(day);
            const today = isToday(day);
            const dayEvents = eventsForDay(day);
            const isSelected = selectedDay === format(day, "yyyy-MM-dd");
            return (
              <div key={format(day, "yyyy-MM-dd")}
                onClick={() => setSelectedDay(format(day, "yyyy-MM-dd"))}
                className={`min-h-[80px] border-b border-r border-gray-100 p-1.5 cursor-pointer transition-colors
                  ${isSelected ? "bg-blue-50" : isFri ? "bg-[#951E3A]/3 hover:bg-[#951E3A]/6" : "hover:bg-gray-50"}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-semibold mb-1 transition-colors
                  ${today ? "bg-[#951E3A] text-white" : isFri ? "text-[#951E3A] font-bold" : "text-gray-600"}`}>
                  {format(day, "d")}
                </div>
                {dayEvents.slice(0, 2).map(ev => (
                  <div key={ev.id}
                    onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                    className={`${EVENT_COLORS[ev.type].pill} text-[10px] px-1.5 py-0.5 rounded-md truncate mb-0.5 font-medium cursor-pointer hover:opacity-90`}>
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[10px] text-gray-400 font-medium">+{dayEvents.length - 2} more</div>
                )}
              </div>
            );
          })}
          {trailingPad.map((_, i) => (
            <div key={`t${i}`} className="min-h-[80px] border-b border-r border-gray-100 bg-gray-50/50" />
          ))}
        </div>
      </div>
    );
  };

  // ── Week view ─────────────────────────────────────────────────────────────────
  const WeekView = () => {
    const ws = startOfWeek(viewDate, { weekStartsOn: 0 });
    const weekDays = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws); d.setDate(ws.getDate() + i); return d;
    });
    return (
      <div className="min-w-[700px]">
        <div className="grid grid-cols-7 border-b border-gray-100">
          {weekDays.map((day, i) => (
            <div key={i} className={`text-center py-3 ${isFriday(day) ? "bg-[#951E3A]/5" : ""}`}>
              <p className={`text-xs font-semibold ${isFriday(day) ? "text-[#951E3A]" : "text-gray-400"}`}>{DAY_NAMES[i]}</p>
              <div className={`mx-auto mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                ${isToday(day) ? "bg-[#951E3A] text-white" : isFriday(day) ? "text-[#951E3A]" : "text-gray-700"}`}>
                {format(day, "d")}
              </div>
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7 min-h-[200px]">
          {weekDays.map((day, i) => {
            const dayEvs = eventsForDay(day);
            return (
              <div key={i} className={`border-r border-gray-100 p-2 space-y-1 ${isFriday(day) ? "bg-[#951E3A]/3" : ""}`}>
                {dayEvs.map(ev => (
                  <div key={ev.id} className={`${EVENT_COLORS[ev.type].pill} text-[11px] px-2 py-1 rounded-lg font-medium flex items-center justify-between gap-1`}>
                    <span className="truncate cursor-pointer" onClick={() => setSelectedEvent(ev)}>{ev.title}</span>
                    <button onClick={() => removeEvent(ev.id)} className="shrink-0 opacity-70 hover:opacity-100"><X className="w-2.5 h-2.5" /></button>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ── Day view ──────────────────────────────────────────────────────────────────
  const DayView = () => {
    const dayEvs = eventsForDay(viewDate);
    return (
      <div className="p-4">
        <div className={`rounded-xl p-4 mb-3 ${isToday(viewDate) ? "bg-[#951E3A]/5 border border-[#951E3A]/20" : "bg-gray-50 border border-gray-100"}`}>
          <p className={`text-2xl font-bold ${isToday(viewDate) ? "text-[#951E3A]" : "text-gray-800"}`}>
            {format(viewDate, "d")}
          </p>
          <p className="text-sm text-gray-500">{format(viewDate, "EEEE, MMMM yyyy")}</p>
          {isFriday(viewDate) && <p className="text-xs font-semibold text-[#951E3A] mt-1">Community Meeting Day</p>}
        </div>
        {dayEvs.length === 0
          ? <p className="text-sm text-gray-400 text-center py-6">No events this day</p>
          : dayEvs.map(ev => (
            <div key={ev.id} className={`${EVENT_COLORS[ev.type].pill} rounded-xl px-4 py-3 mb-2 flex items-center justify-between`}>
              <div className="cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                <p className="font-semibold text-sm">{ev.title}</p>
                <p className="text-xs opacity-80">{ev.time ? `${ev.time} · ` : ""}{EVENT_COLORS[ev.type].label}{ev.description ? " · tap to view" : ""}</p>
              </div>
              <button onClick={() => removeEvent(ev.id)} className="opacity-70 hover:opacity-100 ml-2"><X className="w-4 h-4" /></button>
            </div>
          ))
        }
      </div>
    );
  };

  // ── Year view ─────────────────────────────────────────────────────────────────
  const YearView = () => {
    const year = viewDate.getFullYear();
    return (
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 sm:gap-4 sm:p-4">
        {MONTH_NAMES.map((monthName, mi) => {
          const mStart = new Date(year, mi, 1);
          const mEnd = endOfMonth(mStart);
          const mDays = eachDayOfInterval({ start: mStart, end: mEnd });
          const pad = getDay(mStart);
          const monthEvs = events.filter(e => e.date.startsWith(`${year}-${String(mi + 1).padStart(2, "0")}`));
          return (
            <div key={mi} onClick={() => { setViewDate(new Date(year, mi, 1)); setView("Month"); }}
              className="cursor-pointer rounded-xl border border-gray-100 p-2 hover:bg-gray-50 hover:border-[#951E3A]/30 transition-all">
              <p className={`text-xs font-bold mb-1.5 ${mi === new Date().getMonth() && year === new Date().getFullYear() ? "text-[#951E3A]" : "text-gray-600"}`}>
                {monthName}
              </p>
              <div className="grid grid-cols-7 gap-0">
                {DAY_NAMES_SHORT.map((d, i) => (
                  <div key={i} className="text-center text-[7px] font-semibold text-gray-300">{d}</div>
                ))}
                {Array(pad).fill(null).map((_, i) => <div key={`p${i}`} />)}
                {mDays.map(day => (
                  <div key={format(day, "d")}
                    className={`text-center text-[8px] rounded-sm py-0.5 font-medium
                      ${isToday(day) ? "bg-[#951E3A] text-white" : isFriday(day) ? "text-[#951E3A]" : "text-gray-500"}`}>
                    {format(day, "d")}
                  </div>
                ))}
              </div>
              {monthEvs.length > 0 && (
                <div className="mt-1.5 flex gap-0.5 flex-wrap">
                  {monthEvs.slice(0, 3).map(ev => (
                    <span key={ev.id} className="w-1.5 h-1.5 rounded-full" style={{ background: EVENT_COLORS[ev.type].dot }} />
                  ))}
                  {monthEvs.length > 3 && <span className="text-[8px] text-gray-400">+{monthEvs.length - 3}</span>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`mabis-widget bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${fullscreen ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      {/* Header — Google Calendar style */}
      <div className="mabis-widget-header bg-[#951E3A] px-4 py-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-5 h-5 text-white" />
          <h2 className="mabis-widget-title min-w-0 break-words font-display font-bold text-white text-lg">{headerTitle()}</h2>
        </div>
        <div className="flex items-center gap-1 sm:ml-2">
          <button onClick={goBack} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday}
            className="px-3 py-1 text-xs font-semibold rounded-lg border border-white/40 text-white bg-white/10 hover:bg-white/20 transition-colors">
            Today
          </button>
          <button onClick={goForward} className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* View tabs */}
        <div className="mobile-horizontal-scroll flex items-center gap-0.5 overflow-x-auto rounded-xl bg-white/10 p-1 sm:ml-auto sm:overflow-visible">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                view === v ? "bg-white text-[#951E3A] shadow-sm" : "text-white/80 hover:text-white"}`}>
              {v}
            </button>
          ))}
        </div>

        <div className="mabis-widget-actions flex items-center gap-2 sm:contents">
        <button onClick={() => { if (showForm) { resetForm(); } else { setEditingId(null); setShowForm(true); } }}
          className="flex items-center justify-center gap-1 text-xs text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg border border-white/40 font-semibold transition-colors">
          <Plus className="w-3.5 h-3.5" /> Add Event
        </button>
        <button onClick={() => screenshotInputRef.current?.click()} disabled={importing}
          className="flex items-center gap-1 text-xs text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg border border-white/40 font-semibold transition-colors disabled:opacity-50">
          {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
          {importing ? "Reading..." : "Import"}
        </button>
        <input ref={screenshotInputRef} type="file" accept="image/*" className="hidden" onChange={handleImportScreenshot} />
        {fullscreen ? (
          <button onClick={() => setFullscreen(false)}
            className="flex items-center gap-1 text-xs text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg border border-white/40 font-semibold transition-colors">
            <X className="w-3.5 h-3.5" /> Close
          </button>
        ) : (
          <button onClick={() => setFullscreen(true)}
            className="flex items-center gap-1 text-xs text-white bg-white/10 hover:bg-white/20 px-2.5 py-1.5 rounded-lg border border-white/40 font-semibold transition-colors">
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}
        </div>
      </div>

      {importMsg && (
        <div className="px-4 py-2 bg-purple-50 border-b border-purple-100 text-xs font-semibold text-purple-700">
          {importMsg}
        </div>
      )}

      {/* Add event form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-gray-100 bg-gray-50"
          >
            <div className="px-4 py-3 space-y-2">
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
                <Input placeholder="Event title..." value={newTitle} onChange={e => setNewTitle(e.target.value)}
                  className="rounded-lg border-gray-200 text-sm h-9 flex-1 min-w-0 sm:min-w-[160px]" />
                <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 text-sm h-9 bg-white text-gray-700 focus:outline-none focus:border-[#951E3A]/50" />
                <input type="time" value={newTime} onChange={e => setNewTime(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 text-sm h-9 bg-white text-gray-700 focus:outline-none focus:border-[#951E3A]/50" />
              </div>
              <Textarea placeholder="Description (optional)..." value={newDesc} onChange={e => setNewDesc(e.target.value)}
                className="rounded-lg border-gray-200 text-sm min-h-[60px]" />
              <div className="mobile-horizontal-scroll flex items-center gap-2 overflow-x-auto pb-1">
                {Object.entries(EVENT_COLORS).map(([type, cfg]) => (
                  <button key={type} onClick={() => setNewType(type)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all ${newType === type ? cfg.bg + " " + cfg.text + " border-transparent" : "bg-white text-gray-400 border-gray-200"}`}>
                    {cfg.label}
                  </button>
                ))}
                <Button onClick={saveEvent} disabled={!newTitle.trim() || !newDate}
                  size="sm" className="ml-auto bg-[#951E3A] hover:bg-[#7a1830] text-white h-7 text-xs rounded-lg">
                  {editingId ? "Update" : "Save"}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Calendar body */}
      <div className="mobile-horizontal-scroll overflow-x-auto">
        {view === "Month" && <MonthView />}
        {view === "Week" && <WeekView />}
        {view === "Day" && <DayView />}
        {view === "Year" && <YearView />}
      </div>

      {/* Event detail modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="mobile-sheet-backdrop fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedEvent(null)}>
            <motion.div
              initial={{ scale: 0.95, y: 10 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0 }}
              className="mobile-sheet-panel bg-white rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6"
              onClick={e => e.stopPropagation()}>
              <div className="flex items-start justify-between gap-3 mb-3">
                <div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${EVENT_COLORS[selectedEvent.type].pill}`}>
                    {EVENT_COLORS[selectedEvent.type].label}
                  </span>
                  <h3 className="text-xl font-display font-bold text-gray-800 mt-2">{selectedEvent.title}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">{format(new Date(selectedEvent.date), "EEEE, d MMMM yyyy")}{selectedEvent.time ? ` · ${selectedEvent.time}` : ""}</p>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-1 rounded-lg hover:bg-gray-100 text-gray-400">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {selectedEvent.description
                ? <p className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed">{selectedEvent.description}</p>
                : <p className="text-sm text-gray-300 italic">No description</p>}
              <div className="flex gap-2 mt-6">
                <Button onClick={() => editEvent(selectedEvent)}
                  className="flex-1 bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-xl gap-1.5 text-sm">
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
                <Button variant="outline" onClick={() => { removeEvent(selectedEvent.id); setSelectedEvent(null); }}
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 rounded-xl gap-1.5 text-sm">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Legend */}
      <div className="flex items-center gap-3 px-4 py-3 border-t border-gray-100 flex-wrap bg-gray-50/50">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="w-2.5 h-2.5 rounded bg-[#951E3A]/20 inline-block" /> Friday Meeting
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
          <span className="w-2.5 h-2.5 rounded-full bg-[#951E3A] inline-block" /> Today
        </div>
        {Object.entries(EVENT_COLORS).map(([type, cfg]) => (
          <div key={type} className="flex items-center gap-1.5 text-[11px] text-gray-400">
            <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: cfg.dot }} /> {cfg.label}
          </div>
        ))}
      </div>
    </div>
  );
}