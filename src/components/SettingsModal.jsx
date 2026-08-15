import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Lock, User, LogOut, Check, Volume2, VolumeX, Accessibility, Type, Search, MousePointer2, Languages } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { animationsDisabled, setAnimationsDisabled } from "@/lib/motion-preference";
import { customCursorEnabled, setCustomCursorEnabled } from "@/lib/cursor-preference";
import { japaneseTextEnabled, setJapaneseTextEnabled } from "@/lib/japanese-text-preference";
import { CORE_FONTS, FONT_LIBRARIES, FONT_PREVIEW_TEXT, applyFont, getStoredFont } from "@/lib/themes";
import { FONT_CATALOG, ensureFontCatalogStyles } from "@/lib/font-catalog";
import JapaneseText from "@/components/JapaneseText";

const FONTS = [...CORE_FONTS, ...FONT_CATALOG];

const SIMPLE_FONT_KEYS = ["gnu-free-mono", "gnu-free-sans", "go", "gnu-free-serif"];
const SIMPLE_FONT_LABELS = {
  "gnu-free-mono": "Recommended · familiar MABIS look",
  "gnu-free-sans": "Easy reading · clean letters",
  "go": "Friendly · open and simple",
  "gnu-free-serif": "Book-like · traditional reading",
};

function FontPreview({ font, eager = false }) {
  const ref = useRef(null);
  // Previews used to show the CURRENT site font (whatever that happened to
  // be) until the target font finished loading, then swap — a visible flash
  // of a mismatched face. This instead actively loads the target font via
  // the Font Loading API and only switches the style once it has actually
  // resolved, so there is no intermediate wrong-font paint. Before that, the
  // placeholder is always the embedded default (GNU FreeMono), never
  // whichever font happens to be active.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let observer;

    const loadTarget = () => {
      if (!document.fonts) {
        if (!cancelled) setReady(true);
        return;
      }
      document.fonts.load(`17px ${font.body}`, FONT_PREVIEW_TEXT)
        .catch(() => {})
        .finally(() => { if (!cancelled) setReady(true); });
    };

    if (eager || !ref.current || typeof IntersectionObserver === "undefined") {
      loadTarget();
    } else {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            loadTarget();
            observer.disconnect();
          }
        },
        { rootMargin: "180px 0px" },
      );
      observer.observe(ref.current);
    }

    return () => { cancelled = true; observer?.disconnect(); };
  }, [eager, font.body]);

  return (
    <div
      ref={ref}
      className="rounded-lg border border-border bg-background px-3 py-3 text-[17px] leading-snug text-foreground break-words"
      style={{ fontFamily: ready ? font.body : "'GNUFreeMonoUI'" }}
    >
      {FONT_PREVIEW_TEXT}
    </div>
  );
}

