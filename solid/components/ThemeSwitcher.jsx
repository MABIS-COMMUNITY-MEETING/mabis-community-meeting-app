import { createSignal, createMemo, onMount, onCleanup, createEffect, Show, For } from "solid-js";
import { Palette, Check, RotateCcw, Save, Trash2, Star, Search } from "lucide-solid";
import {
  THEMES, getSelectableThemeKeys, applyTheme, applyCustomColors, clearCustomColors,
  getStoredTheme, getStoredCustomColors,
  getSavedThemes, saveMaterialTheme, deleteSavedTheme,
  areBossThemesUnlockedLocally, BOSS_THEMES_UNLOCKED_EVENT,
  applyMaterialSeed, getStoredMaterialSeed, clearMaterialSeed,
  getStoredMaterialMode, setStoredMaterialMode,
} from "@/lib/themes";
import { JapaneseText } from "~/components/primitives";
import WallpaperColorPicker from "~/components/WallpaperColorPicker";

const INITIAL_THEME_LIMIT = 20;
const THEME_BATCH_SIZE = 20;

const THEME_STRIPES = new WeakMap();

function paletteStripe(theme) {
  const cached = THEME_STRIPES.get(theme);
  if (cached) return cached;
  const swatches = theme.swatches || [];
  if (swatches.length === 0) return "transparent";
  const stops = swatches.flatMap((color, index) => {
    const start = (index / swatches.length) * 100;
    const end = ((index + 1) / swatches.length) * 100;
    return [`${color} ${start}%`, `${color} ${end}%`];
  });
  const stripe = `linear-gradient(90deg, ${stops.join(", ")})`;
  THEME_STRIPES.set(theme, stripe);
  return stripe;
}

/*
 * Both lists come from getSelectableThemeKeys(), never direct catalogue enumeration.
 *
 * The helper returns MABIS until the Boss-style easter egg is unlocked, then
 * exposes the large themed catalogue. Keeping that decision out of this
 * surface prevents the picker from bypassing the 69-press gate.
 */
const EASY_THEME_LIMIT = 8;

/*
 * ThemeSwitcher — Solid port of src/components/ThemeSwitcher.jsx.
 *
 * The React version wraps ThemeOption in memo() and every handler in
 * useCallback, because rendering 133 theme buttons meant 133 re-renders on
 * each state change. None of that is needed here: Solid creates the DOM once
 * and only the specific attribute bound to a changed signal updates, so a
 * theme change touches two `aria-pressed` values and nothing else.
 *
 * The batched rendering (20 at a time, IntersectionObserver to load more) is
 * KEPT even so — it is about DOM node count and paint cost on a weak device,
 * not about reconciliation, so it helps in both frameworks.
 */
function ThemeOption(props) {
  return (
    <button
      type="button"
      onClick={() => props.onSelect(props.entry[0])}
      aria-pressed={props.active}
      class={`relative min-h-[58px] rounded-xl border-2 p-2.5 text-left transition-[border-color,box-shadow] duration-150 ${
        props.active ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-muted-foreground"
      }`}
      style={{ contain: "layout style" }}
    >
      <span class="mb-1.5 block truncate text-[11px] font-bold text-foreground">
        {props.entry[1].name}
      </span>
      <span
        aria-hidden="true"
        class="block h-4 w-full rounded-full border border-border"
        style={{ background: paletteStripe(props.entry[1]) }}
      />
      <Show when={props.active}>
        <span class="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
          <Check class="h-2.5 w-2.5 text-primary-foreground" />
        </span>
      </Show>
    </button>
  );
}

