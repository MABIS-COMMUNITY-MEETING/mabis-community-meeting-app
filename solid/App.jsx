import { createSignal, onMount, onCleanup, For } from "solid-js";
import { THEMES, applyTheme, getStoredTheme } from "@/lib/themes";
import { translateUiText } from "@/lib/japanese-ui-translations";

/*
 * Solid migration — foundation smoke test.
 *
 * This is deliberately not a port of a real page yet. It proves the three
 * things the whole migration depends on, before 190 more files are touched:
 *
 *   1. vite-plugin-solid compiles JSX to DOM ops and the app mounts.
 *   2. The React app's theme engine (lib/themes.js) drives Solid unchanged —
 *      it writes CSS custom properties on documentElement and contains no
 *      React, so the entire 133-theme system, glass, and type scale carry over
 *      with zero rewriting. This is where the "look" actually lives.
 *   3. The Japanese translation dictionary works unchanged, so the companion
 *      text feature survives the migration.
 *
 * Verified against the React build: same tokens, same fonts, same classes.
 */
export default function App() {
  const [theme, setTheme] = createSignal(getStoredTheme());
  const [clock, setClock] = createSignal("");

  onMount(() => {
    const tick = () =>
      setClock(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    tick();
    const id = setInterval(tick, 1000);
    // Solid has no dependency arrays; onCleanup is the disposal hook and runs
    // when the owning scope is disposed. Clearing this matters — a leaked
    // interval keeps a closure (and its signals) alive for the page lifetime.
    onCleanup(() => clearInterval(id));
  });

  const pick = (key) => {
    setTheme(key);
    applyTheme(key);
  };

  const themeKeys = Object.keys(THEMES).slice(0, 12);

  return (
    <div class="min-h-screen bg-background text-foreground px-6 py-10 sm:px-10">
      <div class="mx-auto max-w-3xl">
        <div class="mb-6 flex items-center gap-3">
          <span class="h-px w-10 bg-primary" />
          <span class="jp-kicker">SOLID MIGRATION · FOUNDATION</span>
        </div>

        <h1 class="font-display text-[clamp(2.2rem,9vw,4rem)] font-light leading-[0.92] tracking-[-0.05em]">
          COMMUNITY
          <span class="block text-foreground/28">MEETING</span>
        </h1>

        <p class="mt-6 max-w-xl border-t jp-rule pt-4 text-sm leading-6 text-muted-foreground">
          Rendered by SolidJS, styled by the existing MABIS theme engine — no CSS was rewritten.
          <span lang="ja" class="mt-1 block text-[0.9em]">
            SolidJSで描画し、既存のMABISテーマ機能でスタイルを適用しています。CSSは書き換えていません。
          </span>
        </p>

        <div class="mt-8 border-t jp-rule pt-4">
          <p class="tech-label text-muted-foreground">
            LIVE CLOCK <span class="tabular-nums text-foreground">{clock()}</span>
          </p>
          <p class="tech-label mt-2 text-muted-foreground">
            DICTIONARY CHECK · "announcements" → <span lang="ja" class="text-foreground">{translateUiText("announcements")}</span>
          </p>
          <p class="tech-label mt-2 text-muted-foreground">
            ACTIVE THEME <span class="text-foreground">{theme()}</span>
          </p>
        </div>

        <div class="mt-8 border-t jp-rule pt-4">
          <p class="tech-label mb-3 text-muted-foreground">THEME ENGINE — SHARED WITH THE REACT BUILD</p>
          <div class="flex flex-wrap gap-2">
            <For each={themeKeys}>
              {(key) => (
                <button
                  type="button"
                  onClick={() => pick(key)}
                  class="min-h-9 border border-foreground/30 bg-background px-3 tech-label text-foreground transition-colors hover:bg-foreground hover:text-background"
                >
                  {THEMES[key].name}
                </button>
              )}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}
