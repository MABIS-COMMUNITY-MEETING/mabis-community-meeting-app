import { Show, Index } from "solid-js";
import { X, Loader2, Pencil, Trash2 } from "lucide-solid";
import { Button, Input } from "~/components/ui";
import { Select } from "~/components/ui/select";
import { PRIORITY_COLORS, PRIORITY_LABELS, PRIORITY_DOT } from "~/lib/weeks";
import DiscussionDocumentEditor from "~/components/discussion/DiscussionDocumentEditor";

/*
 * TopicItem — Solid port of the TopicItem in src/components/DiscussionWidget.jsx.
 *
 * Two behaviours from the original are preserved deliberately, because both
 * were bug fixes rather than styling:
 *
 *   · The title input has NO autofocus. The rich-text editor below is
 *     lazy-loaded and mounts a beat later; autofocus would place the caret in
 *     the title, then Quill would initialise and steal it — which is why
 *     typing used to land in the document body. Focus is taken on click.
 *   · Save is disabled only while the request is in flight. An empty field
 *     explains itself on click rather than leaving a dead button the user
 *     cannot diagnose.
 *
 * `dangerouslySetInnerHTML` becomes `innerHTML` in Solid. It carries the same
 * risk and the same justification: this is rich text the editor produced, and
 * index.css sanitising guards still apply to it.
 */
export default function TopicItem(props) {
  const priority = () => props.topic.priority || 3;

  return (
    <Show when={!props.isEditing} fallback={<EditingView {...props} />}>
      <article
        class={`group relative flex items-start gap-3 overflow-hidden rounded-lg border bg-card p-3.5 pl-4 transition-colors sm:gap-4 sm:p-4 sm:pl-5 ${
          props.topic.completed ? "border-border opacity-55" : "border-border hover:border-primary/30"
        }`}
      >
        <span aria-hidden class={`absolute inset-y-0 left-0 w-[3px] ${PRIORITY_DOT[priority()]}`} />

        <input
          type="checkbox"
          checked={!!props.topic.completed}
          onChange={(e) => props.onToggle(props.topic.id, e.currentTarget.checked)}
          aria-label={props.topic.completed
            ? `Mark "${props.topic.title}" as not discussed`
            : `Mark "${props.topic.title}" as discussed`}
          class="mt-1.5 w-4 h-4 accent-primary cursor-pointer shrink-0"
        />

        <div class="flex-1 min-w-0">
          {/* Masthead line: index, who raised it, and how urgent — compact,
              widely tracked technical labels rather than coloured chips. */}
          <div class="mb-1 flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
            <Show when={typeof props.index === "number"}>
              <span class="shrink-0 text-[10px] font-bold tabular-nums tracking-[0.18em] text-muted-foreground">
                {String(props.index + 1).padStart(2, "0")}
              </span>
            </Show>
            <span class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{props.topic.submitted_by}</span>
            <span class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{PRIORITY_LABELS[priority()]}</span>
            <Show when={props.topic.completed}>
              <span class="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Discussed</span>
            </Show>
          </div>

          <p
            onClick={() => props.isAdmin && props.onEdit(props.topic)}
            class={`font-display ${props.compact ? "text-lg" : "text-xl"} font-medium leading-[1.25] tracking-[-0.02em] ${
              props.topic.completed ? "line-through text-muted-foreground" : "text-foreground"
            } ${props.isAdmin ? "cursor-pointer hover:text-primary" : ""}`}
          >
            {props.topic.title}
          </p>

          <Show when={props.topic.description}>
            <div
              onClick={() => props.isAdmin && props.onEdit(props.topic)}
              class={`theme-rich-text mt-1.5 text-sm leading-[1.6] tracking-[0.02em] text-muted-foreground prose prose-sm max-w-[68ch]
              [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
              [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1
              [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
              [&_li]:my-0.5
              [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1
              [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-1.5 [&_h2]:mb-1
              [&_p]:my-0.5
              [&_strong]:font-semibold [&_strong]:text-foreground
              [&_em]:italic ${props.isAdmin ? "cursor-pointer" : ""}`}
              innerHTML={props.topic.description}
            />
          </Show>
        </div>

        <Show when={props.isAdmin}>
          <div class="flex shrink-0 items-center gap-1">
            <button
              onClick={(e) => { e.stopPropagation(); props.onEdit(props.topic); }}
              title="Edit topic"
              aria-label={`Edit "${props.topic.title}"`}
              class="flex h-9 w-9 items-center justify-center rounded border border-border text-muted-foreground transition-colors hover:border-primary hover:text-primary"
            >
              <Pencil class="w-3.5 h-3.5" />
            </button>
            {/* Deleting is not the same weight of action as editing, so it does
                not get the same button. */}
            <button
              onClick={(e) => { e.stopPropagation(); props.onDelete(props.topic.id); }}
              title="Delete topic"
              aria-label={`Delete "${props.topic.title}"`}
              class="flex h-9 w-9 items-center justify-center rounded border border-transparent text-muted-foreground transition-colors hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </Show>
      </article>
    </Show>
  );
}

