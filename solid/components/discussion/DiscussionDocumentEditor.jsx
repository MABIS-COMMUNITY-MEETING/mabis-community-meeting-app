import { lazy, splitProps, Suspense } from "solid-js";
import { onCleanup } from "solid-js";
import { base44 } from "@/api/base44Client";
import { useAuth } from "~/lib/AuthContext";
import { createCollabDoc } from "~/lib/collab-doc";

const DocsEditor = lazy(() => import("~/components/DocsEditor"));

/*
 * The one rich-text surface used by Discussion topic forms, inline topic
 * editing, and live Meeting Notes. Keeping the lazy boundary and fallback here
 * means those three paths cannot drift back into different block/column
 * editors again.
 *
 * `draftCollab` wires the same real-time collaboration the record-backed editors
 * use (MeetingMinutes, inline topic editing) into the compose forms that have no
 * record yet — the new-topic form, the announcement composer and the news
 * composer. A fresh room id is minted per mount so one draft never bleeds into
 * the next: the MeetingDoc actor persists room content, and a shared room would
 * replay the last draft into an empty compose form. When a caller passes its
 * own `collab` (inline topic editing), that session is used as-is and no draft
 * session is created.
 */
export default function DiscussionDocumentEditor(props) {
  const [local, editorProps] = splitProps(props, ["fallbackHeight", "draftCollab"]);
  const fallbackHeight = () => local.fallbackHeight || editorProps.minHeight || "180px";

  const auth = useAuth();
  let session = null;
  if (local.draftCollab && !editorProps.collab) {
    session = createCollabDoc({
      actors: base44.actors,
      room: { actor: "MeetingDoc", id: `draft-${Math.random().toString(36).slice(2)}` },
      name: auth.user()?.full_name || "Someone",
    });
    onCleanup(() => session?.dispose());
  }
  const collab = editorProps.collab || session || undefined;

  return (
    <Suspense
      fallback={
        <div
          class="widget-loading-shell"
          style={{
            "--widget-fallback-height": fallbackHeight(),
            "min-height": fallbackHeight(),
          }}
          aria-label="Document editor loading"
        />
      }
    >
      <DocsEditor {...editorProps} collab={collab} />
    </Suspense>
  );
}