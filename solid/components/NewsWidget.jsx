import { createSignal, createMemo, lazy, Suspense, Show, For } from "solid-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { A } from "@solidjs/router";
import {
  Newspaper, Plus, Trash2, Loader2, X, Image as ImageIcon, Video,
  Maximize2, History,
} from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { useAuth } from "~/lib/AuthContext";
import { Button, Input } from "~/components/ui";
import { JapaneseText } from "~/components/primitives";

const DocsEditor = lazy(() => import("~/components/DocsEditor"));

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return ""; }
}

function formatDateJa(d) {
  try { return new Intl.DateTimeFormat("ja-JP", { year: "numeric", month: "long", day: "numeric" }).format(new Date(d)); }
  catch { return ""; }
}

/*
 * NewsWidget — Solid port of src/components/NewsWidget.jsx.
 *
 * DocsEditor is lazy here (statically imported in React) so the Quill chunk
 * only loads when an editor actually opens the compose form. Media uses
 * loading="lazy" / preload="none": an article list can carry several videos,
 * and preloading them all is the single biggest waste on a slow connection.
 */
export default function NewsWidget(props) {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const [showForm, setShowForm] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [imageUrl, setImageUrl] = createSignal("");
  const [videoUrl, setVideoUrl] = createSignal("");
  const [uploading, setUploading] = createSignal(false);
  const [fullscreen, setFullscreen] = createSignal(false);

  const newsQuery = useQuery(() => ({
    queryKey: ["news"],
    queryFn: () => base44.entities.NewsItem.list("-created_date", 100),
  }));

  const news = () => newsQuery.data || [];

  const create = useMutation(() => ({
    mutationFn: (data) => base44.entities.NewsItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      setTitle(""); setBody(""); setImageUrl(""); setVideoUrl(""); setShowForm(false);
    },
  }));

  const remove = useMutation(() => ({
    mutationFn: (id) => base44.entities.NewsItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news"] }),
  }));

  const handleFileUpload = async (file, kind) => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await base44.integrations.Core.UploadFile({ file });
      if (kind === "image") setImageUrl(res.file_url);
      else setVideoUrl(res.file_url);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    if (!title().trim() || !body().trim()) return;
    create.mutate({
      title: title().trim(),
      body: body(),
      image_url: imageUrl(),
      video_url: videoUrl(),
      author_name: auth.user()?.full_name || "MABIS",
      author_email: auth.user()?.email || "",
    });
  };

  const sortedNews = createMemo(() =>
    [...news()].sort((a, b) =>
      new Date(b.published_date || b.created_date) - new Date(a.published_date || a.created_date)));

  const displayNews = createMemo(() =>
    props.limit && !fullscreen() ? sortedNews().slice(0, props.limit) : sortedNews());

  return (
    <div class={`mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${fullscreen() ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div class="mabis-widget-header bg-primary px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div class="min-w-0">
          <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl flex items-center gap-2">
            <Newspaper class="w-5 h-5" /> News
          </h2>
          <JapaneseText
            ja={`${news().length}件の記事`}
            class="block text-primary-foreground-muted text-xs mt-0.5"
            japaneseClass="block mt-0.5 text-[0.9em]"
          >
            {news().length} articles
          </JapaneseText>
        </div>

        <div class="mabis-widget-actions flex items-center flex-wrap gap-2 shrink-0">
          <A href="/history/news">
            <Button size="sm" variant="outline" class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5">
              <History class="w-3.5 h-3.5" /> History
            </Button>
          </A>
          <Show when={props.isAdmin}>
            <Button
              size="sm"
              variant="outline"
              class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
              onClick={() => setShowForm((s) => !s)}
            >
              <Plus class="w-3.5 h-3.5" /> {showForm() ? "Cancel" : "Add News"}
            </Button>
          </Show>
          <Button
            size="sm"
            variant="outline"
            class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
            onClick={() => setFullscreen((f) => !f)}
          >
            <Show when={fullscreen()} fallback={<Maximize2 class="w-3.5 h-3.5" />}>
              <X class="w-3.5 h-3.5" /> Close
            </Show>
          </Button>
        </div>
      </div>

      <div class="mabis-widget-body p-4 space-y-4 sm:p-5">
        <Show when={showForm()}>
          <div class="border border-border rounded-xl p-3 space-y-3 bg-muted sm:p-4">
            <Input placeholder="News title..." value={title()} onInput={(e) => setTitle(e.currentTarget.value)} class="rounded-lg" />

            <Suspense fallback={<div class="widget-loading-shell" style={{ "--widget-fallback-height": "140px" }} aria-hidden />}>
              <DocsEditor
                initialHtml={body()}
                onChange={setBody}
                placeholder="Write the news…"
                minHeight="140px"
                title={title() || "Untitled news"}
              />
            </Suspense>

            <div class="flex flex-wrap gap-2">
              <label class="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground">
                <ImageIcon class="w-3.5 h-3.5" />
                {imageUrl() ? "Image ✓" : "Add Image"}
                <input type="file" accept="image/*" class="hidden" onChange={(e) => handleFileUpload(e.currentTarget.files[0], "image")} />
              </label>
              <label class="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground">
                <Video class="w-3.5 h-3.5" />
                {videoUrl() ? "Video ✓" : "Add Video"}
                <input type="file" accept="video/*" class="hidden" onChange={(e) => handleFileUpload(e.currentTarget.files[0], "video")} />
              </label>
              <Show when={uploading()}>
                <Loader2 class="w-4 h-4 animate-spin text-primary self-center" />
              </Show>
            </div>

            <Show when={imageUrl()}>
              <div class="relative">
                <img src={imageUrl()} alt="preview" class="rounded-lg max-h-40 object-cover w-full" />
                <button onClick={() => setImageUrl("")} aria-label="Remove image" class="absolute top-2 right-2 bg-black/50 text-primary-foreground rounded-full p-1">
                  <X class="w-3 h-3" />
                </button>
              </div>
            </Show>

            <Button
              onClick={handleSubmit}
              disabled={!title().trim() || !body().trim() || create.isPending}
              class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg w-full"
            >
              <Show when={create.isPending} fallback={<Plus class="w-4 h-4" />}>
                <Loader2 class="w-4 h-4 animate-spin" />
              </Show>
              Publish
            </Button>
          </div>
        </Show>

        <Show
          when={!newsQuery.isLoading}
          fallback={<div class="flex justify-center py-8"><Loader2 class="w-6 h-6 animate-spin text-primary" /></div>}
        >
          <Show
            when={news().length > 0}
            fallback={
              <JapaneseText ja="ニュースはまだありません。" class="block text-center text-muted-foreground py-8" japaneseClass="mt-1 block text-[0.9em]">
                No news posted yet.
              </JapaneseText>
            }
          >
            <div class="space-y-3">
              <For each={displayNews()}>
                {(n) => (
                  <div class="border border-border rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                    <Show when={n.image_url}>
                      <img src={n.image_url} alt={n.title} loading="lazy" class="w-full max-h-56 object-cover" />
                    </Show>
                    <Show when={n.video_url}>
                      <video src={n.video_url} controls preload="none" class="w-full max-h-56 object-cover bg-black" />
                    </Show>
                    <div class="p-4">
                      <div class="flex items-center gap-2 mb-1.5">
                        <div class="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-card" style={{ border: "2px solid hsl(var(--primary))" }}>
                          <img src={MABIS_LOGO} alt="" class="w-full h-full object-contain p-0.5" />
                        </div>
                        <span class="text-xs font-bold text-foreground">{n.author_name}</span>
                        <span class="text-[10px] text-muted-foreground ml-auto">
                          <JapaneseText
                            ja={formatDateJa(n.published_date || n.created_date)}
                            layout="inline"
                            japaneseClass="ml-1 inline text-[0.9em] opacity-80"
                          >
                            {formatDate(n.published_date || n.created_date)}
                          </JapaneseText>
                        </span>
                        <Show when={props.isAdmin}>
                          <button
                            onClick={() => remove.mutate(n.id)}
                            aria-label="Delete article"
                            class="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </Show>
                      </div>
                      <h3 class="font-display font-bold text-foreground text-base mb-1">{n.title}</h3>
                      <div
                        class="theme-rich-text text-sm text-muted-foreground leading-relaxed prose prose-sm max-w-none
                        [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                        [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-1
                        [&_a]:text-primary [&_a]:underline"
                        innerHTML={n.body}
                      />
                    </div>
                  </div>
                )}
              </For>
            </div>

            <Show when={props.limit && !fullscreen() && news().length > props.limit}>
              <button
                onClick={() => setFullscreen(true)}
                class="w-full mt-3 py-2.5 rounded-xl border border-primary/30 text-primary hover:bg-primary/5 text-sm font-semibold transition-colors"
              >
                More News ({news().length - props.limit} more)
              </button>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