/* Editing lifts the entry off the agenda and onto a document page: a plain
   paper surface with real elevation, no accent tint competing with the
   toolbar, so the Docs-style editor inside is what reads. */
function EditingView(props) {
  const memberOptions = () => [
    { value: "All", label: "All" },
    ...(props.members || []).map((m) => ({ value: m.name, label: m.name })),
  ];

  return (
    <div class="rounded-lg border border-border bg-background p-3.5 shadow-lg sm:p-5">
      <div class="min-w-0 flex-1 space-y-4">
        <div class="flex items-center justify-between gap-3">
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Editing topic</p>
            <p class="mt-0.5 text-xs text-muted-foreground">Changes stay attached to this discussion card.</p>
          </div>
          <button
            type="button"
            onClick={() => props.onCancel()}
            class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground hover:border-border hover:text-foreground"
            title="Cancel editing"
          >
            <X class="h-4 w-4" />
          </button>
        </div>

        <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select
            value={props.editSubmittedBy}
            onChange={(v) => props.onSubmittedByChange(v)}
            options={memberOptions()}
            placeholder="Name..."
            aria-label="Submitted by"
            triggerClass="rounded-lg border-border bg-card"
          />
          {/* No autofocus — see the note at the top of this file. */}
          <Input
            placeholder="Topic title..."
            value={props.editTitle}
            onInput={(e) => props.onTitleChange(e.currentTarget.value)}
            class="rounded-lg border-border bg-card"
          />
        </div>

        <DiscussionDocumentEditor
          fallbackHeight={props.compact ? "140px" : "180px"}
          title={props.editTitle}
          onTitleChange={props.onTitleChange}
          placeholder="Write your topic description, paste screenshots, add context…"
          onChange={props.onDescriptionChange}
          minHeight={props.compact ? "140px" : "180px"}
          initialHtml={props.editDescription}
        />

        <Show when={props.error}>
          <p
            role="alert"
            class="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs font-semibold text-destructive"
          >
            {props.error}
          </p>
        </Show>

        <div class="flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
          <div class="flex flex-wrap items-center gap-1.5">
            <span class="mr-1 text-xs font-medium text-muted-foreground">Priority:</span>
            <Index each={[1, 2, 3, 4, 5]}>
              {(level) => (
                <button
                  type="button"
                  onClick={() => props.onPriorityChange(String(level()))}
                  class={`rounded-full border-2 px-2.5 py-1 text-xs font-bold transition-all ${
                    props.editPriority === String(level())
                      ? `${PRIORITY_COLORS[level()]} scale-105 border-transparent shadow`
                      : "border-border bg-card text-muted-foreground hover:border-border"
                  }`}
                >
                  {PRIORITY_LABELS[level()]}
                </button>
              )}
            </Index>
          </div>
          <div class="flex gap-2 sm:ml-auto">
            <Button type="button" variant="outline" onClick={() => props.onCancel()} class="flex-1 rounded-lg sm:flex-none">
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => props.onSave()}
              disabled={props.isSaving}
              class="flex-1 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 sm:flex-none"
            >
              <Show when={props.isSaving} fallback={"Save Changes"}>
                <Loader2 class="mr-2 h-4 w-4 animate-spin" /> Saving...
              </Show>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
