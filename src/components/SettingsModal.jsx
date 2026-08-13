import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Lock, User, LogOut, Check, Volume2, VolumeX, Accessibility, Type, Search } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import { animationsDisabled, setAnimationsDisabled } from "@/lib/motion-preference";
import { FONTS, FONT_LIBRARIES, FONT_PREVIEW_TEXT, applyFont, getStoredFont } from "@/lib/themes";

export default function SettingsModal({ open, onClose, isAdmin }) {
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [codeSaved, setCodeSaved] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [animationsOff, setAnimationsOff] = useState(animationsDisabled());
  const [currentFont, setCurrentFont] = useState(getStoredFont());
  const [fontAvailability, setFontAvailability] = useState({});
  const [fontSearch, setFontSearch] = useState("");
  const [fontSource, setFontSource] = useState("featured");
  const [fontLimit, setFontLimit] = useState(18);

  useEffect(() => {
    if (!open) return;
    setCurrentFont(getStoredFont());
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

  const filteredFonts = useMemo(() => {
    const query = fontSearch.trim().toLowerCase();
    return FONTS.filter((font) => {
      const matchesSource = fontSource === "all"
        || (fontSource === "featured" && font.featured)
        || (fontSource === "by-womxn" && font.source === "Libre Fonts by Womxn");
      const matchesSearch = !query || `${font.name} ${font.detail} ${font.source}`.toLowerCase().includes(query);
      return matchesSource && matchesSearch;
    });
  }, [fontSearch, fontSource]);

  const visibleFonts = filteredFonts.slice(0, fontLimit);

  const handleFontSelect = (key) => {
    localStorage.setItem("mabis-font-picker-version", "2");
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
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          onClick={onClose}>
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-y-auto">
            <div className="bg-[#951E3A] px-6 py-4 flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2.5">
                <Settings className="w-5 h-5 text-white" />
                <h2 className="font-display font-bold text-white text-xl">Settings</h2>
              </div>
              <button onClick={onClose} className="text-white/70 hover:text-white p-1 rounded-lg hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Security — admin/editor only */}
              {isAdmin && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Lock className="w-4 h-4 text-[#951E3A]" />
                    <h3 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">Unlock Code</h3>
                  </div>
                  <p className="text-xs text-gray-400 mb-3">Change the password used to unlock admin actions (meeting mode, etc.).</p>
                  <input type="password" value={currentCode} onChange={(e) => { setCurrentCode(e.target.value); setCodeError(false); }} placeholder="Current code..."
                    className={`w-full h-9 rounded-lg border-2 px-3 text-sm font-semibold tracking-widest outline-none mb-2 ${codeError ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#951E3A]/40"}`} />
                  {codeError && <p className="text-xs text-red-500 font-semibold mb-2">Current code is incorrect.</p>}
                  <input type="text" value={newCode} onChange={(e) => setNewCode(e.target.value)} placeholder="Enter new code..."
                    className="w-full h-9 rounded-lg border border-gray-200 px-3 text-sm font-semibold tracking-widest outline-none focus:border-[#951E3A]/40 mb-2" />
                  <button onClick={handleSaveCode}
                    className="w-full h-10 rounded-lg bg-[#951E3A] text-white text-sm font-bold hover:bg-[#7a1830] transition-colors flex items-center justify-center">
                    {codeSaved ? <Check className="w-4 h-4" /> : "Save"}
                  </button>
                  {codeSaved && <p className="text-xs text-green-600 font-semibold mt-2">Code updated!</p>}
                </div>
              )}

              {/* Typography */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Type className="w-4 h-4 text-[#951E3A]" />
                  <h3 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">UI Font</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">
                  Choose the typeface used across the interface. Japanese, Chinese and Thai automatically fall back to the embedded multilingual face when needed.
                </p>
                <div className="space-y-2.5">
                  {FONTS.map((font) => {
                    const selected = currentFont === font.key;
                    const available = fontAvailability[font.key];
                    return (
                      <button
                        key={font.key}
                        type="button"
                        onClick={() => handleFontSelect(font.key)}
                        aria-pressed={selected}
                        className={`w-full text-left rounded-xl border-2 p-3.5 transition-colors ${selected ? "border-[#951E3A] bg-[#951E3A]/5" : "border-gray-200 hover:border-[#951E3A]/30"}`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2.5">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-bold text-gray-800">{font.name}</span>
                              {font.key === "transgender-grotesk" && (
                                <span className="rounded-full bg-[#951E3A] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white">Default</span>
                              )}
                            </div>
                            <p className="text-[10px] leading-4 text-gray-400 mt-0.5">{font.detail}</p>
                          </div>
                          <div className="shrink-0 flex items-center gap-1.5">
                            <span className={`h-1.5 w-1.5 rounded-full ${available === true ? "bg-green-500" : available === false ? "bg-amber-400" : "bg-gray-300"}`} />
                            <span className="text-[9px] uppercase tracking-wider text-gray-400">
                              {font.localOnly
                                ? available === true ? "Installed" : available === false ? "Fallback active" : "Checking"
                                : "Embedded"}
                            </span>
                          </div>
                        </div>
                        <div
                          className="rounded-lg border border-gray-200 bg-white px-3 py-3 text-[17px] leading-snug text-gray-900 break-words"
                          style={{ fontFamily: font.body }}
                        >
                          {FONT_PREVIEW_TEXT}
                        </div>
                        {font.localOnly && available === false && (
                          <p className="mt-2 text-[10px] leading-4 text-amber-600">
                            Install your licensed copy on this device to render this face. Until then, UnifontEX is used safely.
                          </p>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  {soundOn ? <Volume2 className="w-4 h-4 text-[#951E3A]" /> : <VolumeX className="w-4 h-4 text-gray-400" />}
                  <h3 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">Sound Effects</h3>
                </div>
                <button onClick={() => { const v = !soundOn; setSoundOn(v); setSoundEnabled(v); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-colors ${soundOn ? "border-[#951E3A]/40 bg-[#951E3A]/5" : "border-gray-200"}`}>
                  <span className="text-sm font-semibold text-gray-700">{soundOn ? "On" : "Off"}</span>
                  <span className={`relative w-10 h-6 rounded-full transition-colors ${soundOn ? "bg-[#951E3A]" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${soundOn ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
              </div>

              {/* Motion */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Accessibility className="w-4 h-4 text-[#951E3A]" />
                  <h3 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">Animations</h3>
                </div>
                <p className="text-xs text-gray-400 mb-3">Stops all motion across the app. The custom cursor stays.</p>
                <button
                  onClick={() => { const value = !animationsOff; setAnimationsOff(value); setAnimationsDisabled(value); }}
                  className={`w-full flex items-center justify-between px-4 py-2.5 rounded-lg border-2 transition-colors ${animationsOff ? "border-[#951E3A]/40 bg-[#951E3A]/5" : "border-gray-200"}`}
                  aria-pressed={animationsOff}
                >
                  <span className="text-sm font-semibold text-gray-700">{animationsOff ? "Disabled" : "Enabled"}</span>
                  <span className={`relative w-10 h-6 rounded-full transition-colors ${animationsOff ? "bg-[#951E3A]" : "bg-gray-300"}`}>
                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${animationsOff ? "left-[18px]" : "left-0.5"}`} />
                  </span>
                </button>
              </div>

              {/* Account */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User className="w-4 h-4 text-[#951E3A]" />
                  <h3 className="font-display font-bold text-gray-800 text-sm uppercase tracking-wide">Account</h3>
                </div>
                <div className="space-y-2">
                  <button onClick={() => base44.auth.logout()}
                    className="w-full flex items-center gap-2 text-left text-sm font-bold text-white bg-[#951E3A] px-3 py-2.5 rounded-lg hover:bg-[#7a1830] transition-colors">
                    <LogOut className="w-4 h-4" /> Sign Out
                  </button>
                </div>
              </div>

              <p className="text-center text-xs text-gray-300 pt-2">Settings are stored on this device.</p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>, document.body
  );
}