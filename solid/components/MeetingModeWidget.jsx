import { createSignal, onMount, onCleanup, lazy, Suspense, Show } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { Dialog as KDialog } from "@kobalte/core/dialog";
import { Video, ArrowRight, Pause, Circle, Lock, Undo2 } from "lucide-solid";
import { format, nextFriday, isFriday, getISOWeek, getYear } from "date-fns";
import { base44 } from "@/api/base44Client";
import { DialogPortal, DialogOverlay } from "~/components/ui/dialog";
import { JapaneseText } from "~/components/primitives";
import { useHomeLayout } from "~/lib/prefs";

const PasswordModal = lazy(() => import("~/components/PasswordModal"));

/*
 * Two skins, one component.
 *
 * This card is the loudest thing on Home, so it is the one widget the
 * editorial redesign rebuilt rather than restyled: ink instead of the maroon
 * gradient, square instead of rounded, hairline type instead of heavy. The
 * rest of the widgets could be returned to the original look by CSS alone,
 * this one could not.
 *
 * So the markup, the state, the handlers and the copy stay single-sourced and
 * identical — only the class strings are chosen per layout. Adding a control
 * means adding it once; adding a class means adding it to both skins.
 */
const EDITORIAL_SKIN = {
  card: "relative bg-ink ink-card text-bone border border-ink overflow-hidden select-none transition-transform duration-200",
  cardStyle: undefined,
  body: "flex flex-col items-stretch justify-between gap-5 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:p-8",
  iconTile: "flex h-11 w-11 shrink-0 items-center justify-center border border-bone/25 bg-bone/10 sm:h-14 sm:w-14",
  eyebrow: "tech-label text-bone/60 mb-1.5",
  title: "font-display text-2xl font-extralight leading-[1.05] tracking-ultra sm:text-4xl",
  date: "tech-label text-bone",
  statusChip: "flex items-center gap-2 px-3.5 py-1.5 tech-label",
  historyButton: "w-10 h-10 bg-secondary flex items-center justify-center shrink-0 transition-transform hover:scale-105 active:scale-95",
  ghostButton: "flex items-center gap-1.5 px-4 py-2 bg-bone/10 hover:bg-bone/20 text-bone tech-label border border-bone/30 transition-colors",
  unlockButton: "min-h-11 flex items-center gap-2 px-4 bg-bone/10 text-bone border border-bone/30 tech-label touch-manipulation",
  lockBadge: "w-10 h-10 bg-bone/10 flex items-center justify-center shrink-0 border border-bone/30",
  arrowBadge: "meeting-nudge w-10 h-10 bg-bone flex items-center justify-center shrink-0",
  stripe: "linear-gradient(90deg, var(--flag-1, hsl(var(--primary))), var(--flag-3, hsl(var(--secondary))), var(--flag-5, hsl(var(--primary))))",
};

/* The original: maroon gradient, deep primary glow, rounded everything. */
const SUMMER_SKIN = {
  card: "relative overflow-hidden rounded-2xl border text-bone select-none transition-transform duration-200",
  cardStyle: {
    "background-image": "linear-gradient(to bottom right, hsl(var(--primary)), hsl(var(--primary) / 0.82))",
    "border-color": "hsl(var(--primary) / 0.82)",
    "box-shadow": "0 8px 32px hsl(var(--primary) / 0.35)",
  },
  body: "flex flex-col items-stretch justify-between gap-5 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6 sm:p-6",
  iconTile: "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-bone/20 bg-bone/15",
  eyebrow: "mb-0.5 text-xs font-semibold uppercase tracking-widest text-bone/70",
  title: "font-display text-2xl font-black leading-none",
  date: "text-sm font-semibold text-bone",
  statusChip: "flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-md",
  historyButton: "w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 shadow-md transition-transform hover:scale-105 active:scale-95",
  ghostButton: "flex items-center gap-1.5 rounded-xl border border-bone/30 bg-bone/15 px-4 py-2 text-sm font-bold text-bone transition-colors hover:bg-bone/25",
  unlockButton: "min-h-11 flex items-center gap-2 rounded-xl border border-bone/30 bg-bone/15 px-4 text-sm font-bold text-bone touch-manipulation",
  lockBadge: "w-10 h-10 rounded-full bg-bone/15 flex items-center justify-center shrink-0 border border-bone/30",
  arrowBadge: "meeting-nudge w-10 h-10 rounded-full bg-bone flex items-center justify-center shrink-0 shadow-md",
  stripe: "linear-gradient(90deg, hsl(var(--secondary)), hsl(var(--bone) / 0.3), hsl(var(--secondary) / 0.4))",
};

function getNextFriday() {
  const today = new Date();
  return isFriday(today) ? today : nextFriday(today);
}

function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

const getMeetingEndedKey = () => `mabis_meeting_ended_${getCurrentWeekLabel()}`;

