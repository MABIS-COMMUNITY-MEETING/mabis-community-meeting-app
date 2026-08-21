import { createSignal, createMemo, lazy, Suspense, Show, For } from "solid-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { A } from "@solidjs/router";
import {
  Plus, Trash2, Pin, Loader2, Video, Image as ImageIcon, X, Megaphone,
  Maximize2, History,
} from "lucide-solid";
import { format } from "date-fns";
import { base44 } from "@/api/base44Client";
import { displayName } from "@/lib/names";
import { useAuth } from "~/lib/AuthContext";
import { Button, Input } from "~/components/ui";
import { Select } from "~/components/ui/select";
import { JapaneseText } from "~/components/primitives";

const DocsEditor = lazy(() => import("~/components/DocsEditor"));

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

/*
 * AnnouncementsWidget — Solid port of src/components/AnnouncementsWidget.jsx.
 *
 * The React version imports DocsEditor statically; here it is lazy, so the
 * ~69 KiB Quill chunk only downloads when someone actually opens the post
 * form. Announcements are read far more often than written, so this keeps
 * Quill off the critical path for the common case.
 *
 * The framer height animation on the form is dropped in favour of the form
 * simply mounting: animating height forces layout on every frame of the
 * transition, and inside a content-visibility section that is paid for
 * repeatedly. Everything else is 1:1.
 */
