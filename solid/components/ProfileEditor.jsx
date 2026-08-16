import { createSignal, For, Show } from "solid-js";
import { base44 } from "@/api/base44Client";
import { Upload, Palette, X, History } from "lucide-solid";
import { useAuth } from "~/lib/AuthContext";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";
const DEFAULT_URLS = [MABIS_LOGO];

/*
 * Avatar picker — port of src/components/ProfileEditor.jsx.
 *
 * NOTE: the React file carries an abandoned colour-picker — `AVATAR_COLORS`,
 * `profileColor` state and `handleColorSave` are all declared but nothing in
 * its JSX references them, so no user can reach that feature. It is left out
 * here rather than transcribed as unreachable code. If the colour picker is
 * wanted, it needs building in both builds, not resurrecting from this file.
 *
 * framer's whileHover/whileTap become the `press-sm` / `press-lg` classes and
 * the entrance becomes `dropdown-pop`; there is no exit animation.
 */
export default function ProfileEditor(props) {
  const auth = useAuth();
  const [uploading, setUploading] = createSignal(false);

  const avatarHistory = () => auth.user()?.avatar_history || [];

  const syncAvatarToMember = async (data) => {
    try {
      // A person can hold more than one Member row — one per role (student,
      // admin, editor, ...), see @/lib/memberIdentity. Only ever writing
      // matches[0] left every row but one stuck with whatever avatar it had
      // when it happened to be first in the list, so the picture only ever
      // showed up under a single role. Sync to every row that is this person.
      const matches = await base44.entities.Member.filter({ email: auth.user()?.email });
      await Promise.all(matches.map((match) => base44.entities.Member.update(match.id, data)));
    } catch { /* ignore */ }
  };

  const saveAvatar = async (newUrl) => {
    const oldUrl = auth.user()?.avatar_url;
    const history = auth.user()?.avatar_history || [];
    let newHistory = [...history];
    if (oldUrl && !DEFAULT_URLS.includes(oldUrl)) {
      newHistory = [oldUrl, ...history].slice(0, 10);
    }
    await base44.auth.updateMe({ avatar_url: newUrl, avatar_history: newHistory });
    syncAvatarToMember({ avatar_url: newUrl });
    auth.updateUser?.();
  };

  const handleUpload = async (e) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      await saveAvatar(file_url);
    } finally {
      // React set this outside any try, so a failed upload left the label stuck
      // reading "Uploading..." with the input permanently disabled.
      setUploading(false);
      input.value = "";
    }
  };

  const useDefaultAvatar = async () => {
    await base44.auth.updateMe({ avatar_url: null });
    syncAvatarToMember({ avatar_url: null });
    auth.updateUser?.();
  };

  const handleReset = async () => {
    await base44.auth.updateMe({ avatar_url: null, avatar_color: "#951E3A", avatar_history: [] });
    syncAvatarToMember({ avatar_url: null, avatar_color: "#951E3A" });
    auth.updateUser?.();
    props.onClose();
  };

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-[60] bg-ink/30" onClick={() => props.onClose()} />
      <div class="dropdown-pop fixed inset-x-3 top-20 z-[61] max-h-[calc(100dvh-6rem)] w-auto overflow-y-auto rounded-2xl border border-border bg-card p-4 shadow-xl sm:inset-x-auto sm:right-6 sm:top-24 sm:max-h-[75vh] sm:w-80">
        <div class="flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <Palette class="w-4 h-4 text-primary" />
            <p class="text-sm font-bold text-foreground">Customize Profile Picture</p>
          </div>
          <button onClick={() => props.onClose()} class="text-muted-foreground hover:text-muted-foreground transition-colors">
            <X class="w-4 h-4" />
          </button>
        </div>

        {/* Upload photo */}
        <label class="press-sm flex items-center gap-2 cursor-pointer mb-3 bg-muted hover:bg-muted rounded-lg px-3 py-2.5 border border-border transition-colors">
          <Upload class="w-3.5 h-3.5 text-primary" />
          <span class="text-xs font-semibold text-muted-foreground">
            {uploading() ? "Uploading..." : "Upload Photo"}
          </span>
          <input type="file" accept="image/*" class="hidden" onChange={handleUpload} disabled={uploading()} />
        </label>

        {/* Default avatar — MABIS Logo */}
        <p class="text-[10px] text-muted-foreground mb-2">Profile picture:</p>
        <div class="flex gap-2 mb-3">
          <button
            onClick={useDefaultAvatar}
            class={`press-lg w-12 h-12 rounded-full overflow-hidden border-2 transition-transform bg-card flex items-center justify-center ${!auth.user()?.avatar_url ? "border-primary scale-110" : "border-border"}`}
            title="MABIS Logo"
          >
            <img src={MABIS_LOGO} alt="MABIS" class="w-full h-full object-contain p-1" />
          </button>
        </div>

        {/* Avatar history */}
        <Show when={avatarHistory().length > 0}>
          <div class="mb-3">
            <div class="flex items-center gap-1 mb-2">
              <History class="w-3 h-3 text-muted-foreground" />
              <p class="text-[10px] text-muted-foreground">Recent profile pictures ({avatarHistory().length}):</p>
            </div>
            <div class="flex gap-1.5 flex-wrap">
              <For each={avatarHistory()}>
                {(url) => (
                  <button
                    onClick={() => saveAvatar(url)}
                    class="press-lg w-8 h-8 rounded-full overflow-hidden border border-border hover:border-primary transition-colors"
                  >
                    <img src={url} alt="" class="w-full h-full object-cover" />
                  </button>
                )}
              </For>
            </div>
          </div>
        </Show>

        {/* Actions */}
        <div class="flex gap-2">
          <button
            onClick={handleReset}
            class="flex-1 text-[10px] text-muted-foreground hover:text-muted-foreground underline text-center"
          >
            Reset to default
          </button>
        </div>
      </div>
    </Show>
  );
}
