import { createSignal, createMemo, Show, For, Index } from "solid-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import {
  ChevronLeft, ChevronRight, Plus, X, Calendar, Loader2, ScanText,
  Maximize2, Pencil, Trash2,
} from "lucide-solid";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, isFriday,
  getDay, startOfWeek, endOfWeek,
} from "date-fns";
import { base44 } from "@/api/base44Client";
import { askGeminiVision } from "@/lib/geminiClient";
import { Button, Input, Textarea } from "~/components/ui";
import { Select } from "~/components/ui/select";
import { JapaneseText } from "~/components/primitives";

/*
 * CalendarWidget — Solid port of src/components/CalendarWidget.jsx.
 *
 * The four views (Month/Week/Day/Year) are defined as components rather than
 * inline JSX so each gets its own reactive scope: switching view disposes the
 * previous one's effects instead of leaving them subscribed. In React these
 * were also components, but for the opposite reason — to avoid remounting on
 * every parent re-render. Same shape, different motivation.
 */

/*
 * Event categories use semantic colour pairs, never MABIS hexes. Named themes
 * and Material schemes both define these roles, so a pill always gets its
 * foreground from the same theme-owned role as its background.
 */
const EVENT_COLORS = {
  event:    { bg: "bg-primary",     text: "text-card-foreground", label: "Event",    ja: "予定",         dot: "hsl(var(--primary))",           pill: "bg-primary text-primary-foreground" },
  holiday:  { bg: "bg-secondary",   text: "text-card-foreground", label: "Holiday",  ja: "祝日",         dot: "hsl(var(--secondary))",         pill: "bg-secondary text-secondary-foreground" },
  meeting:  { bg: "bg-destructive", text: "text-card-foreground", label: "Meeting",  ja: "ミーティング", dot: "hsl(var(--destructive))",       pill: "bg-destructive text-destructive-foreground" },
  birthday: { bg: "bg-accent",      text: "text-card-foreground", label: "Birthday", ja: "誕生日",       dot: "hsl(var(--accent))",            pill: "bg-accent text-accent-foreground" },
  other:    { bg: "bg-muted",       text: "text-card-foreground", label: "Other",    ja: "その他",       dot: "hsl(var(--muted-foreground))", pill: "border border-border bg-muted text-muted-foreground" },
};

const VIEWS = ["Day", "Month", "Year", "Week"];
const VIEW_JA = { Day: "日", Month: "月", Year: "年", Week: "週" };

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
const DAY_NAMES_JA = ["日", "月", "火", "水", "木", "金", "土"];
const DAY_NAMES_SHORT = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

const TYPE_OPTIONS = Object.entries(EVENT_COLORS).map(([value, cfg]) => ({ value, label: cfg.label }));

