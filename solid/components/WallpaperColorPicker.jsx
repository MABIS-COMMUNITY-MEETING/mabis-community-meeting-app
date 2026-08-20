import { createSignal, Show, For } from "solid-js";
import { ImagePlus } from "lucide-solid";
import { extractWallpaperPalette } from "@/lib/color/wallpaper-palette";

/*
 * "Bring a wallpaper" — pick an image, get its Material You seed colors.
 *
 * A seed is not an accent: the best one is applied immediately and generates
 * the ENTIRE scheme (page, cards, borders, text, accents) from its tonal
 * palettes. Tapping another swatch re-seeds the whole scheme from that color.
 *
 * Everything stays on this device: the image is read into a canvas for color
 * statistics and never uploaded anywhere.
 */
export default function WallpaperColorPicker(props) {
  let inputEl;
  const [swatches, setSwatches] = createSignal([]);
  const [busy, setBusy] = createSignal(false);
  const [error, setError] = createSignal("");

  const handleFile = async (file) => {
    if (!file) return;
    setBusy(true);
    setError("");
    try {
      const palette = await extractWallpaperPalette(file, 6);
      if (palette.length === 0) throw new Error("empty");
      setSwatches(palette);
      props.onSeed?.(palette[0]);
    } catch {
      setError("Couldn't read colors from that image. Try another one.");
    } finally {
      setBusy(false);
      if (inputEl) inputEl.value = "";
    }
  };

  return (
    <div class="rounded-lg border border-border p-2.5">
      <input
        ref={inputEl}
        type="file"
        accept="image/*"
        class="hidden"
        onChange={(e) => handleFile(e.currentTarget.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputEl?.click()}
        disabled={busy()}
        class="flex w-full min-h-10 items-center justify-center gap-2 border border-border px-3 text-xs font-bold text-foreground hover:bg-muted disabled:opacity-50"
      >
        <ImagePlus class="w-3.5 h-3.5" />
        {busy() ? "Reading colors…" : "Make a theme from an image"}
      </button>
      <p class="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        Choose a wallpaper or photo and the whole theme — pages, cards and buttons — is made from it, right on your device.
      </p>
      <Show when={error()}>
        <p class="mt-1.5 text-[10px] text-destructive">{error()}</p>
      </Show>
      <Show when={swatches().length > 0}>
        <div class="mt-2 flex flex-wrap gap-1.5">
          <For each={swatches()}>
            {(hex) => (
              <button
                type="button"
                onClick={() => props.onSeed?.(hex)}
                class="h-7 w-7 rounded-full border border-border transition-transform hover:scale-110"
                style={{ background: hex }}
                title={`Build the theme from ${hex.toUpperCase()}`}
                aria-label={`Build the theme from ${hex.toUpperCase()}`}
              />
            )}
          </For>
        </div>
        <p class="mt-1.5 text-[10px] text-muted-foreground">
          The best color was used. Tap another swatch to build the theme from that one instead.
        </p>
      </Show>
    </div>
  );
}