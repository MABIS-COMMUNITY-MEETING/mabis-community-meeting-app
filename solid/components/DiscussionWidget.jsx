import { createSignal, createMemo, createEffect, on, onMount, onCleanup, lazy, Suspense, Show, For, Index } from "solid-js";
import { Portal } from "solid-js/web";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { A, useLocation } from "@solidjs/router";
import {
  Plus, Maximize2, X, ChevronLeft, ChevronRight, History,
  Pause, Square, MessagesSquare,
} from "lucide-solid";
import { addWeeks, subWeeks, format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { dedupeByIdentity } from "@/lib/memberIdentity";
import { Button, Input } from "~/components/ui";
import { Select } from "~/components/ui/select";
import { JapaneseText } from "~/components/primitives";
import TopicItem from "~/components/discussion/TopicItem";
import AttendancePanel from "~/components/discussion/AttendancePanel";
import {
  getWeekLabel, weekLabelToDate, formatWeekLabel, formatWeekFull,
  PRIORITY_COLORS, PRIORITY_LABELS,
} from "~/lib/weeks";

const DocsEditor = lazy(() => import("~/components/DocsEditor"));
const MabisAIAssistant = lazy(() => import("~/components/MabisAIAssistant"));
const MeetingMinutes = lazy(() => import("~/components/MeetingMinutes"));
const JobsWidget = lazy(() => import("~/components/JobsWidget"));

/*
 * DiscussionWidget — Solid port of src/components/DiscussionWidget.jsx.
 *
 * Meeting mode is a hub: the React version lazy-loads JobsWidget,
 * AnnouncementsWidget and CalendarWidget into it (the assistant, the meeting
 * notes editor and Jobs are ported and mount for real now). Announcements and
 * Calendar are not ported yet, so they still render through PendingWidget —
 * reserved space carrying the same intrinsic height the real widget will
 * take, exactly like Home's WIDGETS map. Swapping each one in later shifts
 * nothing.
 *
 * Everything else is 1:1, including the behaviours that were bug fixes:
 *   · one form for create AND edit, so a second Quill never mounts late and
 *     steals the caret;
 *   · save blocked only while in flight, so an empty field explains itself
 *     rather than leaving a dead button;
 *   · only COMPLETED topics archive out of the live view on meeting end, and a
 *     __meeting_ended__ marker is always written so history exists even when
 *     nothing was completed.
 */

function ChunkFallback(props) {
  return (
    <div class="widget-loading-shell" style={{ "--widget-fallback-height": `${props.height ?? 160}px` }} aria-hidden />
  );
}

/** Placeholder for a widget that has not been ported to Solid yet. */
function PendingWidget(props) {
  return (
    <div
      class="lazy-section-placeholder"
      style={{ "--lazy-min-height": `${props.height ?? 240}px`, "contain-intrinsic-size": `auto ${props.height ?? 240}px` }}
      aria-label={`${props.name} (not yet migrated)`}
    />
  );
}

export default function DiscussionWidget(props) {
  const location = useLocation();
  const queryClient = useQueryClient();

  const [title, setTitle] = createSignal("");
  const [description, setDescription] = createSignal("");
  const [submittedBy, setSubmittedBy] = createSignal("");
  const [priority, setPriority] = createSignal("3");
  const [showForm, setShowForm] = createSignal(false);
  const [editingTopicId, setEditingTopicId] = createSignal(null);
  // A save that fails must say so. Previously both the validation guard and a
  // rejected request returned silently, so the form sat there looking unsaved.
  const [saveError, setSaveError] = createSignal("");
  const [meetingMode, setMeetingMode] = createSignal(location.state?.startMeeting === true);
  const [meetingPaused, setMeetingPaused] = createSignal(false);
  const [weekOffset, setWeekOffset] = createSignal(0);
  const [fullscreen, setFullscreen] = createSignal(false);

  const members = () => props.members || [];

  onMount(() => {
    const start = () => { setMeetingPaused(false); setMeetingMode(true); };
    const undo = () => archiveWeek.mutate({ weekLabel: getWeekLabel(new Date()), archive: false });
    window.addEventListener("startMeetingMode", start);
    window.addEventListener("meetingUndo", undo);
    onCleanup(() => {
      window.removeEventListener("startMeetingMode", start);
      window.removeEventListener("meetingUndo", undo);
    });
  });

  // Meeting status broadcast for MeetingModeWidget.
  let wasInMeeting = false;
  let pendingAction = null; // "pause" | "end"

  createEffect(on([meetingMode, meetingPaused], ([inMeeting, paused]) => {
    const currentWeek = getWeekLabel(new Date());
    if (inMeeting) {
      wasInMeeting = true;
      localStorage.removeItem(`mabis_meeting_ended_${currentWeek}`);
      window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: paused ? "paused" : "active" } }));
    } else if (wasInMeeting) {
      wasInMeeting = false;
      if (pendingAction === "pause") {
        // Paused — do not archive; meeting stays locked and returns home.
        window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: "paused" } }));
      } else {
        localStorage.setItem(`mabis_meeting_ended_${currentWeek}`, "true");
        window.dispatchEvent(new CustomEvent("meetingStatus", { detail: { status: "ended" } }));
        archiveWeek.mutate({ weekLabel: currentWeek, archive: true });
      }
      pendingAction = null;
    }
  }));

  const viewedWeek = createMemo(() => {
    const base = new Date();
    const offset = weekOffset();
    const d = offset === 0 ? base : offset > 0 ? addWeeks(base, offset) : subWeeks(base, Math.abs(offset));
    return getWeekLabel(d);
  });
  const isCurrentWeek = () => weekOffset() === 0;

  const topicsQuery = useQuery(() => ({
    queryKey: ["topics", viewedWeek()],
    queryFn: () => base44.entities.DiscussionTopic.filter({ week_label: viewedWeek() }, "-created_date", 100),
  }));

  const viewedTopics = createMemo(() =>
    (topicsQuery.data || [])
      .filter((t) => !t.archived && t.title !== "__meeting_notes__")
      .sort((a, b) => {
        // Unticked topics rise to the top; completed ones sink.
        if (!!a.completed !== !!b.completed) return a.completed ? 1 : -1;
        return (a.priority || 3) - (b.priority || 3);
      }));

  // One entry per person: two rows sharing a name would produce two options
  // with an identical value, which a listbox cannot resolve.
  const topicSubmitters = createMemo(() => dedupeByIdentity(members()));
  const submitterOptions = createMemo(() => [
    { value: "All", label: "All" },
    ...topicSubmitters().map((m) => ({ value: m.name, label: m.name })),
  ]);

  const resetTopicForm = () => {
    setTitle(""); setDescription(""); setPriority("3");
    setSubmittedBy(""); setEditingTopicId(null); setShowForm(false);
    setSaveError("");
  };

  const toggleAddTopicForm = () => {
    if (showForm() && !editingTopicId()) { resetTopicForm(); return; }
    setEditingTopicId(null);
    setTitle(""); setDescription(""); setSubmittedBy(""); setPriority("3");
    setShowForm(true);
  };

  const saveFailed = (error) => setSaveError(
    error?.message
      ? `Could not save: ${error.message}`
      : "Could not save. Check your connection and try again — your text is still here.",
  );

  const addTopic = useMutation(() => ({
    mutationFn: (data) => base44.entities.DiscussionTopic.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["topics"] }); resetTopicForm(); },
    onError: saveFailed,
  }));

  const updateTopic = useMutation(() => ({
    mutationFn: ({ id, data }) => base44.entities.DiscussionTopic.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["topics"] }); resetTopicForm(); },
    onError: saveFailed,
  }));

  const toggleTopic = useMutation(() => ({
    mutationFn: ({ id, completed }) => base44.entities.DiscussionTopic.update(id, { completed }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  }));

  const deleteTopic = useMutation(() => ({
    mutationFn: (id) => base44.entities.DiscussionTopic.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  }));

  const archiveWeek = useMutation(() => ({
    mutationFn: async ({ weekLabel, archive }) => {
      const weekTopics = await base44.entities.DiscussionTopic.filter({ week_label: weekLabel });
      // Only completed topics leave the live view; uncompleted stay live but
      // still appear in the history snapshot.
      await Promise.all(
        weekTopics
          .filter((t) => t.title !== "__meeting_notes__" && t.title !== "__meeting_ended__" && (archive ? !!t.completed : t.archived))
          .map((t) => base44.entities.DiscussionTopic.update(t.id, { archived: archive })),
      );
      // Always record that this week's meeting happened, so history exists even
      // when nothing was completed. On undo, remove the marker.
      const marker = weekTopics.find((t) => t.title === "__meeting_ended__");
      if (archive && !marker) {
        await base44.entities.DiscussionTopic.create({
          title: "__meeting_ended__", submitted_by: "system",
          week_label: weekLabel, archived: true, completed: false,
        });
      } else if (!archive && marker) {
        await base44.entities.DiscussionTopic.delete(marker.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topics"] }),
  }));

  const handleEditTopic = (t) => {
    setShowForm(false);
    setSaveError("");
    setEditingTopicId(t.id);
    setTitle(t.title);
    setDescription(t.description || "");
    setSubmittedBy(t.submitted_by);
    setPriority(String(t.priority || 3));
  };

  const handleAdd = () => {
    if (!title().trim() || !submittedBy().trim()) {
      setSaveError(!title().trim()
        ? "Give the topic a title before saving."
        : "Choose who submitted this topic before saving.");
      return;
    }
    setSaveError("");
    if (editingTopicId()) {
      updateTopic.mutate({
        id: editingTopicId(),
        data: {
          title: title().trim(), description: description() || "",
          submitted_by: submittedBy().trim(), priority: parseInt(priority()),
        },
      });
    } else {
      addTopic.mutate({
        title: title().trim(), description: description() || "",
        submitted_by: submittedBy().trim(), completed: false,
        week_label: viewedWeek(), archived: false, priority: parseInt(priority()),
      });
    }
  };

  const isSaving = () => addTopic.isPending || updateTopic.isPending;

  const inlineEditProps = (topic) => ({
    isEditing: editingTopicId() === topic.id,
    editTitle: title(),
    editDescription: description(),
    editSubmittedBy: submittedBy(),
    editPriority: priority(),
    members: topicSubmitters(),
    error: saveError(),
    onTitleChange: setTitle,
    onDescriptionChange: setDescription,
    onSubmittedByChange: setSubmittedBy,
    onPriorityChange: setPriority,
    onSave: handleAdd,
    onCancel: resetTopicForm,
    isSaving: updateTopic.isPending,
  });

  const meetingDateLabel = () => {
    const md = localStorage.getItem("mabis_meeting_date");
    const d = md ? new Date(md) : weekLabelToDate(viewedWeek());
    return {
      en: md ? format(d, "EEEE, d MMMM yyyy") : formatWeekFull(viewedWeek()),
      ja: new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric", weekday: "long" }).format(d),
    };
  };

  const TopicForm = (formProps) => (
    <div class="border border-border rounded-xl p-4 bg-card space-y-4 shadow-lg sm:rounded-2xl sm:p-5">
      <div class="flex items-start justify-between gap-3">
        <div>
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">New topic</p>
          <p class="mt-0.5 text-xs leading-[1.6] tracking-[0.02em] text-muted-foreground">
            Give it a title, pick your name, then press Add topic.
          </p>
        </div>
        <button
          type="button"
          onClick={resetTopicForm}
          title="Close without saving"
          aria-label="Close without saving"
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-border text-muted-foreground hover:border-primary hover:text-primary"
        >
          <X class="h-4 w-4" />
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select
          value={submittedBy()}
          onChange={setSubmittedBy}
          options={submitterOptions()}
          placeholder="Name..."
          aria-label="Submitted by"
          triggerClass="rounded-lg border-border bg-card"
        />
        <Input
          placeholder="Topic title..."
          value={title()}
          onInput={(e) => setTitle(e.currentTarget.value)}
          class="rounded-lg border-border bg-card"
        />
      </div>

      <Suspense fallback={<ChunkFallback height={formProps.editorHeight ?? 180} />}>
        <DocsEditor
          title={title()}
          onTitleChange={setTitle}
          placeholder="Write your topic description, paste screenshots, add context…"
          onChange={setDescription}
          minHeight={`${formProps.editorHeight ?? 180}px`}
          initialHtml={description()}
        />
      </Suspense>

      <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
        <div class="flex items-center gap-1.5 flex-wrap">
          <span class="text-xs text-muted-foreground font-medium">Priority:</span>
          <Index each={[1, 2, 3, 4, 5]}>
            {(p) => (
              <button
                onClick={() => setPriority(String(p()))}
                class={`px-2.5 py-1 rounded-full text-xs font-bold transition-all border-2 ${
                  priority() === String(p())
                    ? `${PRIORITY_COLORS[p()]} border-transparent scale-105 shadow`
                    : "bg-card text-muted-foreground border-border hover:border-border"
                }`}
              >
                {PRIORITY_LABELS[p()]}
              </button>
            )}
          </Index>
        </div>
        <div class="flex gap-2 sm:ml-auto">
          <Button variant="outline" onClick={resetTopicForm} class="flex-1 rounded-lg sm:flex-none">Cancel</Button>
          <Button
            onClick={handleAdd}
            disabled={isSaving()}
            class="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg sm:flex-none"
          >
            {isSaving() ? "Saving..." : "Add topic"}
          </Button>
        </div>
      </div>

      <Show when={saveError()}>
        <p role="alert" class="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive">
          {saveError()}
        </p>
      </Show>
    </div>
  );

  const TopicList = (listProps) => (
    <div class="space-y-2">
      <Show when={viewedTopics().length === 0}>
        <JapaneseText
          ja="まだ議題がありません。「議題を追加」から最初の議題を追加してください。"
          class="block text-center text-muted-foreground text-sm py-8"
          japaneseClass="mt-1 block text-[0.9em]"
        >
          No topics yet. Add the first one with the Add Topic button.
        </JapaneseText>
      </Show>
      <For each={viewedTopics()}>
        {(topic, i) => (
          <TopicItem
            topic={topic}
            index={i()}
            compact={listProps.compact}
            isAdmin
            onToggle={(id, completed) => toggleTopic.mutate({ id, completed })}
            onDelete={(id) => deleteTopic.mutate(id)}
            onEdit={handleEditTopic}
            {...inlineEditProps(topic)}
          />
        )}
      </For>
    </div>
  );

  // ── MEETING MODE ─────────────────────────────────────────────────────────
  return (
    <Show when={!meetingMode()} fallback={
      <Portal>
        <div class="fixed inset-0 bg-background text-foreground z-[80] flex flex-col overflow-x-hidden">
          <div class="bg-primary px-4 sm:px-6 py-4 flex flex-col items-start gap-3 shrink-0 sm:flex-row sm:items-center sm:justify-between">
            <div class="min-w-0">
              <JapaneseText
                ja="ミーティング進行中"
                class="block text-primary-foreground-muted text-xs uppercase tracking-widest mb-0.5"
                japaneseClass="block normal-case tracking-normal text-[0.85em]"
              >
                Meeting Mode
              </JapaneseText>
              <h2 class="font-display font-bold text-primary-foreground text-lg sm:text-2xl">
                <JapaneseText ja={meetingDateLabel().ja} japaneseClass="block mt-0.5 text-[0.55em] font-normal opacity-80">
                  {meetingDateLabel().en}
                </JapaneseText>
              </h2>
            </div>
            <div class="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:items-center">
              <Button
                size="sm"
                variant="outline"
                class="border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs gap-1.5"
                onClick={() => { pendingAction = "pause"; setMeetingPaused(true); setMeetingMode(false); }}
              >
                <Pause class="w-3.5 h-3.5" /> Pause
              </Button>
              <Button
                size="sm"
                variant="outline"
                class="border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs gap-1.5"
                onClick={() => { pendingAction = "end"; setMeetingMode(false); }}
              >
                <Square class="w-3.5 h-3.5" /> End meeting
              </Button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto p-4 space-y-4 sm:p-6">
            <AttendancePanel members={members()} weekLabel={viewedWeek()} />

            <Show when={showForm() && !editingTopicId()}>
              <TopicForm editorHeight={140} />
            </Show>

            {/* Minutes — the same per-week document the normal view shows.
                Meeting mode previously had a topic list AND a separate notes
                editor; both wrote to the same __meeting_notes__ record, so they
                are now one document. */}
            <section>
              <div class="flex items-center gap-3 mb-4">
                <div class="w-1 h-6 bg-primary rounded-full" />
                <h3 class="font-display font-bold text-foreground text-xl">
                  <JapaneseText ja="議事録" layout="inline" japaneseClass="ml-1.5 inline text-[0.7em]">Minutes</JapaneseText>
                </h3>
                <span class="text-xs text-muted-foreground">{formatWeekLabel(viewedWeek())}</span>
              </div>
              <Suspense fallback={<PendingWidget name="Minutes" height={420} />}>
                <MeetingMinutes
                  weekLabel={viewedWeek()}
                  weekTitle={`Minutes — ${formatWeekFull(viewedWeek())}`}
                  canEdit={isCurrentWeek()}
                />
              </Suspense>
            </section>

            {/* Ports pending — reserved at the height each widget will occupy. */}
            <Suspense fallback={<PendingWidget name="Jobs" height={320} />}>
              <JobsWidget members={members()} isAdmin={props.isAdmin} />
            </Suspense>
            <PendingWidget name="Announcements" height={280} />
            <PendingWidget name="Calendar" height={360} />
          </div>
        </div>
        <Suspense fallback={null}><MabisAIAssistant /></Suspense>
      </Portal>
    }>
      {/* ── NORMAL MODE ────────────────────────────────────────────────────── */}
      <div class={fullscreen() ? "fixed inset-0 z-50 bg-card overflow-y-auto" : "mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden"}>
        <div class="mabis-widget-header bg-primary px-4 py-4 flex flex-col items-stretch gap-3 sticky top-0 z-10 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div class="flex items-center gap-3">
            <MessagesSquare class="w-5 h-5 text-primary-foreground" />
            <div>
              <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Discussions</h2>
              <JapaneseText
                ja={`${new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(weekLabelToDate(viewedWeek()))}の週`}
                class="block text-primary-foreground-muted text-xs mt-0.5"
                japaneseClass="block mt-0.5 text-[0.9em]"
              >
                {formatWeekLabel(viewedWeek())}
              </JapaneseText>
            </div>
          </div>

          <div class="mabis-widget-actions grid grid-cols-2 gap-2 sm:flex sm:items-center">
            <A href="/history" class="min-w-0">
              <Button
                size="sm"
                variant="outline"
                class="w-full border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs gap-1 px-2 sm:w-auto sm:px-3"
              >
                <History class="w-3.5 h-3.5" /> History
              </Button>
            </A>
            <Button
              size="sm"
              variant="outline"
              class="w-full border-primary-foreground/40 text-primary-foreground bg-primary-foreground/10 hover:bg-primary-foreground/20 text-xs gap-1 px-2 sm:w-auto sm:px-3"
              onClick={() => setFullscreen((v) => !v)}
            >
              <Show when={fullscreen()} fallback={<><Maximize2 class="w-3.5 h-3.5" /> Fullscreen</>}>
                <X class="w-3.5 h-3.5" /> Close
              </Show>
            </Button>
          </div>
        </div>

        <div class="mabis-widget-body p-4 space-y-4 sm:p-5">
          <Show when={showForm() && !editingTopicId() && isCurrentWeek()}>
            <TopicForm editorHeight={180} />
          </Show>

          {/* Week navigation */}
          <div class="flex items-center gap-1">
            <button
              onClick={() => setWeekOffset((w) => w - 1)}
              title="Show the week before this one"
              aria-label="Show the week before this one"
              class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <ChevronLeft class="w-4 h-4" />
            </button>
            <span class="text-xs text-muted-foreground font-medium flex-1 text-center">
              {isCurrentWeek() ? "This Week" : formatWeekLabel(viewedWeek())}
            </span>
            <button
              onClick={() => setWeekOffset((w) => w + 1)}
              disabled={isCurrentWeek()}
              title="Show the week after this one"
              aria-label="Show the week after this one"
              class="p-1.5 rounded-lg hover:bg-muted text-muted-foreground disabled:opacity-30"
            >
              <ChevronRight class="w-4 h-4" />
            </button>
            <Show when={!isCurrentWeek()}>
              <button onClick={() => setWeekOffset(0)} class="text-xs text-primary hover:underline px-2">
                Back to this week
              </button>
            </Show>
          </div>

          {/* Looking at an older week is read only. Say so, rather than letting
              the controls quietly disappear with no explanation. */}
          <Show when={!isCurrentWeek()}>
            <JapaneseText
              ja="過去の週を見ています。当時の議事録を表示しており、保存はされません。"
              class="block text-xs leading-[1.6] tracking-[0.02em] text-muted-foreground"
              japaneseClass="mt-1 block text-[0.9em]"
            >
              You are looking at an earlier week. Its minutes are shown as they were written and are not saved while you look through them.
            </JapaneseText>
          </Show>

          {/* Any topics this week already had are formatted into the document
              the first time it opens; the topic records themselves are left
              untouched, so History still reads them. */}
          <Suspense fallback={<PendingWidget name="Minutes" height={420} />}>
            <MeetingMinutes
              weekLabel={viewedWeek()}
              weekTitle={`Minutes — ${formatWeekFull(viewedWeek())}`}
              canEdit={isCurrentWeek()}
            />
          </Suspense>

          <div class="border-t border-border pt-4">
            <PendingWidget name="Jobs" height={240} />
          </div>
        </div>
      </div>
    </Show>
  );
}
