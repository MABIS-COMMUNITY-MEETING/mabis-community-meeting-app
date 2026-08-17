import { createSignal, createMemo, createEffect, onMount, Show, For, Index } from "solid-js";
import {
  Settings, X, Type, Search, Check, Volume2, VolumeX, Accessibility,
  MousePointer2, Languages, User, LogOut, Lock, AlignLeft, LayoutList,
} from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { CORE_FONTS, FONT_LIBRARIES, FONT_PREVIEW_TEXT, applyFont, getStoredFont } from "@/lib/themes";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { animationsDisabled, setAnimationsDisabled } from "@/lib/motion-preference";
import { customCursorEnabled, setCustomCursorEnabled } from "@/lib/cursor-preference";
import { japaneseTextEnabled, setJapaneseTextEnabled } from "@/lib/japanese-text-preference";
import { sectionDescriptionsEnabled, setSectionDescriptionsEnabled } from "@/lib/section-descriptions-preference";
import { homeLayout, setHomeLayout } from "@/lib/layout-preference";
import { ensureFontCatalogStyles, FONT_CATALOG } from "@/lib/font-catalog";
import { Dialog, DialogPortal, DialogOverlay } from "~/components/ui/dialog";
import { Dialog as KDialog } from "@kobalte/core/dialog";
import { JapaneseText } from "~/components/primitives";

const FONTS = [...CORE_FONTS, ...FONT_CATALOG];

/*
 * The two Home arrangements, in the order they are offered.
 *
 * Described by what the reader will see rather than by the design vocabulary
 * behind it, as the plain-language customization rule requires. "Boss layout"
 * is Novesce's own name for the editorial front page.
 */
const LAYOUT_CHOICES = [
  {
    key: "simple",
    label: "Simple",
    ja: "シンプル",
    detail: "Default · heading, then the section. Straight to what you came for.",
    jaDetail: "標準・見出しのすぐ下に内容が並ぶ、一列の表示です。",
  },
  {
    key: "boss",
    label: "Boss layout",
    ja: "ボスレイアウト",
    detail: "The full front page · large masthead, index rail and scrolling type.",
    jaDetail: "大きな見出しや番号の列がある、雑誌のような表示です。",
  },
];

const SIMPLE_FONT_KEYS = ["gnu-free-mono", "gnu-free-sans", "go", "gnu-free-serif"];
const SIMPLE_FONT_LABELS = {
  "gnu-free-mono": "Recommended · familiar MABIS look",
  "gnu-free-sans": "Easy reading · clean letters",
  "go": "Friendly · open and simple",
  "gnu-free-serif": "Book-like · traditional reading",
};

/*
 * FontPreview — same fix as the React version.
 *
 * The preview used to render in the CURRENT site font until the target font
 * finished loading, then swap — a visible flash of the wrong face. This loads
 * the target through the Font Loading API and only switches once it resolves,
 * with GNU FreeMono (the embedded default) as the placeholder rather than
 * whatever font happens to be active.
 */
function FontPreview(props) {
  let el;
  const [ready, setReady] = createSignal(false);

  onMount(() => {
    let cancelled = false;
    let observer;

    const loadTarget = () => {
      if (!document.fonts) { if (!cancelled) setReady(true); return; }
      document.fonts.load(`17px ${props.font.body}`, FONT_PREVIEW_TEXT)
        .catch(() => {})
        .finally(() => { if (!cancelled) setReady(true); });
    };

    if (props.eager || !el || typeof IntersectionObserver === "undefined") {
      loadTarget();
    } else {
      observer = new IntersectionObserver(([entry]) => {
        if (entry?.isIntersecting) { loadTarget(); observer.disconnect(); }
      }, { rootMargin: "180px 0px" });
      observer.observe(el);
    }

    return () => { cancelled = true; observer?.disconnect(); };
  });

  return (
    <div
      ref={el}
      class="rounded-lg border border-border bg-background px-3 py-3 text-[17px] leading-snug text-foreground break-words"
      style={{ "font-family": ready() ? props.font.body : "'GNUFreeMonoUI'" }}
    >
      {FONT_PREVIEW_TEXT}
    </div>
  );
}

