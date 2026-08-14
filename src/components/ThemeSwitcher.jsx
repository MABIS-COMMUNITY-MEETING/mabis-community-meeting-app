import React, { memo, useCallback, useEffect, useRef, useState } from "react";
import { Palette, Check, RotateCcw, Save, Trash2, Star } from "lucide-react";
import {
  THEMES, applyTheme, applyCustomColors, clearCustomColors,
  getStoredTheme, getStoredCustomColors, hslToHex,
  getSavedThemes, saveCustomTheme, deleteSavedTheme,
} from "@/lib/themes";

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

const THEME_ENTRIES = Object.entries(THEMES);
const SIMPLE_THEME_KEYS = ["default", "sage", "sky", "sakura", "midnight", "lesbian"];
const SIMPLE_THEME_ENTRIES = SIMPLE_THEME_KEYS.map((key) => [key, THEMES[key]]).filter(([, theme]) => theme);

const ThemeOption = memo(function ThemeOption({ entry, active, onSelect }) {
  const [key, theme] = entry;
  return (
    <button
      type="button"
      onClick={() => onSelect(key)}
      aria-pressed={active}
      className={`relative min-h-[58px] rounded-xl border-2 p-2.5 text-left transition-[border-color,box-shadow] duration-150 ${
        active
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-muted-foreground"
      }`}
      style={{ contain: "layout style" }}
    >
      <span className="mb-1.5 block truncate text-[11px] font-bold text-foreground">
        {theme.name}
      </span>
      <span
        aria-hidden="true"
        className="block h-4 w-full rounded-full border border-border"
        style={{ background: paletteStripe(theme) }}
      />
      {active && (
        <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary">
          <Check className="h-2.5 w-2.5 text-primary-foreground" />
        </span>
      )}
    </button>
  );
});

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("default");
  const [customActive, setCustomActive] = useState(false);
  const [customPrimary, setCustomPrimary] = useState("#951E3A");
  const [customSecondary, setCustomSecondary] = useState("#EACE54");
  const [savedThemes, setSavedThemes] = useState([]);
  const [themeName, setThemeName] = useState("");
  const [showCustom, setShowCustom] = useState(false);
  const [themeLimit, setThemeLimit] = useState(INITIAL_THEME_LIMIT);
  const [showAllThemes, setShowAllThemes] = useState(false);
  const menuRef = useRef(null);
  const loadMoreRef = useRef(null);
  const visibleThemes = showAllThemes ? THEME_ENTRIES.slice(0, themeLimit) : SIMPLE_THEME_ENTRIES;
  const hasMoreThemes = showAllThemes && themeLimit < THEME_ENTRIES.length;

  const loadNextThemeBatch = useCallback(() => {
    setThemeLimit((limit) => Math.min(limit + THEME_BATCH_SIZE, THEME_ENTRIES.length));
  }, []);

  useEffect(() => {
    const openFromSettings = () => {
      setThemeLimit(INITIAL_THEME_LIMIT);
      setShowAllThemes(false);
      setOpen(true);
    };
    window.addEventListener("openThemeSwitcher", openFromSettings);
    return () => window.removeEventListener("openThemeSwitcher", openFromSettings);
  }, []);

  useEffect(() => {
    const stored = getStoredTheme();
    setCurrentTheme(stored);
    const custom = getStoredCustomColors();
    if (custom) {
      setCustomActive(true);
      setCustomPrimary(custom.primary);
      setCustomSecondary(custom.secondary);
    }
    setSavedThemes(getSavedThemes());
  }, []);

  useEffect(() => {
    if (!open || !hasMoreThemes) return undefined;
    const root = menuRef.current;
    const target = loadMoreRef.current;
    if (!root || !target || typeof IntersectionObserver === "undefined") return undefined;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) loadNextThemeBatch();
      },
      { root, rootMargin: "80px 0px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [hasMoreThemes, loadNextThemeBatch, open]);

  const handleSelectTheme = useCallback((key) => {
    setCurrentTheme(key);
    setCustomActive(false);
    clearCustomColors({ notify: false });
    applyTheme(key);
    const theme = THEMES[key];
    setCustomPrimary(hslToHex(theme.vars["--primary"]));
    setCustomSecondary(hslToHex(theme.vars["--secondary"]));
  }, []);

  const handleCustomColor = (which, hex) => {
    if (which === "primary") setCustomPrimary(hex);
    else setCustomSecondary(hex);
    setCustomActive(true);
    applyCustomColors(
      which === "primary" ? hex : customPrimary,
      which === "secondary" ? hex : customSecondary
    );
  };

  const handleSaveTheme = () => {
    const name = themeName.trim();
    if (!name) return;
    setSavedThemes(saveCustomTheme(name, customPrimary, customSecondary));
    setThemeName("");
  };

  const handleLoadSaved = (theme) => {
    setCustomPrimary(theme.primary);
    setCustomSecondary(theme.secondary);
    setCustomActive(true);
    applyCustomColors(theme.primary, theme.secondary);
  };

  const handleDeleteSaved = (name) => {
    setSavedThemes(deleteSavedTheme(name));
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => {
          if (!open) {
            setThemeLimit(INITIAL_THEME_LIMIT);
            setShowAllThemes(false);
          }
          setOpen((value) => !value);
        }}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="flex h-9 items-center justify-center gap-1.5 border border-foreground/30 bg-background px-2.5 text-foreground transition-colors hover:bg-foreground hover:text-background"
        title="Change colors">
        <Palette className="w-4 h-4" />
        <span className="hidden text-[10px] font-bold uppercase tracking-wide lg:inline">Colors</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div
            ref={menuRef}
            role="dialog"
            aria-label="Choose a theme"
            className="fixed left-1/2 -translate-x-1/2 top-16 w-[min(20rem,calc(100vw-1.5rem))] sm:absolute sm:left-auto sm:translate-x-0 sm:top-full sm:right-0 sm:mt-2 sm:w-80 bg-popover text-popover-foreground border border-border p-4 z-50 max-h-[75vh] overflow-y-auto overscroll-contain shadow-xl"
            style={{ contain: "layout style" }}
          >
            <div className="mb-4 border-b border-border pb-3">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <h3 className="text-base font-bold text-foreground">Choose your colors</h3>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Pick one of the easy choices. Your current choice is {THEMES[currentTheme]?.name || "Custom"}.
              </p>
            </div>

            {/* Theme presets */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {visibleThemes.map((entry) => (
                <ThemeOption
                  key={entry[0]}
                  entry={entry}
                  active={currentTheme === entry[0] && !customActive}
                  onSelect={handleSelectTheme}
                />
              ))}
            </div>
            {!showAllThemes ? (
              <button
                type="button"
                onClick={() => {
                  setShowAllThemes(true);
                  setThemeLimit(INITIAL_THEME_LIMIT);
                }}
                className="mb-4 min-h-11 w-full border border-border px-3 text-sm font-bold text-foreground hover:bg-muted"
              >
                Browse all themes · {THEME_ENTRIES.length}
              </button>
            ) : (
              <div ref={loadMoreRef} className="mb-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setShowAllThemes(false)}
                  className="min-h-10 w-full border border-border px-3 text-xs font-bold text-foreground hover:bg-muted"
                >
                  Back to easy choices
                </button>
                {hasMoreThemes && (
                  <button
                    type="button"
                    onClick={loadNextThemeBatch}
                    className="min-h-10 w-full border border-border px-3 text-xs font-bold text-foreground hover:bg-muted"
                  >
                    Show more themes ({visibleThemes.length}/{THEME_ENTRIES.length})
                  </button>
                )}
              </div>
            )}

            {/* Saved custom themes */}
            {savedThemes.length > 0 && (
              <div className="border-t border-border pt-3 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-bold text-foreground">Saved Themes</span>
                </div>
                <div className="space-y-1.5">
                  {savedThemes.map(t => (
                    <div key={t.name} className="flex items-center gap-2 p-2 rounded-lg border border-border hover:border-muted-foreground transition-colors group">
                      <button onClick={() => handleLoadSaved(t)} className="flex items-center gap-2 flex-1 text-left">
                        <div className="flex gap-1">
                          <div className="w-4 h-4 rounded-full border border-border" style={{ background: t.primary }} />
                          <div className="w-4 h-4 rounded-full border border-border" style={{ background: t.secondary }} />
                        </div>
                        <span className="text-xs font-semibold text-foreground truncate">{t.name}</span>
                      </button>
                      <button onClick={() => handleDeleteSaved(t.name)}
                        className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom theme builder */}
            <div className="border-t border-border pt-3">
              <div onClick={() => setShowCustom(s => !s)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer"
                style={{ borderColor: customActive ? "#951E3A" : "#e5e7eb" }}>
                <span className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full border border-border" style={{ background: customPrimary }} />
                    <div className="w-4 h-4 rounded-full border border-border" style={{ background: customSecondary }} />
                  </div>
                  <span className="text-xs font-bold text-foreground">Make your own colors · Advanced</span>
                </span>
                {customActive && (
                  <button onClick={(e) => { e.stopPropagation(); handleSelectTheme(currentTheme); }}
                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {showCustom && (
                <div className="mt-3 space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="color" value={customPrimary} onChange={(e) => handleCustomColor("primary", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Primary</p>
                      <p className="text-[10px] text-muted-foreground">{customPrimary.toUpperCase()}</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="color" value={customSecondary} onChange={(e) => handleCustomColor("secondary", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-border cursor-pointer shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-foreground">Secondary</p>
                      <p className="text-[10px] text-muted-foreground">{customSecondary.toUpperCase()}</p>
                    </div>
                  </label>
                  <div className="flex gap-1.5">
                    <input type="text" placeholder="Theme name..." value={themeName}
                      onChange={(e) => setThemeName(e.target.value)}
                      className="flex-1 h-9 rounded-lg border border-border px-2.5 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTheme()} />
                    <button onClick={handleSaveTheme} disabled={!themeName.trim()}
                      className="flex items-center gap-1 px-3 h-9 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40 hover:opacity-90 transition-colors">
                      <Save className="w-3 h-3" /> Save
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}