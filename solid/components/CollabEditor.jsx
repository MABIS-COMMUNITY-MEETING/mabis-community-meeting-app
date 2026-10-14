import { createSignal, onMount, onCleanup, Show, For } from "solid-js";
import { base44 } from "@/api/base44Client";
import { useAuth } from "~/lib/AuthContext";
import { Quill, Delta, sanitizePastedHtml } from "~/lib/quill-setup";
import { createCollabDoc } from "~/lib/collab-doc";
import "quill/dist/quill.snow.css";

/*
 * CollabEditor — a standalone collaborative rich-text editor in SolidJS,
 * modelled on MazenSamehR/collaborative-text-editor.
 *
 * The reference app is React + Quill + socket.io with a separate Node/Mongo
 * server. This is the SolidJS port for Base44: Quill renders the document, the
 * MeetingDoc actor provides the real-time OT channel (replacing socket.io),
 * and a `Document` entity replaces Mongo. The shape matches the reference —
 * create/join by id, debounced auto-save, rename, and a save-status pill.
 *
 * Real-time collaboration reuses the existing OT stack (collab-doc.js +
 * ot-client.js + the MeetingDoc actor). If the actor is unreachable the
 * editor degrades gracefully to a single-user editor with save/load: the
 * collab session never connects, so every client persists its own copy —
 * the same fallback MeetingMinutes relies on.
 */

const SAVE_DEBOUNCE_MS = 2000;