function weekLabelForDate(d) {
  const friday = isFriday(d) ? d : nextFriday(d);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

/*
 * MeetingModeWidget — Solid port of src/components/MeetingModeWidget.jsx.
 *
 * The hover/tap scale animations become CSS transforms on hover/active rather
 * than framer springs: they are a 1% scale on a single card, so a spring
 * simulation is far more machinery than the effect warrants, and CSS keeps it
 * on the compositor.
 *
 * The Unlock/Undo buttons keep `bg-bone/10 text-bone` — those are the classes
 * excluded from the Frutiger Aero pale-control override in index.css, which
 * is what stopped their icons turning white-on-white in that theme.
 */
export default function MeetingModeWidget(props) {
  const navigate = useNavigate();
  const defaultDate = getNextFriday();

  const [customDate, setCustomDate] = createSignal(localStorage.getItem("mabis_meeting_date") || "");
  const [meetingStatus, setMeetingStatus] = createSignal(null);
  const [meetingEnded, setMeetingEnded] = createSignal(localStorage.getItem(getMeetingEndedKey()) === "true");
  const [showPassword, setShowPassword] = createSignal(false);
  const [showUnlockPassword, setShowUnlockPassword] = createSignal(false);
  const [showDateConfirm, setShowDateConfirm] = createSignal(false);
  const [pendingDate, setPendingDate] = createSignal(format(new Date(), "yyyy-MM-dd"));

  const canStart = () => props.canStart !== false;
  const todayStr = format(new Date(), "yyyy-MM-dd");

  onMount(() => {
    const handler = (e) => {
      const status = e.detail?.status || null;
      if (status === "ended") {
        localStorage.setItem(getMeetingEndedKey(), "true");
        setMeetingEnded(true);
      } else if (status === "active" || status === "paused") {
        localStorage.removeItem(getMeetingEndedKey());
        setMeetingEnded(false);
      }
      setMeetingStatus(status);
    };
    window.addEventListener("meetingStatus", handler);
    onCleanup(() => window.removeEventListener("meetingStatus", handler));
  });

  const handleUndoEnd = () => {
    localStorage.removeItem(getMeetingEndedKey());
    setMeetingEnded(false);
    setMeetingStatus(null);
    window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: null } }));
    window.dispatchEvent(new CustomEvent("meetingUndo"));
  };

  const isFridayToday = isFriday(new Date());
  const meetingDate = () => (customDate() ? new Date(customDate()) : defaultDate);
  const isToday = () => format(meetingDate(), "yyyy-MM-dd") === todayStr;
  const isLocked = () => !meetingEnded() && !isFridayToday;

  const status = () => {
    const s = meetingStatus();
    if (!s || s === "ended") return null;
    if (s === "active") return { label: "Meeting Active", ja: "ミーティング進行中", icon: Circle, bg: "bg-green-500", text: "text-primary-foreground", style: {} };
    return { label: "Meeting Paused", ja: "ミーティング一時停止", icon: Pause, bg: "", text: "", style: { "background-color": "hsl(var(--secondary))", color: "hsl(var(--primary))" } };
  };

  const handleDateChange = (val) => {
    setCustomDate(val);
    if (val) localStorage.setItem("mabis_meeting_date", val);
    else localStorage.removeItem("mabis_meeting_date");
  };

  const handleStartFromPopup = async () => {
    handleDateChange(pendingDate());
    setShowDateConfirm(false);
    const d = new Date(pendingDate());
    if (!isFriday(d)) {
      const wl = weekLabelForDate(d);
      try {
        const existing = await base44.entities.Attendance.filter({ week_label: wl });
        if (existing.length > 0) await base44.entities.Attendance.update(existing[0].id, { meeting_date: pendingDate() });
        else await base44.entities.Attendance.create({ week_label: wl, meeting_date: pendingDate(), present_names: [] });
      } catch { /* ignore */ }
    }
    props.onStartMeeting?.();
  };

  const handleWidgetClick = () => {
    if (meetingEnded()) return;
    if (!canStart()) return;
    if (isLocked()) { setPendingDate(todayStr); setShowUnlockPassword(true); return; }
    props.onStartMeeting?.();
  };

  const interactive = () => !meetingEnded() && canStart();

  const layout = useHomeLayout();
  const skin = () => (layout() === "boss" ? EDITORIAL_SKIN : SUMMER_SKIN);

  return (
    <>
      <div
        onClick={handleWidgetClick}
        role="button"
        tabindex={0}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleWidgetClick(); } }}
        class={`${skin().card} ${interactive() ? "cursor-pointer hover:scale-[1.01] active:scale-[0.99]" : ""}`}
        style={skin().cardStyle}
      >
        <div class={skin().body}>
          <div class="flex min-w-0 items-start gap-3 sm:items-center sm:gap-5">
            <div class={skin().iconTile}>
              <Show when={meetingEnded() || isLocked() || !canStart()} fallback={<Video class="w-6 h-6" />}>
                <Lock class="w-6 h-6" />
              </Show>
            </div>
            <div class="min-w-0">
              <p class={skin().eyebrow}>
                {meetingEnded() ? "Completed"
                  : !canStart() ? "Locked"
                  : isLocked() ? "Meeting Locked until Friday"
                  : isToday() ? "Today's Meeting" : "Next Meeting"}
              </p>
              <h2 class={skin().title}>
                {meetingEnded() ? "Meeting Ended for the Week" : !canStart() ? "Meeting Mode" : "Start Meeting"}
              </h2>
              <div class="mt-1.5 flex items-center gap-2">
                <p class={skin().date}>
                  <JapaneseText
                    ja={new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(meetingDate())}
                    japaneseClass="block mt-0.5 normal-case tracking-normal text-[0.85em] opacity-80"
                  >
                    {isToday() ? format(meetingDate(), "EEEE — 'Today'") : format(meetingDate(), "EEEE, d MMMM yyyy")}
                  </JapaneseText>
                </p>
              </div>
            </div>
          </div>

          <div class="flex w-full flex-wrap items-center gap-3 sm:w-auto">
            <Show when={status()}>
              {(s) => (
                <div class={`${skin().statusChip} ${s().bg} ${s().text}`} style={s().style}>
                  {(() => { const Icon = s().icon; return <Icon class="w-4 h-4" />; })()}
                  <JapaneseText ja={s().ja} layout="inline" japaneseClass="ml-1.5 inline normal-case tracking-normal text-[0.85em]">
                    {s().label}
                  </JapaneseText>
                </div>
              )}
            </Show>

            <Show when={meetingEnded()}>
              <button
                onClick={(e) => { e.stopPropagation(); navigate("/history"); }}
                class={skin().historyButton}
                title="View History"
                aria-label="View history"
              >
                <Lock class="w-4 h-4 text-ink" />
              </button>
              <Show when={canStart()}>
                <button
                  onClick={(e) => { e.stopPropagation(); setShowPassword(true); }}
                  class={skin().ghostButton}
                  title="Undo End Meeting"
                >
                  <Undo2 class="w-4 h-4" /> Undo
                </button>
              </Show>
            </Show>

            <Show when={!meetingEnded() && isLocked() && canStart()}>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); setPendingDate(todayStr); setShowUnlockPassword(true); }}
                class={skin().unlockButton}
                aria-label="Unlock Meeting Mode"
              >
                <Lock class="w-4 h-4 text-bone/70" /> Unlock
              </button>
            </Show>

            <Show when={!meetingEnded() && !canStart()}>
              <div class={skin().lockBadge}>
                <Lock class="w-4 h-4 text-bone/70" />
              </div>
            </Show>

            <Show when={!meetingEnded() && canStart() && !isLocked()}>
              <div class={skin().arrowBadge}>
                <ArrowRight class="w-4 h-4 text-primary" />
              </div>
            </Show>
          </div>
        </div>

        <div class="h-1 w-full" style={{ background: skin().stripe }} />
      </div>

      <Suspense fallback={null}>
        <Show when={showPassword()}>
          <PasswordModal
            open
            onClose={() => setShowPassword(false)}
            onSuccess={handleUndoEnd}
            title="Undo End Meeting"
          />
        </Show>
        <Show when={showUnlockPassword()}>
          <PasswordModal
            open
            onClose={() => setShowUnlockPassword(false)}
            onSuccess={() => { setPendingDate(todayStr); setShowUnlockPassword(false); setShowDateConfirm(true); }}
            title="Unlock Meeting Mode"
          />
        </Show>
      </Suspense>

      <KDialog open={showDateConfirm()} onOpenChange={(o) => { if (!o) setShowDateConfirm(false); }}>
        <DialogPortal>
          <DialogOverlay class="mobile-sheet-backdrop z-[100] bg-black/50 backdrop-blur-sm" />
          <div class="fixed inset-0 z-[100] flex items-center justify-center p-4" data-native-cursor>
            <KDialog.Content class="mobile-sheet-panel bg-card rounded-2xl shadow-2xl max-w-md w-full p-4 sm:p-6">
              <KDialog.Title class="font-display font-bold text-foreground text-lg mb-1">
                <JapaneseText ja="今日のミーティングを始めますか？" japaneseClass="block mt-0.5 text-[0.7em] font-normal">
                  Start meeting today?
                </JapaneseText>
              </KDialog.Title>
              <KDialog.Description class="text-sm text-muted-foreground mb-4">
                This will set the meeting date to today and start it now.
              </KDialog.Description>
              <div class="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setShowDateConfirm(false)}
                  class="flex-1 py-2.5 rounded-xl border border-border text-muted-foreground font-semibold text-sm hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartFromPopup}
                  class="flex-1 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm"
                >
                  Start Meeting
                </button>
              </div>
            </KDialog.Content>
          </div>
        </DialogPortal>
      </KDialog>
    </>
  );
}