export default function AnnouncementsWidget(props) {
  /* Deleting is permanent and has no undo, so it no longer happens on one tap. */
  const [pendingDelete, setPendingDelete] = createSignal(null);
  const queryClient = useQueryClient();
  const auth = useAuth();

  let imgEl;
  let vidEl;

  const [showForm, setShowForm] = createSignal(false);
  const [fullscreen, setFullscreen] = createSignal(false);
  const [title, setTitle] = createSignal("");
  const [body, setBody] = createSignal("");
  const [authorName, setAuthorName] = createSignal("");
  const [imageFile, setImageFile] = createSignal(null);
  const [videoFile, setVideoFile] = createSignal(null);
  const [imagePreview, setImagePreview] = createSignal(null);
  const [uploading, setUploading] = createSignal(false);

  const members = () => props.members || [];
  const normalizedName = (value) => String(value || "").trim().toLocaleLowerCase();
  const memberForAuthor = (name) => members().find((member) =>
    normalizedName(displayName(member)) === normalizedName(name)
    || normalizedName(member.name) === normalizedName(name));
  const avatarUrlFor = (announcement) =>
    memberForAuthor(announcement.author_name)?.avatar_url || announcement.avatar_url || "";
  const avatarColorFor = (announcement) =>
    memberForAuthor(announcement.author_name)?.avatar_color || announcement.avatar_color || "";

  const announcementsQuery = useQuery(() => ({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 50),
  }));

  const add = useMutation(() => ({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["announcements"] }); resetForm(); },
  }));

  const remove = useMutation(() => ({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  }));

  const pin = useMutation(() => ({
    mutationFn: ({ id, pinned }) => base44.entities.Announcement.update(id, { pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] }),
  }));

  const resetForm = () => {
    setTitle(""); setBody(""); setAuthorName("");
    setImageFile(null); setVideoFile(null); setImagePreview(null);
    setShowForm(false);
  };

  const handleImageSelect = (e) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoSelect = (e) => {
    const file = e.currentTarget.files?.[0];
    if (!file) return;
    setVideoFile(file);
  };

  const handleSubmit = async () => {
    if (!title().trim() || !authorName().trim()) return;
    setUploading(true);
    let image_url = "";
    let video_url = "";
    try {
      if (imageFile()) {
        const res = await base44.integrations.Core.UploadFile({ file: imageFile() });
        image_url = res.file_url;
      }
      if (videoFile()) {
        const res = await base44.integrations.Core.UploadFile({ file: videoFile() });
        video_url = res.file_url;
      }
    } finally {
      setUploading(false);
    }
    const author = memberForAuthor(authorName());
    const signedInUser = auth.user();
    const isSignedInAuthor = !!signedInUser && (
      (author?.email && signedInUser.email && normalizedName(author.email) === normalizedName(signedInUser.email))
      || normalizedName(signedInUser.name || signedInUser.full_name) === normalizedName(authorName())
    );
    add.mutate({
      title: title().trim(),
      body: body().trim(),
      author_name: authorName().trim(),
      image_url,
      video_url,
      pinned: false,
      // The selected author is the source of truth. Only fall back to the
      // signed-in profile when that selected member really is the signed-in
      // user; otherwise an admin posting for someone else would show the
      // admin's picture.
      avatar_url: author?.avatar_url || (isSignedInAuthor ? signedInUser.avatar_url : "") || "",
      avatar_color: author?.avatar_color || (isSignedInAuthor ? signedInUser.avatar_color : "") || "",
    });
  };

  const sorted = createMemo(() =>
    [...(announcementsQuery.data || [])].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.published_date || b.created_date) - new Date(a.published_date || a.created_date);
    }));

  const memberOptions = createMemo(() => members().map((m) => ({ value: m.name, label: m.name })));

  return (
    <div class={`mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${fullscreen() ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div class="mabis-widget-header bg-primary px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div class="flex items-center gap-3 min-w-0">
          <Megaphone class="w-5 h-5 text-primary-foreground" />
          <div>
            <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Announcements</h2>
            <JapaneseText
              ja={`${(announcementsQuery.data || []).length}件のお知らせ`}
              class="block text-primary-foreground-muted text-xs mt-0.5"
              japaneseClass="block mt-0.5 text-[0.9em]"
            >
              {(announcementsQuery.data || []).length} announcement{(announcementsQuery.data || []).length !== 1 ? "s" : ""}
            </JapaneseText>
          </div>
        </div>

        <div class="mabis-widget-actions flex items-center flex-wrap gap-2 shrink-0">
          <A href="/history/announcements">
            <Button size="sm" variant="outline" class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1">
              <History class="w-3.5 h-3.5" /> History
            </Button>
          </A>
          <Show when={props.isAdmin}>
            <Button
              size="sm"
              variant="outline"
              class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1"
              onClick={() => (showForm() ? resetForm() : setShowForm(true))}
            >
              <Plus class="w-3.5 h-3.5" /> Post
            </Button>
          </Show>
          <Button
            size="sm"
            variant="outline"
            class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1"
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
          <div class="border border-border rounded-xl p-4 bg-muted space-y-3 overflow-hidden sm:rounded-2xl sm:p-5">
            <Select
              value={authorName()}
              onChange={setAuthorName}
              options={memberOptions()}
              placeholder="Your name..."
              aria-label="Author"
              triggerClass="rounded-lg border-border bg-card"
            />

            <Input
              placeholder="Announcement title..."
              value={title()}
              onInput={(e) => setTitle(e.currentTarget.value)}
              class="rounded-lg border-border bg-card font-semibold"
            />

            <Suspense fallback={<div class="widget-loading-shell" style={{ "--widget-fallback-height": "120px" }} aria-hidden />}>
              <DocsEditor
                initialHtml={body()}
                onChange={setBody}
                placeholder="Write your announcement…"
                minHeight="120px"
                title="Announcement"
              />
            </Suspense>

            <Show when={imagePreview()}>
              <div class="relative inline-block">
                <img src={imagePreview()} alt="preview" class="h-28 rounded-lg object-cover border border-border" />
                <button
                  onClick={() => { setImageFile(null); setImagePreview(null); }}
                  aria-label="Remove image"
                  class="absolute -top-1.5 -right-1.5 bg-destructive text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </Show>

            <Show when={videoFile()}>
              <div class="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                <Video class="w-3.5 h-3.5 text-primary" />
                {videoFile().name}
                <button onClick={() => setVideoFile(null)} class="ml-auto text-muted-foreground hover:text-destructive" aria-label="Remove video">
                  <X class="w-3 h-3" />
                </button>
              </div>
            </Show>

            <div class="flex flex-col gap-2 sm:flex-row sm:items-center">
              <button
                onClick={() => imgEl?.click()}
                class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <ImageIcon class="w-3.5 h-3.5" /> Image
              </button>
              <button
                onClick={() => vidEl?.click()}
                class="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors"
              >
                <Video class="w-3.5 h-3.5" /> Video
              </button>
              <input ref={imgEl} type="file" accept="image/*" class="hidden" onChange={handleImageSelect} />
              <input ref={vidEl} type="file" accept="video/*" class="hidden" onChange={handleVideoSelect} />

              <div class="flex gap-2 sm:ml-auto">
                <Button variant="outline" size="sm" onClick={resetForm} class="text-xs rounded-lg">Cancel</Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={!title().trim() || !authorName().trim() || uploading() || add.isPending}
                  class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs"
                >
                  <Show when={uploading() || add.isPending} fallback={"Post"}>
                    <Loader2 class="w-3.5 h-3.5 animate-spin" />
                  </Show>
                </Button>
              </div>
            </div>
          </div>
        </Show>

        <Show when={sorted().length === 0}>
          <JapaneseText
            ja="お知らせはまだありません。最初に投稿しましょう！"
            class="block text-center text-muted-foreground text-sm py-8"
            japaneseClass="mt-1 block text-[0.9em]"
          >
            No announcements yet — be the first to post!
          </JapaneseText>
        </Show>

        <div class="space-y-3">
          <For each={sorted()}>
            {(ann) => (
              <div class={`rounded-xl border p-4 group transition-all ${ann.pinned ? "bg-primary/8 border-primary/40" : "bg-card border-border"}`}>
                <div class="flex items-start gap-3">
                  <div
                    class="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 mt-0.5 bg-card"
                    style={{ border: `2px solid ${avatarColorFor(ann) || "hsl(var(--primary))"}` }}
                  >
                    <Show
                      when={avatarUrlFor(ann)}
                      fallback={<img src={MABIS_LOGO} alt="" class="h-full w-full object-contain p-0.5" />}
                    >
                      <img
                        src={avatarUrlFor(ann)}
                        alt={`${ann.author_name || "Announcement author"} profile`}
                        loading="lazy"
                        class="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.onerror = null;
                          event.currentTarget.src = MABIS_LOGO;
                          event.currentTarget.className = "h-full w-full object-contain p-0.5";
                        }}
                      />
                    </Show>
                  </div>

                  <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 flex-wrap mb-0.5">
                      <span class="font-bold text-sm text-foreground">{ann.author_name}</span>
                      <Show when={ann.pinned}>
                        <span class="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                          PINNED
                        </span>
                      </Show>
                      <span class="text-xs text-muted-foreground ml-auto">
                        {ann.published_date || ann.created_date
                          ? format(new Date(ann.published_date || ann.created_date), "d MMM yyyy")
                          : ""}
                      </span>
                    </div>

                    <p class="font-semibold text-foreground text-sm">{ann.title}</p>

                    <Show when={ann.body}>
                      <div
                        class="theme-rich-text text-sm text-muted-foreground mt-1 leading-relaxed prose prose-sm max-w-none
                        [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
                        [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                        [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-1
                        [&_a]:text-primary [&_a]:underline"
                        innerHTML={ann.body}
                      />
                    </Show>

                    <Show when={ann.image_url}>
                      <img
                        src={ann.image_url}
                        alt={ann.title}
                        loading="lazy"
                        class="mt-3 rounded-xl max-h-64 object-cover border border-border w-full"
                      />
                    </Show>
                    <Show when={ann.video_url}>
                      <video src={ann.video_url} controls preload="none" class="mt-3 rounded-xl max-h-64 w-full border border-border" />
                    </Show>
                  </div>

                  <Show when={props.isAdmin}>
                    {/* Was opacity-0 group-hover:*, so these controls did not
                        exist on touch — no hover, no button. Visible on coarse
                        pointers, hover-revealed on mouse, focus-reachable. */}
                    <div class="flex items-center gap-1 shrink-0 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100">
                      <button
                        onClick={() => pin.mutate({ id: ann.id, pinned: !ann.pinned })}
                        aria-label={ann.pinned ? "Unpin" : "Pin"}
                        class={`p-1.5 rounded-lg transition-colors ${ann.pinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}
                      >
                        <Pin class="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setPendingDelete(ann)}
                        aria-label={`Remove ${ann.title}`}
                        title="Remove announcement"
                        class="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <Trash2 class="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </Show>
                </div>
              </div>
            )}
          </For>
        </div>
      </div>

      <Show when={pendingDelete()}>
        {(ann) => (
          <div
            class="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4"
            role="presentation"
            onMouseDown={() => setPendingDelete(null)}
          >
            <div
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="remove-announcement-title"
              class="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <h3 id="remove-announcement-title" class="font-display text-lg font-bold text-foreground">
                Remove this announcement?
              </h3>
              <p class="mt-1 text-sm text-muted-foreground">
                \u201c{ann().title}\u201d will be deleted for everyone. This cannot be undone.
              </p>
              <div class="mt-5 flex gap-2">
                <button
                  type="button"
                  onClick={() => setPendingDelete(null)}
                  class="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                >
                  Keep it
                </button>
                <button
                  type="button"
                  onClick={() => { remove.mutate(ann().id); setPendingDelete(null); }}
                  class="flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-bold text-destructive-foreground hover:opacity-90 transition-opacity"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}
      </Show>
    </div>
  );
}