export default function CalendarWidget() {
  const queryClient = useQueryClient();
  let screenshotInputEl;

  const [viewDate, setViewDate] = createSignal(new Date());
  const [view, setView] = createSignal(
    typeof window !== "undefined" && window.matchMedia("(max-width: 639px)").matches ? "Day" : "Month",
  );
  const [showForm, setShowForm] = createSignal(false);
  const [selectedDay, setSelectedDay] = createSignal(null);
  const [selectedEvent, setSelectedEvent] = createSignal(null);
  const [editingId, setEditingId] = createSignal(null);
  const [newTitle, setNewTitle] = createSignal("");
  const [newDate, setNewDate] = createSignal("");
  const [newType, setNewType] = createSignal("event");
  const [newDesc, setNewDesc] = createSignal("");
  const [newTime, setNewTime] = createSignal("");
  const [importing, setImporting] = createSignal(false);
  const [importMsg, setImportMsg] = createSignal("");
  const [fullscreen, setFullscreen] = createSignal(false);

  const eventsQuery = useQuery(() => ({
    queryKey: ["calendarevents"],
    queryFn: () => base44.entities.CalendarEvent.list("-created_date", 500),
  }));

  const events = createMemo(() => [
    ...THAI_HOLIDAYS,
    ...(eventsQuery.data || []).map((e) => ({
      id: e.id, title: e.title, date: e.date, time: e.time || "",
      type: e.type, description: e.description || "",
    })),
  ]);

  const createEvent = useMutation(() => ({
    mutationFn: (data) => base44.entities.CalendarEvent.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendarevents"] }),
  }));
  const updateEvent = useMutation(() => ({
    mutationFn: ({ id, data }) => base44.entities.CalendarEvent.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendarevents"] }),
  }));
  const deleteEvent = useMutation(() => ({
    mutationFn: (id) => base44.entities.CalendarEvent.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendarevents"] }),
  }));

  const handleImportScreenshot = async (e) => {
    const file = e.currentTarget.files?.[0];
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
      });

      const parsed = result?.events || [];
      if (parsed.length === 0) {
        setImportMsg("No events found in the screenshot.");
      } else {
        const validTypes = ["event", "holiday", "meeting", "birthday", "other"];
        const norm = (s) => (s || "").trim().toLocaleLowerCase();
        const monthDay = (d) => (d || "").slice(5, 10); // "MM-DD"

        // Birthdays are matched on month+day only (the year is arbitrary in an
        // imported batch), so re-importing the same or an overlapping
        // screenshot cannot create a second copy on a slightly different year.
        const existing = new Set(
          (eventsQuery.data || []).map((ev) =>
            `${ev.type}|${norm(ev.title)}|${ev.type === "birthday" ? monthDay(ev.date) : ev.date}`),
        );

        const newEvents = [];
        let skipped = 0;
        for (const ev of parsed) {
          if (!ev.title || !ev.date) continue;
          const type = validTypes.includes(ev.type) ? ev.type : "event";
          const candidate = { ...ev, type };
          const key = `${type}|${norm(ev.title)}|${type === "birthday" ? monthDay(ev.date) : ev.date}`;
          if (existing.has(key)) { skipped++; continue; }
          existing.add(key);
          newEvents.push({
            title: ev.title,
            date: ev.date,
            type,
            description: ev.description || "",
          });
        }

        if (newEvents.length > 0) {
          await base44.entities.CalendarEvent.bulkCreate(newEvents);
          const bdayEvents = newEvents.filter((ev) => ev.type === "birthday" && ev.date);
          if (bdayEvents.length > 0) {
            base44.entities.Birthday.bulkCreate(bdayEvents.map((ev) => ({ name: ev.title, date: ev.date })));
          }
          queryClient.invalidateQueries({ queryKey: ["calendarevents"] });
          setImportMsg(`Added ${newEvents.length} item${newEvents.length !== 1 ? "s" : ""}!${skipped > 0 ? ` (skipped ${skipped} already on the calendar)` : ""}`);
        } else {
          setImportMsg("Everything in that screenshot is already on the calendar.");
        }
      }
      setTimeout(() => setImportMsg(""), 5000);
    } catch {
      setImportMsg("Could not read the screenshot. Try another image.");
      setTimeout(() => setImportMsg(""), 5000);
    }
    setImporting(false);
    if (screenshotInputEl) screenshotInputEl.value = "";
  };

  // ── navigation ────────────────────────────────────────────────────────────
  const step = (delta) => {
    const d = new Date(viewDate());
    const v = view();
    if (v === "Month") d.setMonth(d.getMonth() + delta);
    else if (v === "Week") d.setDate(d.getDate() + 7 * delta);
    else if (v === "Day") d.setDate(d.getDate() + delta);
    else d.setFullYear(d.getFullYear() + delta);
    setViewDate(d);
  };
  const goToday = () => setViewDate(new Date());

  const resetForm = () => {
    setNewTitle(""); setNewDate(""); setNewTime(""); setNewType("event");
    setNewDesc(""); setEditingId(null); setShowForm(false);
  };

  const saveEvent = () => {
    if (!newTitle().trim() || !newDate()) return;
    const payload = {
      title: newTitle().trim(), date: newDate(), time: newTime(),
      type: newType(), description: newDesc(),
    };
    if (editingId()) updateEvent.mutate({ id: editingId(), data: payload });
    else createEvent.mutate(payload);
    resetForm();
  };

  const editEvent = (ev) => {
    setEditingId(ev.id); setNewTitle(ev.title); setNewDate(ev.date);
    setNewTime(ev.time || ""); setNewType(ev.type); setNewDesc(ev.description || "");
    setSelectedEvent(null);
    setShowForm(true);
  };

  const removeEvent = (id) => {
    if (String(id).startsWith("th-")) return; // static holidays are not deletable
    deleteEvent.mutate(id);
  };

  const eventsForDay = (day) => events().filter((e) => {
    if (e.date === format(day, "yyyy-MM-dd")) return true;
    if (e.type === "birthday" && e.date) {
      const [, em, ed] = e.date.split("-");
      return em === format(day, "MM") && ed === format(day, "dd");
    }
    return false;
  });

  const headerTitle = () => {
    const v = view(), d = viewDate();
    if (v === "Month") return format(d, "MMMM yyyy");
    if (v === "Week") {
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const we = endOfWeek(d, { weekStartsOn: 0 });
      return `${format(ws, "d MMM")} – ${format(we, "d MMM yyyy")}`;
    }
    if (v === "Day") return format(d, "EEEE, d MMMM yyyy");
    return d.getFullYear().toString();
  };

  const headerTitleJa = () => {
    const v = view(), d = viewDate();
    const ja = (opts) => new Intl.DateTimeFormat("ja-JP", opts).format(d);
    if (v === "Month") return ja({ year: "numeric", month: "long" });
    if (v === "Week") {
      const ws = startOfWeek(d, { weekStartsOn: 0 });
      const we = endOfWeek(d, { weekStartsOn: 0 });
      const f = (x, o) => new Intl.DateTimeFormat("ja-JP", o).format(x);
      return `${f(ws, { month: "long", day: "numeric" })} 〜 ${f(we, { year: "numeric", month: "long", day: "numeric" })}`;
    }
    if (v === "Day") return ja({ year: "numeric", month: "long", day: "numeric", weekday: "long" });
    return `${d.getFullYear()}年`;
  };

  // ── views ─────────────────────────────────────────────────────────────────
  const MonthView = () => {
    const monthStart = () => startOfMonth(viewDate());
    const days = () => eachDayOfInterval({ start: monthStart(), end: endOfMonth(viewDate()) });
    const padDays = () => Array(getDay(monthStart())).fill(null);
    const trailingPad = () => Array((7 - ((padDays().length + days().length) % 7)) % 7).fill(null);

    return (
      <div class="min-w-[700px]">
        <div class="grid grid-cols-7 border-b border-border">
          <Index each={DAY_NAMES}>
            {(d, i) => (
              <div class="text-center py-2 text-xs font-semibold text-muted-foreground">
                <JapaneseText ja={DAY_NAMES_JA[i]} layout="inline" japaneseClass="ml-1 inline text-[0.85em]">{d()}</JapaneseText>
              </div>
            )}
          </Index>
        </div>
        <div class="grid grid-cols-7">
          <For each={padDays()}>
            {() => <div class="min-h-[80px] border-b border-r border-border bg-muted/50" />}
          </For>
          <For each={days()}>
            {(day) => {
              const dayEvents = () => eventsForDay(day);
              const isSelected = () => selectedDay() === format(day, "yyyy-MM-dd");
              return (
                <div
                  onClick={() => setSelectedDay(format(day, "yyyy-MM-dd"))}
                  class={`min-h-[80px] border-b border-r border-border p-1.5 cursor-pointer transition-colors hover:bg-muted ${isSelected() ? "bg-primary/5" : ""} ${isFriday(day) ? "bg-primary/3" : ""}`}
                >
                  <div class={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold mb-1
                    ${isToday(day) ? "bg-primary text-primary-foreground" : isFriday(day) ? "text-primary font-bold" : "text-muted-foreground"}`}>
                    {format(day, "d")}
                  </div>
                  <For each={dayEvents().slice(0, 2)}>
                    {(ev) => (
                      <div
                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                        class={`${EVENT_COLORS[ev.type].pill} text-[10px] px-1.5 py-0.5 rounded mb-0.5 truncate font-medium`}
                      >
                        {ev.title}
                      </div>
                    )}
                  </For>
                  <Show when={dayEvents().length > 2}>
                    <div class="text-[10px] text-muted-foreground font-medium">+{dayEvents().length - 2} more</div>
                  </Show>
                </div>
              );
            }}
          </For>
          <For each={trailingPad()}>
            {() => <div class="min-h-[80px] border-b border-r border-border bg-muted/50" />}
          </For>
        </div>
      </div>
    );
  };

  const WeekView = () => {
    const weekDays = () => {
      const ws = startOfWeek(viewDate(), { weekStartsOn: 0 });
      return Array.from({ length: 7 }, (_, i) => {
        const d = new Date(ws); d.setDate(ws.getDate() + i); return d;
      });
    };

    return (
      <div class="min-w-[700px]">
        <div class="grid grid-cols-7 border-b border-border">
          <For each={weekDays()}>
            {(day, i) => (
              <div class={`text-center py-3 ${isFriday(day) ? "bg-primary/5" : ""}`}>
                <p class={`text-xs font-semibold ${isFriday(day) ? "text-primary" : "text-muted-foreground"}`}>{DAY_NAMES[i()]}</p>
                <div class={`mx-auto mt-1 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                  ${isToday(day) ? "bg-primary text-primary-foreground" : isFriday(day) ? "text-primary" : "text-foreground"}`}>
                  {format(day, "d")}
                </div>
              </div>
            )}
          </For>
        </div>
        <div class="grid grid-cols-7 min-h-[200px]">
          <For each={weekDays()}>
            {(day) => (
              <div class={`border-r border-border p-2 space-y-1 ${isFriday(day) ? "bg-primary/3" : ""}`}>
                <For each={eventsForDay(day)}>
                  {(ev) => (
                    <div class={`${EVENT_COLORS[ev.type].pill} text-[11px] px-2 py-1 rounded-lg font-medium flex items-center justify-between gap-1`}>
                      <span class="truncate cursor-pointer" onClick={() => setSelectedEvent(ev)}>{ev.title}</span>
                      <button onClick={() => removeEvent(ev.id)} class="shrink-0 opacity-70 hover:opacity-100">
                        <X class="w-2.5 h-2.5" />
                      </button>
                    </div>
                  )}
                </For>
              </div>
            )}
          </For>
        </div>
      </div>
    );
  };

  const DayView = () => {
    const dayEvs = () => eventsForDay(viewDate());
    return (
      <div class="p-4">
        <div class={`rounded-xl p-4 mb-3 ${isToday(viewDate()) ? "bg-primary/5 border border-primary/20" : "bg-muted border border-border"}`}>
          <p class={`text-2xl font-bold ${isToday(viewDate()) ? "text-primary" : "text-foreground"}`}>
            {format(viewDate(), "d")}
          </p>
          <p class="text-sm text-muted-foreground">{format(viewDate(), "EEEE, MMMM yyyy")}</p>
          <Show when={isFriday(viewDate())}>
            <JapaneseText ja="コミュニティ・ミーティングの日" class="block text-xs font-semibold text-primary mt-1" japaneseClass="mt-0.5 block text-[0.9em]">
              Community Meeting Day
            </JapaneseText>
          </Show>
        </div>
        <Show
          when={dayEvs().length > 0}
          fallback={
            <JapaneseText ja="この日の予定はありません。" class="block text-sm text-muted-foreground text-center py-6" japaneseClass="mt-1 block text-[0.9em]">
              Nothing planned for this day.
            </JapaneseText>
          }
        >
          <For each={dayEvs()}>
            {(ev) => (
              <div class={`${EVENT_COLORS[ev.type].pill} rounded-xl px-4 py-3 mb-2 flex items-center justify-between`}>
                <div class="cursor-pointer" onClick={() => setSelectedEvent(ev)}>
                  <p class="font-semibold text-sm">{ev.title}</p>
                  <p class="text-xs opacity-80">
                    {ev.time ? `${ev.time} · ` : ""}{EVENT_COLORS[ev.type].label}{ev.description ? " · tap to view" : ""}
                  </p>
                </div>
                <button onClick={() => removeEvent(ev.id)} class="opacity-70 hover:opacity-100 ml-2">
                  <X class="w-4 h-4" />
                </button>
              </div>
            )}
          </For>
        </Show>
      </div>
    );
  };

  const YearView = () => {
    const year = () => viewDate().getFullYear();
    return (
      <div class="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 sm:gap-4 sm:p-4">
        <Index each={MONTH_NAMES}>
          {(monthName, mi) => {
            const mStart = () => new Date(year(), mi, 1);
            const mDays = () => eachDayOfInterval({ start: mStart(), end: endOfMonth(mStart()) });
            const pad = () => Array(getDay(mStart())).fill(null);
            const monthEvs = () => events().filter((e) =>
              e.date.startsWith(`${year()}-${String(mi + 1).padStart(2, "0")}`));

            return (
              <div
                onClick={() => { setViewDate(new Date(year(), mi, 1)); setView("Month"); }}
                class="cursor-pointer rounded-xl border border-border p-2 hover:bg-muted hover:border-primary/30 transition-all"
              >
                <p class={`text-xs font-bold mb-1.5 ${mi === new Date().getMonth() && year() === new Date().getFullYear() ? "text-primary" : "text-muted-foreground"}`}>
                  {monthName()}
                </p>
                <div class="grid grid-cols-7 gap-0">
                  <Index each={DAY_NAMES_SHORT}>
                    {(d) => <div class="text-center text-[7px] font-semibold text-muted-foreground">{d()}</div>}
                  </Index>
                  <For each={pad()}>{() => <div />}</For>
                  <For each={mDays()}>
                    {(day) => (
                      <div class={`text-center text-[8px] rounded-sm py-0.5 font-medium
                        ${isToday(day) ? "bg-primary text-primary-foreground" : isFriday(day) ? "text-primary" : "text-muted-foreground"}`}>
                        {format(day, "d")}
                      </div>
                    )}
                  </For>
                </div>
                <Show when={monthEvs().length > 0}>
                  <div class="mt-1.5 flex gap-0.5 flex-wrap">
                    <For each={monthEvs().slice(0, 3)}>
                      {(ev) => <span class="w-1.5 h-1.5 rounded-full" style={{ background: EVENT_COLORS[ev.type].dot }} />}
                    </For>
                    <Show when={monthEvs().length > 3}>
                      <span class="text-[8px] text-muted-foreground">+{monthEvs().length - 3}</span>
                    </Show>
                  </div>
                </Show>
              </div>
            );
          }}
        </Index>
      </div>
    );
  };

  return (
    <div class={fullscreen()
      ? "fixed inset-0 z-50 bg-card overflow-y-auto"
      : "mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden"}>

      <div class="mabis-widget-header bg-primary px-4 py-3 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:flex-wrap">
        <div class="flex items-center gap-2">
          <Calendar class="w-5 h-5 text-primary-foreground" />
          <h2 class="mabis-widget-title min-w-0 break-words font-display font-bold text-primary-foreground text-lg">
            <JapaneseText ja={headerTitleJa()} japaneseClass="block text-[0.6em] font-normal opacity-80 mt-0.5">
              {headerTitle()}
            </JapaneseText>
          </h2>
        </div>

        <div class="flex items-center gap-1 sm:ml-2">
          <button onClick={() => step(-1)} aria-label="Previous" class="p-1.5 rounded-lg hover:bg-card/20 text-primary-foreground transition-colors">
            <ChevronLeft class="w-4 h-4" />
          </button>
          <button
            onClick={goToday}
            class="px-3 py-1 text-xs font-semibold rounded-lg border border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 transition-colors"
          >
            Today
          </button>
          <button onClick={() => step(1)} aria-label="Next" class="p-1.5 rounded-lg hover:bg-card/20 text-primary-foreground transition-colors">
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>

        <div class="mobile-horizontal-scroll flex items-center gap-0.5 overflow-x-auto rounded-xl bg-card/10 p-1 sm:ml-auto sm:overflow-visible">
          <Index each={VIEWS}>
            {(v) => (
              <button
                onClick={() => setView(v())}
                class={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  view() === v() ? "bg-card text-primary shadow-sm" : "text-primary-foreground/80 hover:text-primary-foreground"}`}
              >
                <JapaneseText ja={VIEW_JA[v()]} layout="inline" japaneseClass="ml-1 inline text-[0.85em]">{v()}</JapaneseText>
              </button>
            )}
          </Index>
        </div>

        <div class="mabis-widget-actions flex items-center gap-2 sm:contents">
          <button
            onClick={() => { if (showForm()) resetForm(); else { setEditingId(null); setShowForm(true); } }}
            class="flex items-center justify-center gap-1 text-xs text-primary-foreground bg-card/10 hover:bg-card/20 px-2.5 py-1.5 rounded-lg border border-primary-foreground/40 font-semibold transition-colors"
          >
            <Plus class="w-3.5 h-3.5" /> Add Event
          </button>
          <button
            onClick={() => screenshotInputEl?.click()}
            disabled={importing()}
            class="flex items-center gap-1 text-xs text-primary-foreground bg-card/10 hover:bg-card/20 px-2.5 py-1.5 rounded-lg border border-primary-foreground/40 font-semibold transition-colors disabled:opacity-50"
          >
            <Show when={importing()} fallback={<ScanText class="w-3.5 h-3.5" />}>
              <Loader2 class="w-3.5 h-3.5 animate-spin" />
            </Show>
            {importing() ? "Reading..." : "Import"}
          </button>
          <input ref={screenshotInputEl} type="file" accept="image/*" class="hidden" onChange={handleImportScreenshot} />
          <button
            onClick={() => setFullscreen((f) => !f)}
            class="flex items-center gap-1 text-xs text-primary-foreground bg-card/10 hover:bg-card/20 px-2.5 py-1.5 rounded-lg border border-primary-foreground/40 font-semibold transition-colors"
          >
            <Show when={fullscreen()} fallback={<Maximize2 class="w-3.5 h-3.5" />}><X class="w-3.5 h-3.5" /></Show>
          </button>
        </div>
      </div>

      <Show when={importMsg()}>
        <div class="px-4 py-2 text-xs font-semibold text-center bg-secondary/20 text-foreground border-b border-border">
          {importMsg()}
        </div>
      </Show>

      {/* Add / edit form */}
      <Show when={showForm()}>
        <div class="border-b border-border bg-muted/40 p-4 space-y-2.5">
          <div class="grid gap-2 sm:grid-cols-2">
            <Input placeholder="Event title..." value={newTitle()} onInput={(e) => setNewTitle(e.currentTarget.value)} class="rounded-lg" />
            <Input type="date" value={newDate()} onInput={(e) => setNewDate(e.currentTarget.value)} class="rounded-lg" />
            <Input type="time" value={newTime()} onInput={(e) => setNewTime(e.currentTarget.value)} class="rounded-lg" />
            <Select value={newType()} onChange={setNewType} options={TYPE_OPTIONS} aria-label="Event type" triggerClass="rounded-lg" />
          </div>
          <Textarea placeholder="Description (optional)..." value={newDesc()} onInput={(e) => setNewDesc(e.currentTarget.value)} class="rounded-lg" rows={2} />
          <div class="flex gap-2 justify-end">
            <Button variant="outline" onClick={resetForm} class="rounded-lg">Cancel</Button>
            <Button
              onClick={saveEvent}
              disabled={!newTitle().trim() || !newDate() || createEvent.isPending || updateEvent.isPending}
              class="rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {editingId() ? "Save changes" : "Add event"}
            </Button>
          </div>
        </div>
      </Show>

      <div class="mabis-widget-body mobile-horizontal-scroll overflow-x-auto">
        <Show when={view() === "Month"}><MonthView /></Show>
        <Show when={view() === "Week"}><WeekView /></Show>
        <Show when={view() === "Day"}><DayView /></Show>
        <Show when={view() === "Year"}><YearView /></Show>
      </div>

      {/* Event detail */}
      <Show when={selectedEvent()}>
        {(ev) => (
          <div class="fixed inset-0 z-[110] flex items-center justify-center bg-black/50 p-4" onClick={() => setSelectedEvent(null)}>
            <div class="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <p class={`text-[10px] font-bold uppercase tracking-[0.18em] ${EVENT_COLORS[ev().type].text}`}>
                    <JapaneseText ja={EVENT_COLORS[ev().type].ja} layout="inline" japaneseClass="ml-1 inline normal-case tracking-normal text-[0.9em]">
                      {EVENT_COLORS[ev().type].label}
                    </JapaneseText>
                  </p>
                  <h3 class="mt-1 font-display text-xl font-bold text-foreground break-words">{ev().title}</h3>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    {ev().date}{ev().time ? ` · ${ev().time}` : ""}
                  </p>
                </div>
                <button onClick={() => setSelectedEvent(null)} aria-label="Close" class="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground hover:text-foreground">
                  <X class="h-4 w-4" />
                </button>
              </div>

              <div class="mt-4">
                <Show
                  when={ev().description}
                  fallback={<p class="text-sm text-muted-foreground italic">No description</p>}
                >
                  <p class="text-sm text-muted-foreground whitespace-pre-wrap leading-relaxed">{ev().description}</p>
                </Show>
              </div>

              <Show when={!String(ev().id).startsWith("th-")}>
                <div class="flex gap-2 mt-6">
                  <Button onClick={() => editEvent(ev())} class="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl gap-1.5 text-sm">
                    <Pencil class="w-3.5 h-3.5" /> Edit
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => { removeEvent(ev().id); setSelectedEvent(null); }}
                    class="flex-1 border-destructive/40 text-destructive hover:bg-destructive/10 rounded-xl gap-1.5 text-sm"
                  >
                    <Trash2 class="w-3.5 h-3.5" /> Delete
                  </Button>
                </div>
              </Show>
            </div>
          </div>
        )}
      </Show>

      {/* Legend */}
      <div class="flex items-center gap-3 px-4 py-3 border-t border-border flex-wrap bg-muted/50">
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span class="w-2.5 h-2.5 rounded bg-primary/20 inline-block" />
          <JapaneseText ja="金曜ミーティング" layout="inline" japaneseClass="ml-1 inline text-[0.9em]">Friday Meeting</JapaneseText>
        </div>
        <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span class="w-2.5 h-2.5 rounded-full bg-primary inline-block" />
          <JapaneseText ja="今日" layout="inline" japaneseClass="ml-1 inline text-[0.9em]">Today</JapaneseText>
        </div>
        <For each={Object.entries(EVENT_COLORS)}>
          {([type, cfg]) => (
            <div class="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span class="w-2.5 h-2.5 rounded-full inline-block" style={{ background: cfg.dot }} />
              <JapaneseText ja={cfg.ja} layout="inline" japaneseClass="ml-1 inline text-[0.9em]">{cfg.label}</JapaneseText>
            </div>
          )}
        </For>
      </div>
    </div>
  );
}
