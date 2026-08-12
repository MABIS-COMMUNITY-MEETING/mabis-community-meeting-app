import React, { useState, useEffect } from "react";
import { Palette, Check, RotateCcw, Save, Trash2, Star } from "lucide-react";
import {
  THEMES, applyTheme, applyCustomColors, clearCustomColors,
  getStoredTheme, getStoredCustomColors, hslToHex,
  getSavedThemes, saveCustomTheme, deleteSavedTheme,
} from "@/lib/themes";

export default function ThemeSwitcher() {
  const [open, setOpen] = useState(false);
  const [currentTheme, setCurrentTheme] = useState("default");
  const [customActive, setCustomActive] = useState(false);
  const [customPrimary, setCustomPrimary] = useState("#951E3A");
  const [customSecondary, setCustomSecondary] = useState("#EACE54");
  const [savedThemes, setSavedThemes] = useState([]);
  const [themeName, setThemeName] = useState("");
  const [showCustom, setShowCustom] = useState(false);

  useEffect(() => {
    const stored = getStoredTheme();
    setCurrentTheme(stored);
    applyTheme(stored);
    const custom = getStoredCustomColors();
    if (custom) {
      setCustomActive(true);
      setCustomPrimary(custom.primary);
      setCustomSecondary(custom.secondary);
    }
    setSavedThemes(getSavedThemes());
  }, []);

  const handleSelectTheme = (key) => {
    setCurrentTheme(key);
    setCustomActive(false);
    clearCustomColors();
    applyTheme(key);
    const theme = THEMES[key];
    setCustomPrimary(hslToHex(theme.vars["--primary"]));
    setCustomSecondary(hslToHex(theme.vars["--secondary"]));
  };

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
      <button onClick={() => setOpen(!open)}
        className="w-9 h-9 rounded-lg border border-gray-200 bg-white flex items-center justify-center hover:bg-gray-50 transition-colors shadow-sm"
        title="Change theme">
        <Palette className="w-4 h-4 text-gray-600" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 -translate-x-1/2 top-16 w-[min(18rem,calc(100vw-1.5rem))] sm:absolute sm:left-auto sm:translate-x-0 sm:top-full sm:right-0 sm:mt-2 sm:w-72 bg-white rounded-2xl shadow-xl border border-gray-200 p-4 z-50 max-h-[75vh] overflow-y-auto">
            <div className="flex items-center gap-2 mb-4">
              <Palette className="w-4 h-4 text-[#951E3A]" />
              <h3 className="text-sm font-bold text-gray-800">Themes</h3>
            </div>

            {/* Theme presets */}
            <div className="grid grid-cols-2 gap-2 mb-4">
              {Object.entries(THEMES).map(([key, theme]) => (
                <button key={key} onClick={() => handleSelectTheme(key)}
                  className={`relative p-2.5 rounded-xl border-2 transition-all text-left ${
                    currentTheme === key && !customActive
                      ? "border-[#951E3A] ring-2 ring-[#951E3A]/20"
                      : "border-gray-200 hover:border-gray-300"
                  }`}>
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <span className="text-[11px] font-bold text-gray-700 truncate">{theme.name}</span>
                  </div>
                  <div className="flex gap-1">
                    {theme.swatches.map((c, i) => (
                      <div key={i} className="w-4 h-4 rounded-full border border-gray-200" style={{ background: c }} />
                    ))}
                  </div>
                  {currentTheme === key && !customActive && (
                    <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#951E3A] flex items-center justify-center">
                      <Check className="w-2.5 h-2.5 text-white" />
                    </div>
                  )}
                </button>
              ))}
            </div>

            {/* Saved custom themes */}
            {savedThemes.length > 0 && (
              <div className="border-t border-gray-100 pt-3 mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Star className="w-3 h-3 text-amber-500" />
                  <span className="text-xs font-bold text-gray-600">Saved Themes</span>
                </div>
                <div className="space-y-1.5">
                  {savedThemes.map(t => (
                    <div key={t.name} className="flex items-center gap-2 p-2 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors group">
                      <button onClick={() => handleLoadSaved(t)} className="flex items-center gap-2 flex-1 text-left">
                        <div className="flex gap-1">
                          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: t.primary }} />
                          <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: t.secondary }} />
                        </div>
                        <span className="text-xs font-semibold text-gray-700 truncate">{t.name}</span>
                      </button>
                      <button onClick={() => handleDeleteSaved(t.name)}
                        className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Custom theme builder */}
            <div className="border-t border-gray-100 pt-3">
              <div onClick={() => setShowCustom(s => !s)}
                className="w-full flex items-center justify-between p-2.5 rounded-xl border-2 transition-all cursor-pointer"
                style={{ borderColor: customActive ? "#951E3A" : "#e5e7eb" }}>
                <span className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: customPrimary }} />
                    <div className="w-4 h-4 rounded-full border border-gray-200" style={{ background: customSecondary }} />
                  </div>
                  <span className="text-xs font-bold text-gray-700">Custom</span>
                </span>
                {customActive && (
                  <button onClick={(e) => { e.stopPropagation(); handleSelectTheme(currentTheme); }}
                    className="flex items-center gap-1 text-[10px] text-gray-400 hover:text-gray-600">
                    <RotateCcw className="w-3 h-3" /> Reset
                  </button>
                )}
              </div>

              {showCustom && (
                <div className="mt-3 space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="color" value={customPrimary} onChange={(e) => handleCustomColor("primary", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Primary</p>
                      <p className="text-[10px] text-gray-400">{customPrimary.toUpperCase()}</p>
                    </div>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="color" value={customSecondary} onChange={(e) => handleCustomColor("secondary", e.target.value)}
                      className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Secondary</p>
                      <p className="text-[10px] text-gray-400">{customSecondary.toUpperCase()}</p>
                    </div>
                  </label>
                  <div className="flex gap-1.5">
                    <input type="text" placeholder="Theme name..." value={themeName}
                      onChange={(e) => setThemeName(e.target.value)}
                      className="flex-1 h-9 rounded-lg border border-gray-200 px-2.5 text-xs"
                      onKeyDown={(e) => e.key === "Enter" && handleSaveTheme()} />
                    <button onClick={handleSaveTheme} disabled={!themeName.trim()}
                      className="flex items-center gap-1 px-3 h-9 rounded-lg bg-[#951E3A] text-white text-xs font-bold disabled:opacity-40 hover:bg-[#7a1830] transition-colors">
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