export default function SettingsModal({ open, onClose, isAdmin }) {
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [codeSaved, setCodeSaved] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [animationsOn, setAnimationsOn] = useState(() => !animationsDisabled());
  const [customCursorOn, setCustomCursorOn] = useState(customCursorEnabled());
  const [japaneseTextOn, setJapaneseTextOn] = useState(japaneseTextEnabled());
  const [currentFont, setCurrentFont] = useState(getStoredFont());
  const [fontAvailability, setFontAvailability] = useState({});
  const [fontSearch, setFontSearch] = useState("");
  const [fontSource, setFontSource] = useState("featured");
  const [fontLimit, setFontLimit] = useState(18);
  const [showAdvancedFonts, setShowAdvancedFonts] = useState(false);
  const deferredFontSearch = useDeferredValue(fontSearch);

  useEffect(() => {
    if (!open) return;
    setCurrentFont(getStoredFont());
    setAnimationsOn(!animationsDisabled());
    setCustomCursorOn(customCursorEnabled());
    setJapaneseTextOn(japaneseTextEnabled());
    if (!document.fonts) return;
    let cancelled = false;
    const aliases = {
      "transgender-grotesk": "TransgenderGroteskUI",
      "atlas-mono": "AtlasMonoUI",
    };
    const localFonts = FONTS.filter((font) => font.localOnly);
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
  }, [open]);

  useEffect(() => {
    setFontLimit(18);
  }, [fontSearch, fontSource]);

  useEffect(() => {
    if (!open || !showAdvancedFonts || (fontSource !== "by-womxn" && fontSource !== "all")) return;
    void ensureFontCatalogStyles();
  }, [open, fontSource, showAdvancedFonts]);

  const filteredFonts = useMemo(() => {
    if (!showAdvancedFonts) {
      return SIMPLE_FONT_KEYS.map((key) => FONTS.find((font) => font.key === key)).filter(Boolean);
    }
    const query = deferredFontSearch.trim().toLowerCase();
    return FONTS.filter((font) => {
      const matchesSource = fontSource === "all"
        || (fontSource === "featured" && font.featured)
        || (fontSource === "by-womxn" && font.source === "Libre Fonts by Womxn");
      const matchesSearch = !query || `${font.name} ${font.detail} ${font.source}`.toLowerCase().includes(query);
      return matchesSource && matchesSearch;
    });
  }, [deferredFontSearch, fontSource, showAdvancedFonts]);

  const visibleFonts = showAdvancedFonts ? filteredFonts.slice(0, fontLimit) : filteredFonts;

  const handleFontSelect = (key) => {
    localStorage.setItem("mabis-font-picker-version", "8");
    localStorage.setItem("mabis-font-updated-at", String(Date.now()));
    setCurrentFont(key);
    applyFont(key);
  };

  const handleSaveCode = () => {
    const existing = localStorage.getItem("mabis_admin_code") || "10260";
    if (currentCode !== existing) { setCodeError(true); return; }
    if (newCode.trim().length === 0) return;
    localStorage.setItem("mabis_admin_code", newCode.trim());
    setCodeSaved(true);
    setCurrentCode("");
    setNewCode("");
    setCodeError(false);
    setTimeout(() => setCodeSaved(false), 2000);
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="mobile-sheet-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="mobile-sheet-panel bg-card text-card-foreground border border-border rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <div className="mobile-sheet-header bg-primary px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-primary-foreground" />
                <JapaneseText ja="設定" as="h2" className="font-display font-bold text-primary-foreground text-xl" japaneseClassName="text-[0.62em] opacity-80">Settings</JapaneseText>
              </div>
              <button onClick={onClose} className="text-primary-foreground/70 hover:text-primary-foreground p-1 rounded-lg hover:bg-primary-foreground/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mobile-sheet-body p-6 space-y-6">
              <section className="border-y border-border py-4">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">Simple customization</p>
                <JapaneseText ja="使いやすいサイトにする" as="h3" className="mt-1 font-display text-xl font-bold text-foreground">Make the site comfortable for you</JapaneseText>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Start with colors, choose an easy-to-read font, then adjust comfort options. Every choice can be changed again.</p>
                <div className="mt-4 grid gap-px bg-border sm:grid-cols-3">
                  <button type="button" onClick={() => {
                    onClose();
                    window.setTimeout(() => window.dispatchEvent(new CustomEvent("openThemeSwitcher")), 0);
                  }} className="min-h-20 bg-background p-3 text-left hover:bg-muted">
                    <span className="text-[10px] font-bold text-muted-foreground">01</span>
                    <JapaneseText ja="色を選ぶ" className="mt-1 block text-sm font-bold text-foreground">Choose colors</JapaneseText>
                    <span className="mt-0.5 block text-xs text-muted-foreground">Open themes</span>
                  </button>
                  <a href="#setting-font" className="min-h-20 bg-background p-3 text-left hover:bg-muted">
                    <span className="text-[10px] font-bold text-muted-foreground">02</span>
                    <JapaneseText ja="文字を選ぶ" className="mt-1 block text-sm font-bold text-foreground">Choose text</JapaneseText>
                    <span className="mt-0.5 block text-xs text-muted-foreground">Four simple fonts</span>
                  </a>
                  <a href="#setting-comfort" className="min-h-20 bg-background p-3 text-left hover:bg-muted">
                    <span className="text-[10px] font-bold text-muted-foreground">03</span>
                    <JapaneseText ja="快適さ" className="mt-1 block text-sm font-bold text-foreground">Comfort</JapaneseText>
                    <span className="mt-0.5 block text-xs text-muted-foreground">Sound, motion, language</span>
                  </a>
                </div>
              </section>

              {/* Security — admin/editor only */}
              {isAdmin && (
                <details className="border border-border p-3">
                  <summary className="cursor-pointer text-sm font-bold text-foreground">Admin options · Advanced</summary>
                  <div className="mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-primary" />
                    <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wide">Unlock Code</h3>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">Change the password used to unlock admin actions (meeting mode, etc.).</p>
                  <input type="password" value={currentCode} onChange={(e) => { setCurrentCode(e.target.value); setCodeError(false); }} placeholder="Current code..."
                    className={`w-full h-9 rounded-lg border-2 px-3 text-sm font-semibold tracking-widest outline-none mb-2 ${codeError ? "border-red-400 bg-red-50" : "border-border focus:border-primary/40"}`} />
                  {codeError && <p className="text-xs text-red-500 font-semibold mb-2">Current code is incorrect.</p>}
                  <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Enter new code..."
                    className="w-full h-9 rounded-lg border border-border px-3 text-sm font-semibold tracking-widest outline-none focus:border-primary/40 mb-2" />
                  <button onClick={handleSaveCode}
                    className="w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-bold hover:opacity-90 transition-colors flex items-center justify-center">
                    {codeSaved ? <Check className="w-4 h-4" /> : "Save"}
                  </button>
                  {codeSaved && <p className="text-xs text-green-600 font-semibold mt-2">Code updated!</p>}
                  </div>
                </details>
              )}

              {/* Typography */}
              <div id="setting-font" className="scroll-mt-20">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-primary" />
                    <JapaneseText ja="表示フォント" as="h3" className="font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClassName="text-[0.78em] normal-case tracking-normal">UI Font</JapaneseText>
                  </div>
                  <span className="text-[10px] text-muted-foreground tabular-nums">{showAdvancedFonts ? `${FONTS.length} choices` : "4 easy choices"}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Pick the sample that feels easiest to read. GNU FreeMono is the recommended default. Japanese text always uses the Maple Mono fallback.
                </p>

                <div className="rounded-xl border border-border bg-muted/50 p-3 mb-3">
                  <p className="text-[9px] uppercase tracking-[0.2em] text-muted-foreground mb-1.5">Current UI preview</p>
                  <p className="text-[20px] leading-snug text-foreground break-words" style={{ fontFamily: "var(--font-body)" }}>
                    {FONT_PREVIEW_TEXT}
                  </p>
                </div>

                {showAdvancedFonts && <>
                <div className="relative mb-2.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                  <input
                    type="search"
                    value={fontSearch}
                    onChange={(event) => setFontSearch(event.target.value)}
                    placeholder="Search the font library..."
                    className="w-full h-9 rounded-lg border border-border bg-background pl-9 pr-3 text-xs outline-none focus:border-primary/40"
                  />
                </div>

                <div className="flex flex-wrap gap-1.5 mb-3">
                  <button
                    type="button"
                    onClick={() => setFontSource("featured")}
                    className={`px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${fontSource === "featured" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                  >
                    Featured
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSource("by-womxn")}
                    className={`px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${fontSource === "by-womxn" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                  >
                    Libre Fonts by Womxn
                  </button>
                  <button
                    type="button"
                    onClick={() => setFontSource("all")}
                    className={`px-2.5 py-1.5 rounded-full border text-[10px] font-bold ${fontSource === "all" ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}
                  >
                    All
                  </button>
                </div>
                </>}

                <div className="grid gap-2.5">
                  {visibleFonts.map((font) => {
                    const selected = currentFont === font.key;
                    const available = font.localOnly ? fontAvailability[font.key] : true;
                    return (
                      <button
                        key={font.key}
                        type="button"
                        onClick={() => handleFontSelect(font.key)}
                        aria-pressed={selected}
                        className={`w-full text-left rounded-xl border-2 p-3.5 transition-colors ${selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-sm font-bold text-foreground">{font.name}</span>
                              {font.key === "gnu-free-mono" && (
                                <span className="rounded-full bg-primary px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary-foreground">Default</span>
                              )}
                              {selected && <Check className="h-3.5 w-3.5 text-primary" />}
                            </div>
                            <p className="text-[10px] leading-4 text-muted-foreground mt-0.5">{showAdvancedFonts ? font.detail : SIMPLE_FONT_LABELS[font.key]}</p>
                          </div>
                          {showAdvancedFonts && <div className="shrink-0 flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${available ? "bg-green-500" : available === false ? "bg-amber-400" : "bg-muted"}`} />
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground">
                              {font.localOnly ? (available ? "Installed" : available === false ? "Fallback" : "Checking") : "Embedded"}
                            </span>
                          </div>}
                        </div>
                        <FontPreview font={font} eager={selected} />
                        {showAdvancedFonts && font.localOnly && available === false && (
                          <p className="mt-2 text-[10px] leading-4 text-amber-600">
                            This commercial face needs a licensed local/webfont copy. Go is active until that file is available.
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>

                {visibleFonts.length === 0 && (
                  <div className="rounded-lg border border-dashed border-border px-3 py-5 text-center text-xs text-muted-foreground">
                    No fonts match this search.
                  </div>
                )}
                {showAdvancedFonts && filteredFonts.length > visibleFonts.length && (
                  <button
                    type="button"
                    onClick={() => setFontLimit((value) => value + 18)}
                    className="mt-2.5 w-full h-9 rounded-lg border border-border text-xs font-bold text-foreground hover:border-primary/30"
                  >
                    Show more · {filteredFonts.length - visibleFonts.length} remaining
                  </button>
                )}

                {showAdvancedFonts && <div className="mt-3 grid gap-1.5">
                  {FONT_LIBRARIES.map((library) => (
                    <div key={library.key} className="flex flex-col gap-1 border-t border-border pt-2 text-[10px] sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                      {library.url ? (
                        <a href={library.url} target="_blank" rel="noreferrer" className="font-bold text-foreground underline underline-offset-2">
                          {library.name}
                        </a>
                      ) : (
                        <span className="font-bold text-foreground">{library.name}</span>
                      )}
                      <span className="leading-4 text-muted-foreground sm:max-w-[70%] sm:text-right">{library.detail}</span>
                    </div>
                  ))}
                </div>}
                <button type="button" onClick={() => {
                  setShowAdvancedFonts((value) => !value);
                  setFontSearch("");
                  setFontSource("featured");
                }} className="mt-3 min-h-11 w-full border border-border px-3 text-sm font-bold text-foreground hover:border-primary/40" aria-expanded={showAdvancedFonts}>
                  {showAdvancedFonts ? "Show only easy choices" : `Advanced font choices · ${FONTS.length} total`}
                </button>
              </div>

              <div id="setting-comfort" className="scroll-mt-20 border-t border-border pt-5">
                <JapaneseText ja="快適さの設定" as="p" className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground" japaneseClassName="text-[10px] normal-case tracking-normal">Comfort options</JapaneseText>
                <p className="mt-1 text-sm text-muted-foreground">Turn each option on or off. Changes happen immediately and are remembered.</p>
              </div>

              {/* Sound */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {soundOn ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
                  <JapaneseText ja="効果音" as="h3" className="font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClassName="text-[0.78em] normal-case tracking-normal">Sound Effects</JapaneseText>
                </div>
                <button onClick={() => { const v = !soundOn; setSoundOn(v); setSoundEnabled(v); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-colors ${soundOn ? "border-primary/40 bg-primary/5" : "border-border"}`}>
                  <span className="text-sm font-semibold text-foreground">{soundOn ? "On" : "Off"}</span>
                  <span className={`relative w-10 h-6 rounded-full transition-colors ${soundOn ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-all ${soundOn ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
              </div>

              {/* Motion */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Accessibility className="w-4 h-4 text-primary" />
                  <JapaneseText ja="アニメーション" as="h3" className="font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClassName="text-[0.78em] normal-case tracking-normal">Animations</JapaneseText>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Keep interface transitions and glass motion active. Your device's reduced-motion setting is always respected.</p>
                <button
                  onClick={() => {
                    const value = !animationsOn;
                    setAnimationsOn(value);
                    setAnimationsDisabled(!value);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-colors ${animationsOn ? "border-primary/40 bg-primary/5" : "border-border"}`}
                  aria-pressed={animationsOn}
                >
                  <span className="text-sm font-semibold text-foreground">{animationsOn ? "Enabled" : "Disabled"}</span>
                  <span className={`relative w-10 h-6 rounded-full transition-colors ${animationsOn ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-all ${animationsOn ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
              </div>

              {/* Custom cursor */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MousePointer2 className={`w-4 h-4 ${customCursorOn ? "text-primary" : "text-muted-foreground"}`} />
                  <JapaneseText ja="カスタムカーソル" as="h3" className="font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClassName="text-[0.78em] normal-case tracking-normal">Custom Cursor</JapaneseText>
                </div>
                <p className="text-xs text-muted-foreground mb-3">Use the animated liquid cursor on mouse and trackpad devices. Turning it off restores the normal system cursor.</p>
                <button
                  onClick={() => {
                    const value = !customCursorOn;
                    setCustomCursorOn(value);
                    setCustomCursorEnabled(value);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-colors ${customCursorOn ? "border-primary/40 bg-primary/5" : "border-border"}`}
                  aria-pressed={customCursorOn}
                >
                  <span className="text-sm font-semibold text-foreground">{customCursorOn ? "Enabled" : "Disabled"}</span>
                  <span className={`relative w-10 h-6 rounded-full transition-colors ${customCursorOn ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-all ${customCursorOn ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
              </div>

              {/* Japanese companion text */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Languages className={`w-4 h-4 ${japaneseTextOn ? "text-primary" : "text-muted-foreground"}`} />
                  <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wide">Japanese Text <span lang="ja" className="normal-case tracking-normal text-muted-foreground">／日本語表示</span></h3>
                </div>
                <p className="text-xs text-muted-foreground mb-3">
                  Show short Japanese translations alongside the English navigation and guidance. English stays visible, and this choice follows your account.
                </p>
                <button
                  onClick={() => {
                    const value = !japaneseTextOn;
                    setJapaneseTextOn(value);
                    setJapaneseTextEnabled(value);
                  }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-colors ${japaneseTextOn ? "border-primary/40 bg-primary/5" : "border-border"}`}
                  aria-pressed={japaneseTextOn}
                >
                  <span className="text-left text-sm font-semibold text-foreground">
                    {japaneseTextOn ? "On · Japanese appears with English" : "Off · English only"}
                    <span lang="ja" className="mt-0.5 block text-xs font-normal text-muted-foreground">
                      {japaneseTextOn ? "オン・英語と日本語を表示" : "オフ・英語のみ"}
                    </span>
                  </span>
                  <span className={`relative w-10 h-6 shrink-0 rounded-full transition-colors ${japaneseTextOn ? "bg-primary" : "bg-muted"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background shadow transition-all ${japaneseTextOn ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
              </div>

              {/* Account */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-primary" />
                  <JapaneseText ja="アカウント" as="h3" className="font-display font-bold text-foreground text-sm uppercase tracking-wide" japaneseClassName="text-[0.78em] normal-case tracking-normal">Account</JapaneseText>
                </div>
                <div className="space-y-2">
                  <button onClick={() => base44.auth.logout()}
                    className="w-full flex items-center gap-2 text-left text-sm font-bold text-primary-foreground bg-primary px-3 py-2.5 rounded-lg hover:opacity-90 transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-muted-foreground pt-2">Settings are remembered and follow your account.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>, document.body
  );
}