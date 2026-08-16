import { createSignal, createMemo, Show, For, Index } from "solid-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import {
  Search, Plus, Trash2, CheckCircle2, Loader2, X, Image as ImageIcon,
  PackageSearch, Maximize2, History,
} from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { useAuth } from "~/lib/AuthContext";
import { Button, Input } from "~/components/ui";
import { JapaneseText } from "~/components/primitives";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

const LOCATIONS = [
  "MPR", "Forum", "Ms. Claudia's Office", "Lounge",
  "Maths Room", "Hallway", "Science Room", "Teachers Room",
];

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return ""; }
}

/*
 * MissingItemsWidget — Solid port of src/components/MissingItemsWidget.jsx.
 *
 * The framer height animation on the "Found / Archived" drawer is dropped:
 * animating height forces a layout pass every frame, and this list can hold
 * dozens of cards with images. It now simply mounts, which is what the user
 * perceives anyway once there is more than a handful of items.
 */
export default function MissingItemsWidget(props) {
  const queryClient = useQueryClient();
  const auth = useAuth();

  const [showForm, setShowForm] = createSignal(false);
  const [showFound, setShowFound] = createSignal(false);
  const [itemName, setItemName] = createSignal("");
  const [colors, setColors] = createSignal("");
  const [lastSeen, setLastSeen] = createSignal("");
  const [dateLost, setDateLost] = createSignal("");
  const [imageUrl, setImageUrl] = createSignal("");
  const [uploading, setUploading] = createSignal(false);
  const [fullscreen, setFullscreen] = createSignal(false);

  const itemsQuery = useQuery(() => ({
    queryKey: ["missing-items"],
    queryFn: () => base44.entities.MissingItem.list("-created_date", 200),
  }));

  const items = () => itemsQuery.data || [];
  const activeItems = createMemo(() => items().filter((i) => !i.found));
  const foundItems = createMemo(() => items().filter((i) => i.found));

  const create = useMutation(() => ({
    mutationFn: (data) => base44.entities.MissingItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missing-items"] });
      setItemName(""); setColors(""); setLastSeen(""); setDateLost(""); setImageUrl("");
      setShowForm(false);
    },
  }));

  const markFound = useMutation(() => ({
    mutationFn: (id) => base44.entities.MissingItem.update(id, { found: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missing-items"] }),
  }));

  const remove = useMutation(() => ({
    mutationFn: (id) => base44.entities.MissingItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missing-items"] }),
  }));

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch { /* ignore */ }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!itemName().trim()) return;
    create.mutate({
      item_name: itemName().trim(),
      colors: colors().trim(),
      last_seen: lastSeen().trim(),
      date_lost: dateLost(),
      reported_by_name: auth.user()?.full_name || "Unknown",
      image_url: imageUrl(),
    });
  };

  const ItemCard = (cardProps) => (
    <div class={`border rounded-xl overflow-hidden hover:shadow-md transition-shadow group ${cardProps.isActive ? "border-amber-200" : "border-green-200"}`}>
      <Show when={cardProps.item.image_url}>
        <img src={cardProps.item.image_url} alt={cardProps.item.item_name} loading="lazy" class="w-full max-h-56 object-cover" />
      </Show>
      <div class="p-4">
        <div class="flex items-center gap-2 mb-1.5">
          <div class="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-card" style={{ border: "2px solid hsl(var(--primary))" }}>
            <img src={MABIS_LOGO} alt="" class="w-full h-full object-contain p-0.5" />
          </div>
          <span class="text-xs font-bold text-foreground">{cardProps.item.reported_by_name}</span>
          <span class="text-[10px] text-muted-foreground ml-auto">{formatDate(cardProps.item.created_date)}</span>
          <Show when={cardProps.isActive}>
            <button
              onClick={() => markFound.mutate(cardProps.item.id)}
              class="p-1 rounded text-green-500 hover:text-green-600 hover:bg-green-50 transition-colors"
              title="Mark found"
              aria-label={`Mark ${cardProps.item.item_name} as found`}
            >
              <CheckCircle2 class="w-3.5 h-3.5" />
            </button>
          </Show>
          <button
            onClick={() => remove.mutate(cardProps.item.id)}
            class="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
            title="Delete"
            aria-label={`Delete ${cardProps.item.item_name}`}
          >
            <Trash2 class="w-3.5 h-3.5" />
          </button>
        </div>

        <h3 class={`font-display font-bold text-base mb-1 ${cardProps.isActive ? "text-foreground" : "text-muted-foreground line-through"}`}>
          {cardProps.item.item_name}
        </h3>

        <div class="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Show when={cardProps.item.colors}>
            <span class="bg-muted text-muted-foreground px-2 py-0.5 rounded-full text-[10px]">{cardProps.item.colors}</span>
          </Show>
          <Show when={cardProps.item.last_seen}><span>Last seen: {cardProps.item.last_seen}</span></Show>
          <Show when={cardProps.item.date_lost}><span>Lost: {formatDate(cardProps.item.date_lost)}</span></Show>
        </div>
      </div>
    </div>
  );

  return (
    <div class={`mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${fullscreen() ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div class="mabis-widget-header bg-primary px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between sticky top-0 z-10">
        <div class="min-w-0">
          <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl flex items-center gap-2">
            <Search class="w-5 h-5" /> Missing Items
          </h2>
          <JapaneseText
            ja={`探し中${activeItems().length}件・発見${foundItems().length}件`}
            class="block text-primary-foreground-muted text-xs mt-0.5"
            japaneseClass="block mt-0.5 text-[0.9em]"
          >
            {activeItems().length} active · {foundItems().length} found
          </JapaneseText>
        </div>

        <div class="mabis-widget-actions flex items-center flex-wrap gap-2 shrink-0">
          <Button
            size="sm"
            variant="outline"
            class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
            onClick={() => setShowForm((s) => !s)}
          >
            <Plus class="w-3.5 h-3.5" /> {showForm() ? "Cancel" : "Report"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1.5"
            onClick={() => setShowFound((s) => !s)}
          >
            <History class="w-3.5 h-3.5" /> {showFound() ? "Hide" : "Found"}
          </Button>
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
          <div class="border border-border rounded-xl p-4 space-y-3 bg-muted">
            <Input
              placeholder="Item name (e.g. Water bottle)..."
              value={itemName()}
              onInput={(e) => setItemName(e.currentTarget.value)}
              class="rounded-lg"
            />
            <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Input
                placeholder="Colors (e.g. Blue, red cap)..."
                value={colors()}
                onInput={(e) => setColors(e.currentTarget.value)}
                class="rounded-lg"
              />
              <Input
                list="missing-locations"
                placeholder="Last seen (e.g. MPR, Lounge)..."
                value={lastSeen()}
                onInput={(e) => setLastSeen(e.currentTarget.value)}
                class="rounded-lg"
              />
            </div>
            <datalist id="missing-locations">
              <Index each={LOCATIONS}>{(loc) => <option value={loc()} />}</Index>
            </datalist>

            <Input type="date" value={dateLost()} onInput={(e) => setDateLost(e.currentTarget.value)} class="rounded-lg" />

            <div class="flex flex-wrap gap-2">
              <label class="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg border border-border bg-card hover:bg-muted text-xs font-semibold text-muted-foreground">
                <ImageIcon class="w-3.5 h-3.5" />
                {imageUrl() ? "Photo ✓" : "Add Photo"}
                <input type="file" accept="image/*" class="hidden" onChange={(e) => handleFileUpload(e.currentTarget.files[0])} />
              </label>
              <Show when={uploading()}>
                <Loader2 class="w-4 h-4 animate-spin text-primary self-center" />
              </Show>
            </div>

            <Show when={imageUrl()}>
              <div class="relative">
                <img src={imageUrl()} alt="preview" class="rounded-lg max-h-40 object-cover w-full" />
                <button onClick={() => setImageUrl("")} aria-label="Remove photo" class="absolute top-2 right-2 bg-black/50 text-primary-foreground rounded-full p-1">
                  <X class="w-3 h-3" />
                </button>
              </div>
            </Show>

            <Button
              onClick={handleSubmit}
              disabled={!itemName().trim() || create.isPending}
              class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg w-full"
            >
              <Show when={create.isPending} fallback={<Plus class="w-4 h-4" />}>
                <Loader2 class="w-4 h-4 animate-spin" />
              </Show>
              Add to Missing Items
            </Button>
          </div>
        </Show>

        <Show
          when={!itemsQuery.isLoading}
          fallback={<div class="flex justify-center py-8"><Loader2 class="w-6 h-6 animate-spin text-primary" /></div>}
        >
          <Show
            when={activeItems().length > 0 || foundItems().length > 0}
            fallback={
              <div class="flex flex-col items-center gap-2 py-8 text-muted-foreground">
                <PackageSearch class="w-10 h-10 opacity-40" />
                <JapaneseText
                  ja="まだ落とし物の報告はありません。なくしたものがあれば、上から追加してください。"
                  class="block text-sm text-center"
                  japaneseClass="mt-1 block text-[0.9em]"
                >
                  Nothing reported lost yet. If you have lost something, add it above.
                </JapaneseText>
              </div>
            }
          >
            <Show when={activeItems().length > 0}>
              <div class="space-y-3">
                <For each={activeItems()}>{(item) => <ItemCard item={item} isActive />}</For>
              </div>
            </Show>

            <Show when={foundItems().length > 0 && showFound()}>
              <div class="overflow-hidden border-t border-border pt-3 space-y-3">
                <p class="flex items-center gap-1.5 text-xs font-bold text-muted-foreground mb-1">
                  <History class="w-3.5 h-3.5" /> Found / Archived ({foundItems().length})
                </p>
                <For each={foundItems()}>{(item) => <ItemCard item={item} isActive={false} />}</For>
              </div>
            </Show>
          </Show>
        </Show>
      </div>
    </div>
  );
}
