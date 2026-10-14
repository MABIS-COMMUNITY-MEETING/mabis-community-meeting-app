import { useParams, A } from "@solidjs/router";
import { Show } from "solid-js";
import CollabEditor from "~/components/CollabEditor";
import { ArrowLeft } from "lucide-solid";

/*
 * DocumentEditor — the editor route. Reads the document id from the URL and
 * renders the collaborative editor for it.
 */
export default function DocumentEditor() {
  const params = useParams();
  return (
    <div class="flex min-h-screen flex-col">
      <div class="flex items-center gap-2 border-b border-border bg-background px-4 py-2">
        <A
          href="/documents"
          class="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft class="h-3.5 w-3.5" /> All documents
        </A>
      </div>
      <Show when={params.id} fallback={<div class="p-8 text-sm text-muted-foreground">No document specified.</div>}>
        <div class="flex-1">
          <CollabEditor documentId={params.id} />
        </div>
      </Show>
    </div>
  );
}