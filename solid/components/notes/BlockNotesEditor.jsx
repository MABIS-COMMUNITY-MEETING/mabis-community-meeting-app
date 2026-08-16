import { createSignal, For, Show } from "solid-js";
import { base44 } from "@/api/base44Client";
import { Plus, Heading1, List, ImagePlus, Loader2, FileText } from "lucide-solid";
import NoteBlock from "~/components/notes/NoteBlock";
// Shared with the React build rather than forked. block_html.js is a leaf with
// zero imports — pure DOMParser/string work, no framework — so there is nothing
// for vite-plugin-solid to mis-compile, and one copy means the HTML⇄block
// contract cannot drift between the two builds.
import { parseBlocks, serializeBlocks, convertHtml, uid } from "@/components/notes/block_html";

const ADD_BTN = "flex items-center gap-1.5 h-8 px-3 tech-label text-muted-foreground border border-border hover:border-foreground hover:text-foreground transition-colors";

/*
 * Block-based document editor — 1:1 port of
 * src/components/notes/BlockNotesEditor.jsx.
 *
 * The document is a stack of blocks; click any block to edit exactly that
 * block in place. Every change autosaves via onChange — there is no save step.
 *
 * <For>, not <Index>: split() inserts into the middle of the list, so blocks
 * genuinely reorder and keyed reconciliation is what keeps the untouched rows'
 * DOM (and any caret in them) alive.
 */
export default function BlockNotesEditor(props) {
  const [blocks, setBlocks] = createSignal(parseBlocks(props.initialHtml || ""));
  const [editingId, setEditingId] = createSignal(null);
  const [uploading, setUploading] = createSignal(false);
  let fileEl;

  const emit = (next) => { setBlocks(next); props.onChange?.(serializeBlocks(next)); };

  const isEmptyHtml = (html) => !html?.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").trim();

  const commit = (id, html) => {
    let next = blocks().map((b) => (b.id === id ? { ...b, html } : b));
    if (isEmptyHtml(html)) next = next.filter((b) => b.id !== id);
    emit(next);
    setEditingId((cur) => (cur === id ? null : cur));
  };

  const split = (id, html) => {
    const fresh = { id: uid(), type: "p", html: "" };
    const next = [];
    for (const b of blocks()) {
      if (b.id === id) {
        if (!isEmptyHtml(html)) next.push({ ...b, html });
        next.push(fresh);
      } else next.push(b);
    }
    emit(next);
    setEditingId(fresh.id);
  };

  const changeType = (id, type, currentHtml) => {
    emit(blocks().map((b) => (b.id === id ? { ...b, type, html: convertHtml(b.type, type, currentHtml) } : b)));
  };

  const removeBlock = (id) => {
    emit(blocks().filter((b) => b.id !== id));
    setEditingId((cur) => (cur === id ? null : cur));
  };

  const addBlock = (type) => {
    const fresh = { id: uid(), type, html: "" };
    // Matches React: a brand-new empty block is not serialised out until it has
    // content, so this deliberately does not go through emit().
    setBlocks((prev) => [...prev, fresh]);
    setEditingId(fresh.id);
  };

  const addImage = async (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      emit([...blocks(), { id: uid(), type: "img", src: file_url }]);
    } finally {
      setUploading(false);
      input.value = "";
    }
  };

  return (
    <div class="border border-border bg-card">
      {/* status strip */}
      <div class="flex items-center gap-2 px-4 h-9 border-b border-border">
        <FileText class="w-3.5 h-3.5 text-primary" />
        <span class="tech-label text-muted-foreground">DOCUMENT CLICK A BLOCK TO EDIT IT</span>
        <span class="ml-auto tech-label text-muted-foreground" aria-live="polite">{props.status}</span>
      </div>

      <div class="px-4 sm:px-6 pt-12 pb-4 space-y-1">
        <Show when={blocks().length === 0}>
          <button
            onClick={() => addBlock("p")}
            class="w-full text-left px-3 py-6 text-sm text-muted-foreground border border-dashed border-border hover:border-foreground/50 transition-colors"
          >
            Click to start writing…
          </button>
        </Show>
        <For each={blocks()}>
          {(b) => (
            <NoteBlock
              block={b}
              editing={editingId() === b.id}
              onStartEdit={() => setEditingId(b.id)}
              onCommit={(html) => commit(b.id, html)}
              onSplit={(html) => split(b.id, html)}
              onDelete={() => removeBlock(b.id)}
              onType={(t, html) => changeType(b.id, t, html)}
            />
          )}
        </For>
      </div>

      {/* add row */}
      <div class="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 border-t border-border">
        <button onClick={() => addBlock("p")} class={ADD_BTN}><Plus class="w-3.5 h-3.5" /> TEXT</button>
        <button onClick={() => addBlock("h1")} class={ADD_BTN}><Heading1 class="w-3.5 h-3.5" /> HEADING</button>
        <button onClick={() => addBlock("ul")} class={ADD_BTN}><List class="w-3.5 h-3.5" /> LIST</button>
        <button onClick={() => fileEl?.click()} disabled={uploading()} class={ADD_BTN}>
          <Show when={uploading()} fallback={<ImagePlus class="w-3.5 h-3.5" />}><Loader2 class="w-3.5 h-3.5 animate-spin" /></Show> IMAGE
        </button>
        <input ref={fileEl} type="file" accept="image/*" class="hidden" onChange={addImage} />
      </div>
    </div>
  );
}