const TOOLBAR_OPTIONS = [
  [{ header: [1, 2, 3, 4, 5, 6, false] }],
  [{ font: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  ["bold", "italic", "underline"],
  [{ color: [] }, { background: [] }],
  [{ script: "sub" }, { script: "super" }],
  [{ align: [] }],
  ["image", "blockquote", "code-block"],
  ["clean"],
];

function roomIdFor(id) {
  return `doc-${String(id || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}

function statusText(state, lastSavedAt) {
  switch (state) {
    case "loading": return "Loading";
    case "saving": return "Saving…";
    case "saved":
      if (!lastSavedAt) return "Saved";
      return `Saved at ${new Date(lastSavedAt).toLocaleTimeString([], {
        hour: "2-digit", minute: "2-digit",
      })}`;
    case "error": return "Save failed";
    default: return "Ready";
  }
}

export default function CollabEditor(props) {
  const auth = useAuth();
  const documentId = () => props.documentId;

  const [saveState, setSaveState] = createSignal("loading");
  const [lastSavedAt, setLastSavedAt] = createSignal(null);
  const [docName, setDocName] = createSignal("Untitled document");
  const [collabSession, setCollabSession] = createSignal(null);

  let quill = null;
  let collab = null;
  let saveTimer = null;
  let recordId = null;
  let containerRef = null;
  let loaded = false;

  const shouldPersist = () => !collab || !collab.connected() || collab.isWriter();

  const flushSave = (immediate = false) => {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
    if (!quill || !loaded) return;
    if (!shouldPersist()) return;

    const executeSave = () => {
      const html = quill.root.innerHTML;
      setSaveState("saving");
      const op = recordId
        ? base44.entities.Document.update(recordId, { name: docName(), content: html })
        : base44.entities.Document.create({ name: docName(), content: html });
      op.then((record) => {
        if (!recordId && record?.id) recordId = record.id;
        setSaveState("saved");
        setLastSavedAt(Date.now());
      }).catch((error) => {
        console.error("Failed to save document", error);
        setSaveState("error");
      });
    };

    if (immediate) { setSaveState("saving"); executeSave(); return; }
    setSaveState("saving");
    saveTimer = setTimeout(executeSave, SAVE_DEBOUNCE_MS);
  };

  onMount(() => {
    const q = new Quill(containerRef, {
      theme: "snow",
      modules: { toolbar: TOOLBAR_OPTIONS, history: { delay: 650, maxStack: 150, userOnly: true } },
    });
    q.enable(false);
    q.setText("Loading...");
    quill = q;

    // Sanitize rich pastes before Quill sees them, matching DocsEditor.
    const handlePaste = (event) => {
      const clipboard = event.clipboardData;
      if (!clipboard) return;
      const html = clipboard.getData("text/html");
      if (!html) return;
      event.preventDefault();
      const clean = sanitizePastedHtml(html);
      const range = q.getSelection() || { index: q.getLength(), length: 0 };
      q.clipboard.dangerouslyPasteHTML(range.index, clean, "user");
    };
    containerRef.addEventListener("paste", handlePaste, true);

    // Load the document from the entity, then enable editing.
    base44.entities.Document.get(documentId())
      .then((record) => {
        recordId = record.id;
        setDocName(record.name || "Untitled document");
        const html = record.content || "";
        if (html.trim()) {
          q.clipboard.dangerouslyPasteHTML(html);
        } else {
          q.setText("");
        }
        loaded = true;
        q.enable();
        setSaveState("saved");
        setLastSavedAt(Date.now());

        // Real-time collaboration channel (replaces socket.io).
        collab = createCollabDoc({
          actors: base44.actors,
          room: { actor: "MeetingDoc", id: roomIdFor(documentId()) },
          name: auth.user()?.full_name || auth.user()?.email || "Someone",
          onBecameWriter: () => flushSave(true),
        });
        collab.attach(q, {
          Delta,
          onRemoteApplied: () => flushSave(),
        });
        setCollabSession(collab);

        q.on("text-change", (delta, _oldDelta, source) => {
          if (source !== "user") return;
          collab.localDelta(delta);
          flushSave();
        });
        q.on("selection-change", (range) => {
          collab.localSelection(range);
        });

        onCleanup(() => {
          containerRef.removeEventListener("paste", handlePaste, true);
          collab.dispose();
          collab = null;
        });
      })
      .catch((error) => {
        console.error("Failed to load document", error);
        q.setText("");
        loaded = true;
        q.enable();
        setSaveState("error");
      });
  });

  // Flush on tab hide / page close so a keystroke in the debounce window isn't lost.
  const flushOnExit = () => { if (document.visibilityState === "hidden") flushSave(true); };
  document.addEventListener("visibilitychange", flushOnExit);
  window.addEventListener("pagehide", () => flushSave(true));
  onCleanup(() => {
    document.removeEventListener("visibilitychange", flushOnExit);
    window.removeEventListener("pagehide", () => flushSave(true));
    if (saveTimer) clearTimeout(saveTimer);
  });

  const handleRename = (e) => {
    setDocName(e.currentTarget.value);
    flushSave();
  };

  return (
    <div class="collab-editor-shell flex flex-col h-full min-h-[60vh]">
      <header class="flex flex-wrap items-center gap-3 border-b border-border bg-card px-4 py-3">
        <div class="flex flex-col min-w-0 flex-1">
          <input
            type="text"
            value={docName()}
            onInput={handleRename}
            class="w-full bg-transparent text-lg font-semibold text-foreground outline-none"
            placeholder="Untitled document"
          />
          <span class="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Document ID: {documentId()}
          </span>
        </div>
        <Show when={collabSession() && collabSession().peers().length > 0}>
          <div class="flex flex-wrap items-center gap-1.5" role="status" aria-live="polite">
            <span class="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Editing now</span>
            <For each={collabSession().peers()}>
              {(peer) => (
                <span class="inline-flex items-center gap-1 rounded-full border border-border px-1.5 py-0.5 text-[10px]">
                  <span class="h-1.5 w-1.5 rounded-full" style={{ background: peer.color }} aria-hidden="true" />
                  {peer.name}
                </span>
              )}
            </For>
          </div>
        </Show>
        <div class={`editor-status-pill inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${
          saveState() === "saved" ? "border-border bg-muted text-muted-foreground"
          : saveState() === "saving" ? "border-primary/40 bg-primary/10 text-primary"
          : saveState() === "error" ? "border-destructive/50 bg-destructive/10 text-destructive"
          : "border-border bg-muted text-muted-foreground"
        }`}>
          <span class={`h-1.5 w-1.5 rounded-full ${
            saveState() === "saved" ? "bg-green-500"
            : saveState() === "saving" ? "bg-primary animate-pulse"
            : saveState() === "error" ? "bg-destructive"
            : "bg-muted-foreground"
          }`} />
          {statusText(saveState(), lastSavedAt())}
        </div>
      </header>
      <div class="flex-1 overflow-y-auto bg-card">
        <div class="mx-auto max-w-3xl px-4 py-6">
          <div
            class="docs-editor-content theme-rich-text rounded-lg border border-border bg-background"
            style={{ "min-height": "60vh" }}
          >
            <div ref={containerRef} />
          </div>
        </div>
      </div>
    </div>
  );
}