export default function ThemeSwitcher(props) {
  let menuEl;
  let loadMoreEl;

  const [open, setOpen] = createSignal(false);
  const [currentTheme, setCurrentTheme] = createSignal("default");
  const [customActive, setCustomActive] = createSignal(false);
  const [customPrimary, setCustomPrimary] = createSignal("#951E3A");
  const [customSecondary, setCustomSecondary] = createSignal("#EACE54");
  const [savedThemes, setSavedThemes] = createSignal([]);
  // Whether the active custom look came from a Material You seed (owns every
  // surface and has its own light/dark mode). The plain pair path remains only
  // for loading themes saved before the Material builder became the sole
  // creation flow.
  const [materialSeedActive, setMaterialSeedActive] = createSignal(false);
  const [materialDark, setMaterialDark] = createSignal(getStoredMaterialMode() === "dark");
  const [bossThemesUnlocked, setBossThemesUnlocked] = createSignal(areBossThemesUnlockedLocally());
  const [themeName, setThemeName] = createSignal("");
  const [showCustom, setShowCustom] = createSignal(false);
  const [themeLimit, setThemeLimit] = createSignal(INITIAL_THEME_LIMIT);
  const [showAllThemes, setShowAllThemes] = createSignal(false);
  const [themeSearch, setThemeSearch] = createSignal("");
  const themeEntries = createMemo(() => {
    bossThemesUnlocked();
    return getSelectableThemeKeys()
    .map((key) => [key, THEMES[key]])
    .filter(([, theme]) => theme);
  });
  const simpleThemeEntries = createMemo(() => themeEntries().slice(0, EASY_THEME_LIMIT));
  const hasThemeCatalogue = () => themeEntries().length > 1;

  /*
   * The catalogue is 140 themes revealed twenty at a time, so anything added
   * near the end of THEMES was six "Show more" clicks from being seen. Same
   * filter the font picker already uses, and it runs before the batching so a
   * search finds a match wherever it sits in the list.
   */
  const matchingThemes = createMemo(() => {
    const query = themeSearch().trim().toLowerCase();
    if (!query) return themeEntries();
    return themeEntries().filter(([key, theme]) =>
      theme.name.toLowerCase().includes(query) || key.toLowerCase().includes(query));
  });

  const visibleThemes = createMemo(() =>
    (showAllThemes() ? matchingThemes().slice(0, themeLimit()) : simpleThemeEntries()));
  const hasMoreThemes = () => showAllThemes() && themeLimit() < matchingThemes().length;

  const loadNextThemeBatch = () =>
    setThemeLimit((limit) => Math.min(limit + THEME_BATCH_SIZE, themeEntries().length));

  onMount(() => {
    const openFromSettings = () => {
      setThemeLimit(INITIAL_THEME_LIMIT);
      setShowAllThemes(false);
      setOpen(true);
    };
    window.addEventListener("openThemeSwitcher", openFromSettings);
    onCleanup(() => window.removeEventListener("openThemeSwitcher", openFromSettings));

    const onBossThemesUnlock = () => setBossThemesUnlocked(true);
    window.addEventListener(BOSS_THEMES_UNLOCKED_EVENT, onBossThemesUnlock);
    onCleanup(() => window.removeEventListener(BOSS_THEMES_UNLOCKED_EVENT, onBossThemesUnlock));

    const storedTheme = getStoredTheme();
    setCurrentTheme(storedTheme);
    if (storedTheme !== "default") applyTheme(storedTheme, { persist: false });
    const seed = getStoredMaterialSeed();
    if (seed) {
      setCustomActive(true);
      setMaterialSeedActive(true);
      setCustomPrimary(seed);
      setMaterialDark(getStoredMaterialMode() === "dark");
      applyMaterialSeed(seed, { persist: false, dark: getStoredMaterialMode() === "dark" });
    } else {
      const custom = getStoredCustomColors();
      if (custom) {
        setCustomActive(true);
        setCustomPrimary(custom.primary);
        setCustomSecondary(custom.secondary);
      }
    }
    setSavedThemes(getSavedThemes());
  });

  // Infinite-scroll batch loading, scoped to the menu's own scroll container.
  createEffect(() => {
    if (!open() || !hasMoreThemes()) return;
    if (!menuEl || !loadMoreEl || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry?.isIntersecting) loadNextThemeBatch(); },
      { root: menuEl, rootMargin: "80px 0px" },
    );
    observer.observe(loadMoreEl);
    onCleanup(() => observer.disconnect());
  });

  const handleSelectTheme = (key) => {
    setCurrentTheme(key);
    setCustomActive(false);
    setMaterialSeedActive(false);
    clearCustomColors({ notify: false });
    clearMaterialSeed();
    applyTheme(key);
  };

  const handleSaveTheme = () => {
    const name = themeName().trim();
    if (!name || !materialSeedActive()) return;
    const updated = saveMaterialTheme(name, customPrimary(), materialDark());
    setSavedThemes(updated);
    setThemeName("");
  };

  // A wallpaper seed is a WHOLE Material You scheme — page, cards, borders and
  // accents — not a primary/secondary pair, so it never goes through
  // applyCustomColors (which keeps the previous theme's surfaces).
  const handleWallpaperSeed = (seedHex) => {
    setCustomPrimary(seedHex);
    setCustomActive(true);
    setMaterialSeedActive(true);
    applyMaterialSeed(seedHex, { dark: materialDark() });
  };

  // The Material You scheme's own light/dark choice. Independent of every
  // named theme's polarity — picking Dark here never depends on, and never
  // gets overwritten by, a catalogue theme like Catppuccin Mocha.
  const handleMaterialModeChange = (mode) => {
    const isDark = mode === "dark";
    setMaterialDark(isDark);
    setStoredMaterialMode(mode);
    if (materialSeedActive()) applyMaterialSeed(customPrimary(), { dark: isDark });
  };

  const handleLoadSaved = (theme) => {
    if (theme.type === "material") {
      setCustomPrimary(theme.seed);
      setMaterialSeedActive(true);
      setMaterialDark(!!theme.dark);
      setCustomActive(true);
      applyMaterialSeed(theme.seed, { dark: !!theme.dark });
      return;
    }
    setCustomPrimary(theme.primary);
    setCustomSecondary(theme.secondary);
    setCustomActive(true);
    if (materialSeedActive()) {
      setMaterialSeedActive(false);
      clearMaterialSeed();
    }
    applyCustomColors(theme.primary, theme.secondary);
  };

  return (
    <div class="relative">
      {/* triggerClass: Home's default layout passes the original site's rounded
          control. Everything else keeps the editorial square, label and all. */}
      <button
        type="button"
        onClick={() => {
          if (!open()) { setThemeLimit(INITIAL_THEME_LIMIT); setShowAllThemes(false); }
          setOpen((v) => !v);
        }}
        aria-expanded={open()}
        aria-haspopup="dialog"
        class={props.triggerClass
          || "flex h-9 items-center justify-center gap-1.5 border border-foreground/30 bg-background px-2.5 text-foreground transition-colors hover:bg-foreground hover:text-background"}
        title="Change colors"
      >
        <Palette class="w-4 h-4" />
        <Show when={!props.triggerClass}>
          <span class="hidden text-[10px] font-bold uppercase tracking-wide lg:inline">Colors</span>
        </Show>
      </button>

      <Show when={open()}>
        <div class="fixed inset-0 z-40" onClick={() => setOpen(false)} />
        <div
          ref={menuEl}
          role="dialog"
          aria-label="Choose a theme"
          class="fixed left-1/2 -translate-x-1/2 top-16 w-[min(20rem,calc(100vw-1.5rem))] sm:absolute sm:left-auto sm:translate-x-0 sm:top-full sm:right-0 sm:mt-2 sm:w-80 bg-popover text-popover-foreground border border-border p-4 z-50 max-h-[75vh] overflow-y-auto overscroll-contain shadow-xl"
          style={{ contain: "layout style" }}
        >
          <div class="mb-4 border-b border-border pb-3">
            <div class="flex items-center gap-2">
              <Palette class="w-4 h-4 text-primary" />
              <h3 class="text-base font-bold text-foreground">
                <JapaneseText ja="好きな色を選ぶ" japaneseClass="block text-[0.7em] font-normal">Choose your colors</JapaneseText>
              </h3>
            </div>
            <p class="mt-1 text-xs leading-relaxed text-muted-foreground">
              Pick one of the easy choices. Your current choice is {THEMES[currentTheme()]?.name || "Custom"}.
            </p>
          </div>

          <Show when={showAllThemes()}>
            <div class="relative mb-3">
              <Search class="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={themeSearch()}
                onInput={(e) => { setThemeSearch(e.currentTarget.value); setThemeLimit(INITIAL_THEME_LIMIT); }}
                placeholder="Search themes…"
                aria-label="Search themes"
                class="h-9 w-full rounded-lg border border-border bg-background pl-8 pr-2.5 text-xs text-foreground outline-none focus:border-primary"
              />
            </div>
          </Show>

          <div class="grid grid-cols-2 gap-2 mb-4">
            <For each={visibleThemes()}>
              {(entry) => (
                <ThemeOption
                  entry={entry}
                  active={currentTheme() === entry[0] && !customActive()}
                  onSelect={handleSelectTheme}
                />
              )}
            </For>
          </div>

          <Show when={hasThemeCatalogue()}>
          <Show
            when={showAllThemes()}
            fallback={
              <button
                type="button"
                onClick={() => { setShowAllThemes(true); setThemeLimit(INITIAL_THEME_LIMIT); }}
                class="mb-4 min-h-11 w-full border border-border px-3 text-sm font-bold text-foreground hover:bg-muted"
              >
                Browse all themes · {themeEntries().length}
              </button>
            }
          >
            <div ref={loadMoreEl} class="mb-4 space-y-2">
              <Show when={visibleThemes().length === 0}>
                <p class="px-1 py-2 text-xs text-muted-foreground">
                  No theme matches “{themeSearch()}”.
                </p>
              </Show>
              <button
                type="button"
                onClick={() => { setShowAllThemes(false); setThemeSearch(""); }}
                class="min-h-10 w-full border border-border px-3 text-xs font-bold text-foreground hover:bg-muted"
              >
                Back to easy choices
              </button>
              <Show when={hasMoreThemes()}>
                <button
                  type="button"
                  onClick={loadNextThemeBatch}
                  class="min-h-10 w-full border border-border px-3 text-xs font-bold text-foreground hover:bg-muted"
                >
                  Show more themes ({visibleThemes().length}/{matchingThemes().length})
                </button>
              </Show>
            </div>
          </Show>
          </Show>

          <Show when={savedThemes().length > 0}>
            <div class="border-t border-border pt-3 mb-4">
              <div class="flex items-center gap-1.5 mb-2">
                <Star class="w-3 h-3 text-amber-500" />
                <span class="text-xs font-bold text-foreground">Saved Themes</span>
              </div>
              <div class="space-y-1.5">
                <For each={savedThemes()}>
                  {(t) => (
                    <div class="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-muted-foreground transition-colors group">
                      <button onClick={() => handleLoadSaved(t)} class="flex items-center gap-2 flex-1 text-left">
                        <div class="flex gap-1">
                          <div class="w-4 h-4 rounded-full border border-border" style={{ background: t.primary }} />
                          <div class="w-4 h-4 rounded-full border border-border" style={{ background: t.secondary }} />
                        </div>
                        <span class="text-xs font-semibold text-foreground truncate">{t.name}</span>
                        <Show when={t.type === "material"}>
                          <span class="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                            Photo
                          </span>
                        </Show>
                      </button>
                      <button
                        onClick={() => setSavedThemes(deleteSavedTheme(t.name))}
                        class="p-1 rounded text-muted-foreground hover:text-destructive transition-colors"
                        aria-label={`Delete ${t.name}`}
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </For>
              </div>
            </div>
          </Show>

          <div class="border-t border-border pt-3">
            <div
              class="flex w-full items-center justify-between rounded-xl border-2 p-2.5 transition-all"
              style={{ "border-color": customActive() ? "hsl(var(--primary))" : "hsl(var(--border))" }}
            >
              <button
                type="button"
                aria-expanded={showCustom()}
                onClick={() => setShowCustom((s) => !s)}
                class="min-h-8 flex-1 text-left text-xs font-bold text-foreground"
              >
                Create a Material theme · Advanced
              </button>
              <Show when={customActive()}>
                <button
                  type="button"
                  onClick={() => handleSelectTheme(currentTheme())}
                  class="flex min-h-8 items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"
                >
                  <RotateCcw class="w-3 h-3" /> Reset
                </button>
              </Show>
            </div>

            <Show when={showCustom()}>
              <div class="mt-3 space-y-2.5">
                <WallpaperColorPicker onSeed={handleWallpaperSeed} />
                {/*
                 * The photo/wallpaper theme's own light-or-dark choice. It is
                 * stored and applied independently of every named catalogue
                 * theme (see getStoredMaterialMode/applyMaterialSeed in
                 * lib/themes.js) — picking Dark here can never be flipped by
                 * visiting a dark theme like Catppuccin Mocha, and visiting a
                 * dark theme can never make a photo theme go dark on its own.
                 */}
                <div class="rounded-lg border border-border p-2.5">
                  <p class="mb-2 text-xs font-semibold text-foreground">Photo theme: light or dark</p>
                  <div class="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleMaterialModeChange("light")}
                      aria-pressed={!materialDark()}
                      class={`flex-1 min-h-9 rounded-lg border text-xs font-bold transition-colors ${
                        !materialDark() ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      Light
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMaterialModeChange("dark")}
                      aria-pressed={materialDark()}
                      class={`flex-1 min-h-9 rounded-lg border text-xs font-bold transition-colors ${
                        materialDark() ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                    >
                      Dark
                    </button>
                  </div>
                  <p class="mt-1.5 text-[10px] leading-relaxed text-muted-foreground">
                    Only changes the theme built from a photo above. Other themes keep their own look.
                  </p>
                </div>
                <div class="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Theme name..."
                    value={themeName()}
                    onInput={(e) => setThemeName(e.currentTarget.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSaveTheme(); }}
                    class="flex-1 h-9 rounded-lg border border-border bg-background px-2.5 text-xs"
                  />
                  <button
                    onClick={handleSaveTheme}
                    disabled={!themeName().trim() || !materialSeedActive()}
                    class="flex items-center gap-1 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-colors"
                  >
                    <Save class="w-3 h-3" /> Save
                  </button>
                </div>
              </div>
            </Show>
          </div>
        </div>
      </Show>
    </div>
  );
}