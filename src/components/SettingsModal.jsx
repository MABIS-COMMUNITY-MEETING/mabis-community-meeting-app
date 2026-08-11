import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Settings, X, Lock, User, LogOut, Check, Volume2, VolumeX } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { isSoundEnabled, setSoundEnabled } from "@/lib/sound";
import ControllerSettings from "@/components/ControllerSettings";

export default function SettingsModal({ open, onClose, isAdmin }) {
  const [currentCode, setCurrentCode] = useState("");
  const [newCode, setNewCode] = useState("");
  const [codeSaved, setCodeSaved] = useState(false);
  const [codeError, setCodeError] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());

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
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto">
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

              {/* Controller */}
              <ControllerSettings />

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