import { createSignal } from "solid-js";
import { useNavigate } from "@solidjs/router";
import { base44 } from "@/api/base44Client";
import { Button } from "~/components/ui";
import { JapaneseText } from "~/components/primitives";
import { FileText, ArrowRight } from "lucide-solid";

/*
 * Documents — landing page to create a new collaborative document or join an
 * existing one by its ID. Modelled on the reference repo's Home.js, in SolidJS.
 */
export default function Documents() {
  const navigate = useNavigate();
  const [documentId, setDocumentId] = createSignal("");
  const [creating, setCreating] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleJoin = (event) => {
    event.preventDefault();
    const trimmed = documentId().trim();
    if (!trimmed) return;
    navigate(`/documents/${trimmed}`);
  };

  const handleCreate = async () => {
    if (creating()) return;
    setCreating(true);
    setError("");
    try {
      const record = await base44.entities.Document.create({
        name: "Untitled document",
        content: "",
      });
      navigate(`/documents/${record.id}`);
    } catch (e) {
      console.error("Failed to create document", e);
      setError("Could not create a document. Please try again.");
      setCreating(false);
    }
  };

  return (
    <div class="flex min-h-[80vh] items-center justify-center px-4 py-12">
      <div class="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-sm">
        <div class="mb-6 flex items-center gap-2">
          <FileText class="h-6 w-6 text-primary" />
          <h1 class="font-display text-2xl font-bold text-foreground">Collaborative Documents</h1>
        </div>
        <JapaneseText
          as="p"
          ja="既存の文書をIDで開くか、新しい文書を作成できます。"
          class="mb-6 text-sm text-muted-foreground"
          japaneseClass="mt-1 block text-[0.9em]"
        >
          Join an existing document by entering its ID, or start a new one in seconds.
        </JapaneseText>

        <form onSubmit={handleJoin} class="space-y-3">
          <label class="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground" for="document-id">
            Document ID
          </label>
          <div class="flex gap-2">
            <input
              id="document-id"
              type="text"
              value={documentId()}
              onInput={(e) => setDocumentId(e.currentTarget.value)}
              placeholder="Enter document ID"
              autocomplete="off"
              class="h-10 flex-1 rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-primary"
            />
            <Button type="submit" disabled={!documentId().trim()} class="min-h-10">
              Join
            </Button>
          </div>
        </form>

        <div class="my-6 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          <span class="h-px flex-1 bg-border" />or<span class="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          onClick={handleCreate}
          disabled={creating()}
          class="min-h-11 w-full"
        >
          <ArrowRight class="mr-1.5 h-4 w-4" />
          {creating() ? "Creating…" : "Create a new document"}
        </Button>

        <Show when={error()}>
          <p class="mt-4 text-sm text-destructive" role="alert">{error()}</p>
        </Show>
      </div>
    </div>
  );
}