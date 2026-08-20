import { createSignal, onCleanup, Index, Show } from "solid-js";
import { base44 } from "@/api/base44Client";
import { Heart, X, Star, Send, Loader2, ImagePlus, Trash2 } from "lucide-solid";
import { useAuth } from "~/lib/AuthContext";

const RATINGS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/*
 * Feedback / bug report FAB — 1:1 port of src/components/FeedbackWidget.jsx.
 *
 * framer is replaced by the keyframes in solid-motion.css: `feedback-pop` for
 * the panel, `success-pop` for the confirmation badge, and `tap-*` classes for
 * the whileTap presses. As elsewhere in this port there is no exit animation —
 * Solid has no AnimatePresence, so panels unmount immediately.
 *
 * The React version left two bugs in place that a literal transcription would
 * have carried over; both are fixed here and noted inline.
 */
export default function FeedbackWidget() {
  const auth = useAuth();
  const [open, setOpen] = createSignal(false);
  const [tab, setTab] = createSignal("feedback");
  const [rating, setRating] = createSignal(8);
  const [message, setMessage] = createSignal("");
  const [imageUrl, setImageUrl] = createSignal("");
  const [uploading, setUploading] = createSignal(false);
  const [submitting, setSubmitting] = createSignal(false);
  const [submitted, setSubmitted] = createSignal(false);
  let fileEl;
  let resetTimer;

  // React never cleared this timeout, so a widget unmounted within 2s of a
  // submit still fired setState afterwards. Harmless in React, a real write to
  // a disposed signal here.
  onCleanup(() => clearTimeout(resetTimer));

  const handleImageUpload = async (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } finally {
      // React set uploading=false outside any try, so a failed upload left the
      // button spinning forever with no way back.
      setUploading(false);
      input.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!message().trim() || submitting()) return;
    setSubmitting(true);
    try {
      await base44.entities.Feedback.create({
        type: tab(),
        rating: tab() === "feedback" ? rating() : null,
        message: message().trim(),
        image_url: imageUrl() || undefined,
        submitted_by_name: auth.user()?.full_name || "Anonymous",
        submitted_by_email: auth.user()?.email || "",
        status: "new",
      });
      setSubmitted(true);
      setMessage("");
      setImageUrl("");
      setRating(8);
      clearTimeout(resetTimer);
      resetTimer = setTimeout(() => { setSubmitted(false); setOpen(false); }, 2000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(!open())}
        class={`feedback-fab mobile-fab mobile-fab-left fixed bottom-5 left-5 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-primary-foreground border-2 border-primary-foreground ${open() ? "mobile-fab-open" : ""}`}
        style={{ background: "hsl(var(--primary))" }}
        title="Feedback & Bug Reports"
      >
        <Show when={open()} fallback={<Heart class="w-6 h-6" />}><X class="w-6 h-6" /></Show>
      </button>

      <Show when={open()}>
        <div class="feedback-pop mobile-feedback-panel fixed bottom-24 left-5 z-[60] w-80 bg-card rounded-2xl shadow-2xl border border-border overflow-hidden">
          <div class="px-4 py-3 flex items-center gap-2" style={{ background: "hsl(var(--primary))" }}>
            <Heart class="w-4 h-4 text-primary-foreground" />
            <span class="flex-1 text-primary-foreground font-bold text-sm">Feedback & Bug Reports</span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              class="flex h-9 w-9 items-center justify-center text-primary-foreground/75 hover:text-primary-foreground"
              aria-label="Close feedback panel"
            >
              <X class="h-4 w-4" />
            </button>
          </div>

          <Show
            when={submitted()}
            fallback={
              <div class="p-4">
                <div class="flex gap-1 mb-4 p-1 bg-muted rounded-lg">
                  <button
                    onClick={() => setTab("feedback")}
                    class={`tap-95 flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${tab() === "feedback" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                  >
                    Feedback
                  </button>
                  <button
                    onClick={() => setTab("bug")}
                    class={`tap-95 flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${tab() === "bug" ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}
                  >
                    Report Issue or Bug
                  </button>
                </div>

                <Show when={tab() === "feedback"}>
                  <div class="mb-4 overflow-hidden">
                    <label class="text-xs font-bold text-muted-foreground mb-2 block">
                      Satisfaction: <span class="text-primary">{rating()}/10</span>
                    </label>
                    <div class="flex gap-1">
                      <Index each={RATINGS}>
                        {(r) => (
                          <button
                            type="button"
                            onClick={() => setRating(r())}
                            class={`tap-85 w-6 h-6 rounded text-[10px] font-bold border-2 transition-all ${rating() === r() ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"}`}
                          >
                            {r()}
                          </button>
                        )}
                      </Index>
                    </div>
                  </div>
                </Show>

                <div class="mb-4">
                  <label class="text-xs font-bold text-muted-foreground mb-2 block">
                    {tab() === "feedback" ? "Your feedback" : "Describe the issue"}
                  </label>
                  <textarea
                    value={message()}
                    onInput={(e) => setMessage(e.currentTarget.value)}
                    rows={4}
                    placeholder={tab() === "feedback" ? "Tell us what you think..." : "What happened? What did you expect?"}
                    class="w-full rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground px-3 py-2 text-sm focus:outline-none focus:border-primary/50 resize-none"
                  />
                  <Show
                    when={imageUrl()}
                    fallback={
                      <button
                        type="button"
                        onClick={() => fileEl?.click()}
                        disabled={uploading()}
                        class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:bg-primary/5 px-3 py-1.5 rounded-lg border border-primary/30 transition-colors disabled:opacity-50"
                      >
                        <Show when={uploading()} fallback={<ImagePlus class="w-3.5 h-3.5" />}><Loader2 class="w-3.5 h-3.5 animate-spin" /></Show>
                        {uploading() ? "Uploading..." : "Attach image"}
                      </button>
                    }
                  >
                    <div class="relative mt-2 rounded-lg overflow-hidden border border-border">
                      <img src={imageUrl()} alt="Attachment" class="w-full max-h-40 object-cover" />
                      <button
                        onClick={() => setImageUrl("")}
                        class="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-primary-foreground flex items-center justify-center"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Show>
                  <input ref={fileEl} type="file" accept="image/*" class="hidden" onChange={handleImageUpload} />
                </div>

                <button
                  onClick={handleSubmit}
                  disabled={!message().trim() || submitting()}
                  class="tap-97 w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Show when={submitting()} fallback={<><Send class="w-3.5 h-3.5" /> Submit</>}>
                    <><Loader2 class="w-4 h-4 animate-spin" /> Sending...</>
                  </Show>
                </button>
              </div>
            }
          >
            <div class="p-8 text-center">
              <div class="success-pop w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <Star class="w-6 h-6 text-green-600" />
              </div>
              <p class="text-sm font-semibold text-foreground">Thank you!</p>
              <p class="text-xs text-muted-foreground mt-1">
                Your {tab() === "feedback" ? "feedback" : "bug report"} has been submitted.
              </p>
            </div>
          </Show>
        </div>
      </Show>
    </>
  );
}
