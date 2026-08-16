import { createSignal, createEffect, onMount, onCleanup, Index, Show } from "solid-js";
import { getStoredThemeKey } from "@/lib/theme-boot";

/**
 * The Pride collection's lighting layer — 1:1 port of
 * src/components/PrideAmbience.jsx.
 *
 * Each palette carries its own lighting geometry (see lib/pride.js): where the
 * coloured light sits, how far it drifts and how slowly. Motion is deliberately
 * near-subconscious — a minute-long cycle, never a moving gradient you notice.
 * On interaction the field briefly gains a little energy, then settles back to
 * restraint so the page is never permanently oversaturated.
 */
export default function PrideAmbience() {
  const [theme, setTheme] = createSignal(null);
  let layerEl;

  /*
   * The pride palettes load dynamically, not as a static import.
   *
   * This component is mounted by App.jsx on every route, so a static import of
   * @/lib/pride — and, worse, of @/lib/themes for one key lookup — anchored the
   * whole theme catalogue in the boot chunk. Roughly 117 KB of source parsed
   * before first paint, to render a background glow that most themes do not
   * even use.
   *
   * Nothing renders until a pride theme is active, so arriving a moment late is
   * invisible: there is no layout to shift and no text to reflow.
   */
  let palettes = null;
  const sync = async () => {
    const key = getStoredThemeKey();
    if (!palettes) {
      try {
        ({ PRIDE_THEMES: palettes } = await import("@/lib/pride"));
      } catch {
        return;   // offline: the ambience layer simply stays off
      }
    }
    setTheme(palettes[key] || null);
  };

  onMount(() => {
    void sync();
    window.addEventListener("themeChanged", sync);
    onCleanup(() => window.removeEventListener("themeChanged", sync));
  });

  createEffect(() => {
    if (!theme()) return;
    let t;
    const pulse = () => {
      layerEl?.classList.add("is-energized");
      clearTimeout(t);
      t = setTimeout(() => layerEl?.classList.remove("is-energized"), 900);
    };
    window.addEventListener("pointerdown", pulse, { passive: true });
    onCleanup(() => { window.removeEventListener("pointerdown", pulse); clearTimeout(t); });
  });

  return (
    <Show when={theme()}>
      {(active) => {
        const spec = () => active().pride;
        return (
          <div ref={layerEl} class="pride-ambience fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
            <Index each={spec().field}>
              {(f) => (
                <div
                  class="pride-field-x absolute"
                  style={{
                    left: `${f().x}%`,
                    top: `${f().y}%`,
                    width: `${f().r}vmax`,
                    height: `${f().r}vmax`,
                    "margin-left": `-${f().r / 2}vmax`,
                    "margin-top": `-${f().r / 2}vmax`,
                    "--field-x-positive": `${f().d}%`,
                    "--field-x-negative": `${-f().d * 0.6}%`,
                    "--field-y-negative": `${-f().d * 0.8}%`,
                    "--field-y-positive": `${f().d * 0.5}%`,
                    "--field-speed": `${f().s}s`,
                    "--field-y-speed": `${f().s * 1.31}s`,
                  }}
                >
                  <div class="pride-field-y h-full w-full">
                    <div
                      class="pride-field-light h-full w-full rounded-full"
                      style={{
                        "--field-alpha": f().a,
                        background: `radial-gradient(circle, ${spec().flag[f().c]} 0%, transparent 68%)`,
                      }}
                    />
                  </div>
                </div>
              )}
            </Index>

            <Show when={spec().ring}>
              <div
                class="pride-orbit absolute left-1/2 top-1/2 rounded-full"
                style={{
                  width: "58vmax",
                  height: "58vmax",
                  "margin-left": "-29vmax",
                  "margin-top": "-29vmax",
                  border: `1px solid ${spec().flag[1]}`,
                  opacity: 0.22,
                }}
              />
            </Show>

            <Show when={spec().chevron}>
              <div
                class="pride-chevron absolute inset-y-0 left-0 w-[46vmax]"
                style={{
                  background: `linear-gradient(105deg, ${spec().flag[5]}22 0%, ${spec().flag[1]}18 42%, transparent 72%)`,
                  "clip-path": "polygon(0 0, 62% 0, 100% 50%, 62% 100%, 0 100%, 34% 50%)",
                }}
              />
            </Show>
          </div>
        );
      }}
    </Show>
  );
}