/** Shared on/off row — the four comfort toggles are structurally identical. */
function ToggleRow(props) {
  return (
    <button
      onClick={() => props.onToggle()}
      aria-pressed={props.on}
      class={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-colors ${
        props.on ? "border-primary/40 bg-primary/5" : "border-border"}`}
    >
      <span class="text-left text-sm font-semibold text-foreground">
        {props.label}
        <Show when={props.sublabel}>
          <span lang="ja" class="mt-0.5 block text-xs font-normal text-muted-foreground">{props.sublabel}</span>
        </Show>
      </span>
      <span class={`relative w-10 h-6 shrink-0 rounded-full transition-colors ${props.on ? "bg-primary" : "bg-muted"}`}>
        <span class={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-all ${props.on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

export default function SettingsModal(props) {
  const [currentCode, setCurrentCode] = createSignal("");
  const [newCode, setNewCode] = createSignal("");
  const [codeSaved, setCodeSaved] = createSignal(false);
  const [codeError, setCodeError] = createSignal(false);

  const [soundOn, setSoundOn] = createSignal(isSoundEnabled());
  const [animationsOn, setAnimationsOn] = createSignal(!animationsDisabled());
  const [customCursorOn, setCustomCursorOn] = createSignal(customCursorEnabled());
  const [japaneseTextOn, setJapaneseTextOn] = createSignal(japaneseTextEnabled());
  const [sectionDescriptionsOn, setSectionDescriptionsOn] = createSignal(sectionDescriptionsEnabled());
  const [layout, setLayout] = createSignal(homeLayout());

  const [currentFont, setCurrentFont] = createSignal(getStoredFont());
  const [fontAvailability, setFontAvailability] = createSignal({});
  const [fontSearch, setFontSearch] = createSignal("");
  const [fontSource, setFontSource] = createSignal("featured");
  const [fontLimit, setFontLimit] = createSignal(18);
  const [showAdvancedFonts, setShowAdvancedFonts] = createSignal(false);

  // Local-only faces are probed once on open: a licensed face the user has not
  // installed must show "Fallback", not pretend to be available.
  onMount(() => {
    if (!document.fonts) return;
    let cancelled = false;
    const aliases = { "atlas-mono": "AtlasMonoUI" };
    const localFonts = FONTS.filter((f) => f.localOnly);

    Promise.all(localFonts.map(async (font) => {
      const alias = aliases[font.key];
      try {
        const loaded = await document.fonts.load(`16px "${alias}"`, FONT_PREVIEW_TEXT);
        return [font.key, loaded.length > 0];
      } catch {
        return [font.key, false];
      }
    })).then((entries) => {
      if (!cancelled) setFontAvailability(Object.fromEntries(entries));
    });

    return () => { cancelled = true; };
  });

  createEffect(() => { fontSearch(); fontSource(); setFontLimit(18); });

  createEffect(() => {
    if (showAdvancedFonts() && (fontSource() === "by-womxn" || fontSource() === "all")) {
      void ensureFontCatalogStyles();
    }
  });

  const filteredFonts = createMemo(() => {
    if (!showAdvancedFonts()) {
      return SIMPLE_FONT_KEYS.map((key) => FONTS.find((f) => f.key === key)).filter(Boolean);
    }
    const query = fontSearch().trim().toLowerCase();
    return FONTS.filter((font) => {
      const matchesSource = fontSource() === "all"
        || (fontSource() === "featured" && font.featured)
        || (fontSource() === "by-womxn" && font.source === "Libre Fonts by Womxn");
      const matchesSearch = !query || `${font.name} ${font.detail} ${font.source}`.toLowerCase().includes(query);
      return matchesSource && matchesSearch;
    });
  });

  const visibleFonts = createMemo(() =>
    showAdvancedFonts() ? filteredFonts().slice(0, fontLimit()) : filteredFonts());

  const handleFontSelect = (key) => {
    localStorage.setItem("mabis-font-picker-version", "8");
    localStorage.setItem("mabis-font-updated-at", String(Date.now()));
    setCurrentFont(key);
    applyFont(key);
  };

  const handleSaveCode = () => {
    const existing = localStorage.getItem("mabis_admin_code") || "10260";
    if (currentCode() !== existing) { setCodeError(true); return; }
    if (newCode().trim().length === 0) return;
    localStorage.setItem("mabis_admin_code", newCode().trim());
    setCodeSaved(true);
    setCurrentCode("");
    setNewCode("");
    setCodeError(false);
    setTimeout(() => setCodeSaved(false), 2000);
  };

  const sourceChip = (key, label) => (
    <button
      type="button"
      onClick={() => setFontSource(key)}
      class={`px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${
        fontSource() === key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
    >
      {label}
    </button>
  );

  return (
    <Dialog open={props.open} onOpenChange={(o) => { if (!o) props.onClose?.(); }}>
      <DialogPortal>
        <DialogOverlay class="mobile-sheet-backdrop z-[100] bg-black/50 backdrop-blur-sm" />
        <div class="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <KDialog.Content class="mobile-sheet-panel w-full max-w-xl max-h-[85vh] overflow-y-auto rounded-2xl border border-border bg-card text-card-foreground shadow-2xl">
            <div class="mobile-sheet-header bg-primary px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div class="flex items-center gap-2.5">
                <Settings class="w-5 h-5 text-primary-foreground" />
                <KDialog.Title class="font-display font-bold text-primary-foreground text-xl">
                  <JapaneseText ja="設定" japaneseClass="text-[0.62em] opacity-80">Settings</JapaneseText>
                </KDialog.Title>
              </div>
              <KDialog.CloseButton class="text-primary-foreground/70 hover:text-primary-foreground p-1 rounded-lg hover:bg-primary-foreground/10">
                <X class="w-5 h-5" />
                <span class="sr-only">Close</span>
              </KDialog.CloseButton>
            </div>

            <div class="mobile-sheet-body p-6 space-y-6">
              {/* Simple customization */}
              <section class="border-y border-border py-4">
                <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Simple customization</p>
                <JapaneseText ja="使いやすいサイトにする" as="h3" class="mt-1 block font-display text-xl font-bold text-foreground">
                  Make the site comfortable for you
                </JapaneseText>
                <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
                  Start with colors, choose an easy-to-read font, then adjust comfort options. Every choice can be changed again.
                </p>
                <div class="mt-4 grid gap-px bg-border sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => {
                      props.onClose?.();
                      window.setTimeout(() => window.dispatchEvent(new CustomEvent("openThemeSwitcher")), 0);
                    }}
                    class="min-h-20 bg-background p-3 text-left hover:bg-muted"
                  >
                    <span class="text-[10px] font-bold text-muted-foreground">01</span>
                    <JapaneseText ja="色を選ぶ" class="mt-1 block text-sm font-bold text-foreground">Choose colors</JapaneseText>
                    <span class="mt-0.5 block text-xs text-muted-foreground">Open themes</span>
                  </button>
                  <a href="#setting-font" class="min-h-20 bg-background p-3 text-left hover:bg-muted">
                    <span class="text-[10px] font-bold text-muted-foreground">02</span>
                    <JapaneseText ja="文字を選ぶ" class="mt-1 block text-sm font-bold text-foreground">Choose text</JapaneseText>
                    <span class="mt-0.5 block text-xs text-muted-foreground">Four simple fonts</span>
                  </a>
                  <a href="#setting-comfort" class="min-h-20 bg-background p-3 text-left hover:bg-muted">
                    <span class="text-[10px] font-bold text-muted-foreground">03</span>
                    <JapaneseText ja="快適さ" class="mt-1 block text-sm font-bold text-foreground">Comfort</JapaneseText>
                    <span class="mt-0.5 block text-xs text-muted-foreground">Sound, motion, language</span>
                  </a>
                  <a href="#setting-layout" class="min-h-20 bg-background p-3 text-left hover:bg-muted">
                    <span class="text-[10px] font-bold text-muted-foreground">04</span>
                    <JapaneseText ja="レイアウト" class="mt-1 block text-sm font-bold text-foreground">Layout</JapaneseText>
                    <span class="mt-0.5 block text-xs text-muted-foreground">Simple or boss</span>
                  </a>
                </div>
              </section>

              {/* Layout */}
              <section id="setting-layout" class="scroll-mt-20">
                <div class="mb-2 flex items-center gap-2">
                  <LayoutList class="w-4 h-4 text-primary" />
                  <JapaneseText
                    ja="ページの並べ方"
                    as="h3"
                    class="block font-display font-bold text-foreground text-sm uppercase tracking-wide"
                    japaneseClass="text-[0.78em] normal-case tracking-normal"
                  >
                    Page Layout
                  </JapaneseText>
                </div>
                <p class="mb-3 text-xs text-muted-foreground">
                  How the Home page is arranged. Both choices have the same sections, in the same order, with the same features — only the amount of page around them changes.
                </p>
                <div class="grid gap-px bg-border sm:grid-cols-2">
                  <For each={LAYOUT_CHOICES}>
                    {(choice) => {
                      const selected = () => layout() === choice.key;
                      return (
                        <button
                          type="button"
                          onClick={() => { setLayout(choice.key); setHomeLayout(choice.key); }}
                          aria-pressed={selected()}
                          class="min-h-20 bg-background p-3 text-left hover:bg-muted"
                          classList={{ "ring-2 ring-inset ring-primary": selected() }}
                        >
                          <span class="flex items-center gap-1.5">
                            <JapaneseText ja={choice.ja} class="block text-sm font-bold text-foreground" japaneseClass="text-[0.78em]">
                              {choice.label}
                            </JapaneseText>
                            <Show when={selected()}>
                              <Check class="w-3.5 h-3.5 text-primary" />
                            </Show>
                          </span>
                          <JapaneseText
                            ja={choice.jaDetail}
                            class="mt-1 block text-xs leading-relaxed text-muted-foreground"
                            japaneseClass="mt-0.5 block text-[0.9em]"
                          >
                            {choice.detail}
                          </JapaneseText>
                        </button>
                      );
                    }}
                  </For>
                </div>
              </section>

              {/* Security — admin/editor only */}
              <Show when={props.isAdmin}>
                <details class="border border-border p-3">
                  <summary class="cursor-pointer text-sm font-bold text-foreground">Admin options · Advanced</summary>
                  <div class="mt-4">
                    <div class="flex items-center gap-2 mb-3">
                      <Lock class="w-4 h-4 text-primary" />
                      <h3 class="font-display font-bold text-foreground text-sm uppercase tracking-wide">Unlock Code</h3>
                    </div>
                    <p class="text-xs text-muted-foreground mb-3">
                      Change the password used to unlock admin actions (meeting mode, etc.).
                    </p>
                    <input
                      type="password"
                      value={currentCode()}
                      onInput={(e) => { setCurrentCode(e.currentTarget.value); setCodeError(false); }}
                      placeholder="Current code..."
                      class="mb-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <input
                      type="password"
                      value={newCode()}
                      onInput={(e) => setNewCode(e.currentTarget.value)}
                      placeholder="New code..."
                      class="mb-2 h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none focus:border-primary"
                    />
                    <Show when={codeError()}>
                      <p class="mb-2 text-xs font-semibold text-destructive" role="alert">Current code is incorrect.</p>
                    </Show>
                    <button
                      onClick={handleSaveCode}
                      class="h-10 w-full rounded-lg bg-primary text-sm font-bold text-primary-foreground hover:opacity-90"
                    >
                      {codeSaved() ? "Code updated!" : "Save"}
                    </button>
                  </div>
                </details>
              </Show>

              {/* Typography */}
              <div id="setting-font" class="scroll-mt-20">
                <div class="flex items-center justify-between gap-3 mb-2">
                  <div class="flex items-center gap-2">
                    <Type class="w-4 h-4 text-primary" />
                    <JapaneseText ja="表示フォント" as="h3" class="block font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClass="text-[0.78em] normal-case tracking-normal">
                      UI Font
                    </JapaneseText>
                  </div>
                  <span class="text-[10px] text-muted-foreground tabular-nums">
                    {showAdvancedFonts() ? `${FONTS.length} choices` : "4 easy choices"}
                  </span>
                </div>
                <p class="text-xs text-muted-foreground mb-3">
                  Pick the sample that feels easiest to read. GNU FreeMono is the recommended default. Japanese text always uses the Maple Mono fallback.
                </p>

                <div class="rounded-xl border border-border bg-muted/50 p-3 mb-3">
                  <p class="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Current UI preview</p>
                  <p class="text-[20px] leading-snug text-foreground break-words" style={{ "font-family": "var(--font-body)" }}>
                    {FONT_PREVIEW_TEXT}
                  </p>
                </div>

                <Show when={showAdvancedFonts()}>
                  <div class="relative mb-2.5">
                    <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                    <input
                      type="search"
                      value={fontSearch()}
                      onInput={(e) => setFontSearch(e.currentTarget.value)}
                      placeholder="Search the font library..."
                      class="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary/40"
                    />
                  </div>
                  <div class="flex flex-wrap gap-1.5 mb-3">
                    {sourceChip("featured", "Featured")}
                    {sourceChip("by-womxn", "Libre Fonts by Womxn")}
                    {sourceChip("all", "All")}
                  </div>
                </Show>

                <div class="grid gap-2.5">
                  <For each={visibleFonts()}>
                    {(font) => {
                      const selected = () => currentFont() === font.key;
                      const available = () => (font.localOnly ? fontAvailability()[font.key] : true);
                      return (
                        <button
                          type="button"
                          onClick={() => handleFontSelect(font.key)}
                          aria-pressed={selected()}
                          class={`w-full text-left rounded-xl border-2 p-3.5 transition-colors ${
                            selected() ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                        >
                          <div class="flex items-start justify-between gap-3 mb-2.5">
                            <div class="min-w-0">
                              <div class="flex flex-wrap items-center gap-1.5">
                                <span class="text-sm font-bold text-foreground">{font.name}</span>
                                <Show when={font.key === "gnu-free-mono"}>
                                  <span class="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">
                                    Default
                                  </span>
                                </Show>
                                <Show when={selected()}><Check class="h-3.5 w-3.5 text-primary" /></Show>
                              </div>
                              <p class="text-[10px] leading-4 text-muted-foreground mt-0.5">
                                {showAdvancedFonts() ? font.detail : SIMPLE_FONT_LABELS[font.key]}
                              </p>
                            </div>
                            <Show when={showAdvancedFonts()}>
                              <div class="shrink-0 flex items-center gap-1.5">
                                <span class={`h-1.5 w-1.5 rounded-full ${
                                  available() ? "bg-green-500" : available() === false ? "bg-amber-400" : "bg-muted"}`} />
                                <span class="text-[9px] uppercase tracking-wider text-muted-foreground">
                                  {font.localOnly
                                    ? (available() ? "Installed" : available() === false ? "Fallback" : "Checking")
                                    : "Embedded"}
                                </span>
                              </div>
                            </Show>
                          </div>
                          <FontPreview font={font} eager={selected()} />
                          <Show when={showAdvancedFonts() && font.localOnly && available() === false}>
                            <p class="mt-2 text-[10px] leading-4 text-amber-600">
                              This commercial face needs a licensed local/webfont copy. GNU FreeMono is active until that file is available.
                            </p>
                          </Show>
                        </button>
                      );
                    }}
                  </For>
                </div>

                <Show when={visibleFonts().length === 0}>
                  <div class="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                    No fonts match this search.
                  </div>
                </Show>

                <Show when={showAdvancedFonts() && filteredFonts().length > visibleFonts().length}>
                  <button
                    type="button"
                    onClick={() => setFontLimit((v) => v + 18)}
                    class="mt-2.5 w-full h-9 rounded-lg border border-border text-xs font-bold text-foreground hover:border-primary/30"
                  >
                    Show more · {filteredFonts().length - visibleFonts().length} remaining
                  </button>
                </Show>

                <Show when={showAdvancedFonts()}>
                  <div class="mt-3 grid gap-1.5">
                    <For each={FONT_LIBRARIES}>
                      {(library) => (
                        <div class="flex flex-col gap-1 border-t border-border pt-2 text-[10px] sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                          <Show
                            when={library.url}
                            fallback={<span class="font-bold text-foreground">{library.name}</span>}
                          >
                            <a href={library.url} target="_blank" rel="noreferrer" class="font-bold text-foreground underline underline-offset-2">
                              {library.name}
                            </a>
                          </Show>
                          <span class="leading-4 text-muted-foreground sm:max-w-[70%] sm:text-right">{library.detail}</span>
                        </div>
                      )}
                    </For>
                  </div>
                </Show>

                <button
                  type="button"
                  onClick={() => { setShowAdvancedFonts((v) => !v); setFontSearch(""); setFontSource("featured"); }}
                  aria-expanded={showAdvancedFonts()}
                  class="mt-3 min-h-11 w-full border border-border px-3 text-sm font-bold text-foreground hover:border-primary/40"
                >
                  {showAdvancedFonts() ? "Show only easy choices" : `Advanced font choices · ${FONTS.length} total`}
                </button>
              </div>

              {/* Comfort */}
              <div id="setting-comfort" class="scroll-mt-20 border-t border-border pt-5">
                <JapaneseText ja="快適さの設定" as="p" class="block text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground" japaneseClass="text-[10px] normal-case tracking-normal">
                  Comfort options
                </JapaneseText>
                <p class="mt-1 text-sm text-muted-foreground">
                  Turn each option on or off. Changes happen immediately and are remembered.
                </p>
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <Show when={soundOn()} fallback={<VolumeX class="w-4 h-4 text-muted-foreground" />}>
                    <Volume2 class="w-4 h-4 text-primary" />
                  </Show>
                  <JapaneseText ja="効果音" as="h3" class="block font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClass="text-[0.78em] normal-case tracking-normal">
                    Sound Effects
                  </JapaneseText>
                </div>
                <ToggleRow
                  on={soundOn()}
                  label={soundOn() ? "On" : "Off"}
                  onToggle={() => { const v = !soundOn(); setSoundOn(v); setSoundEnabled(v); }}
                />
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <Accessibility class="w-4 h-4 text-primary" />
                  <JapaneseText ja="アニメーション" as="h3" class="block font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClass="text-[0.78em] normal-case tracking-normal">
                    Animations
                  </JapaneseText>
                </div>
                <p class="text-xs text-muted-foreground mb-3">
                  Keep interface transitions and glass motion active. Your device's reduced-motion setting is always respected.
                </p>
                <ToggleRow
                  on={animationsOn()}
                  label={animationsOn() ? "Enabled" : "Disabled"}
                  onToggle={() => { const v = !animationsOn(); setAnimationsOn(v); setAnimationsDisabled(!v); }}
                />
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <MousePointer2 class={`w-4 h-4 ${customCursorOn() ? "text-primary" : "text-muted-foreground"}`} />
                  <JapaneseText ja="カスタムカーソル" as="h3" class="block font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClass="text-[0.78em] normal-case tracking-normal">
                    Custom Cursor
                  </JapaneseText>
                </div>
                <p class="text-xs text-muted-foreground mb-3">
                  Use the animated liquid cursor on mouse and trackpad devices. Turning it off restores the normal system cursor.
                </p>
                <ToggleRow
                  on={customCursorOn()}
                  label={customCursorOn() ? "Enabled" : "Disabled"}
                  onToggle={() => { const v = !customCursorOn(); setCustomCursorOn(v); setCustomCursorEnabled(v); }}
                />
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <Languages class={`w-4 h-4 ${japaneseTextOn() ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 class="font-display font-bold text-foreground text-sm uppercase tracking-wide">
                    Japanese Text <span lang="ja" data-ja-always class="normal-case tracking-normal text-muted-foreground">／日本語表示</span>
                  </h3>
                </div>
                <p class="text-xs text-muted-foreground mb-3">
                  Show short Japanese translations alongside the English navigation and guidance. English stays visible, and this choice follows your account.
                </p>
                <ToggleRow
                  on={japaneseTextOn()}
                  label={japaneseTextOn() ? "On · Japanese appears with English" : "Off · English only"}
                  sublabel={japaneseTextOn() ? "オン・英語と日本語を表示" : "オフ・英語のみ"}
                  onToggle={() => { const v = !japaneseTextOn(); setJapaneseTextOn(v); setJapaneseTextEnabled(v); }}
                />
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <AlignLeft class={`w-4 h-4 ${sectionDescriptionsOn() ? "text-primary" : "text-muted-foreground"}`} />
                  <JapaneseText ja="見出しの説明文" as="h3" class="block font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClass="text-[0.78em] normal-case tracking-normal">
                    Section Descriptions
                  </JapaneseText>
                </div>
                <p class="text-xs text-muted-foreground mb-3">
                  The explanatory line under each section heading on the Home page. Off by default — turn it on if you are new here or showing someone around.
                </p>
                <ToggleRow
                  on={sectionDescriptionsOn()}
                  label={sectionDescriptionsOn() ? "On · Show the description under each heading" : "Off · Headings only"}
                  sublabel={sectionDescriptionsOn() ? "オン・見出しの下に説明を表示" : "オフ・見出しのみ"}
                  onToggle={() => { const v = !sectionDescriptionsOn(); setSectionDescriptionsOn(v); setSectionDescriptionsEnabled(v); }}
                />
              </div>

              <div>
                <div class="flex items-center gap-2 mb-3">
                  <User class="w-4 h-4 text-primary" />
                  <JapaneseText ja="アカウント" as="h3" class="block font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClass="text-[0.78em] normal-case tracking-normal">
                    Account
                  </JapaneseText>
                </div>
                <div class="space-y-2">
                  <button
                    onClick={() => base44.auth.logout()}
                    class="w-full flex items-center gap-2 text-left text-sm font-bold text-primary-foreground bg-primary px-3 py-2.5 rounded-lg hover:opacity-90 transition-colors"
                  >
                    <LogOut class="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>

              <p class="text-center text-xs text-muted-foreground pt-2">
                Settings are remembered and follow your account.
              </p>
            </div>
          </KDialog.Content>
        </div>
      </DialogPortal>
    </Dialog>
  );
}
