import { createSignal, Show, For } from "solid-js";
import { ImagePlus } from "lucide-solid";
import { extractWallpaperPalette } from "@/lib/color/wallpaper-palette";

/*
 * "Bring a wallpaper" — pick an image, get its Material You-style seed
 * colors as swatches. Extraction applies the two best colors immediately;
 * tapping a swatch afterwards makes THAT color the primary.
 *
 * Everything stays on this device: the image is read into a canvas for
 * color statistics and never uploaded anywhere.
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
      props.onPalette?.(palette[0], palette[1] || palette[0]);
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
        {busy() ? "Reading colors…" : "Pick colors from an image"}
      </button>
      <p class="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
        Choose a wallpaper or photo and the theme colors are made from it, right on your device.
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
                onClick={() => props.onPickPrimary?.(hex)}
                class="h-7 w-7 rounded-full border border-border transition-transform hover:scale-110"
                style={{ background: hex }}
                title={`Use ${hex.toUpperCase()} as primary`}
                aria-label={`Use ${hex.toUpperCase()} as primary color`}
              />
            )}
          </For>
        </div>
        <p class="mt-1.5 text-[10px] text-muted-foreground">
          The two best colors were applied. Tap a swatch to make it the primary instead.
        </p>
      </Show>
    </div>
  );
}