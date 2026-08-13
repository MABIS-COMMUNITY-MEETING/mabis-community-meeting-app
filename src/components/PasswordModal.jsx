import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, X } from "lucide-react";

const getAdminCode = () => localStorage.getItem("mabis_admin_code") || "10260";

export default function PasswordModal({ open, onClose, onSuccess, title = "Enter Admin Code" }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(false);

  const handleSubmit = () => {
    if (code === getAdminCode()) {
      setError(false);
      setCode("");
      onSuccess();
      onClose();
    } else {
      setError(true);
    }
  };

  const handleClose = () => {
    setCode("");
    setError(false);
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            data-native-cursor
            className="mobile-sheet-backdrop fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
            onClick={handleClose}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="mobile-sheet-panel w-full max-w-sm rounded-2xl bg-white p-4 shadow-2xl sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#951E3A]/10 flex items-center justify-center">
                    <Lock className="w-4 h-4 text-[#951E3A]" />
                  </div>
                  <h3 className="font-display font-bold text-gray-800 text-sm">{title}</h3>
                </div>
                <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <input
                type="password"
                autoFocus
                value={code}
                onChange={(e) => { setCode(e.target.value); setError(false); }}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                placeholder="Enter code..."
                className={`w-full h-11 rounded-xl border-2 px-4 text-sm font-semibold tracking-widest text-center outline-none transition-colors
                  ${error ? "border-red-400 bg-red-50" : "border-gray-200 focus:border-[#951E3A]/40"}`}
              />
              {error && <p className="text-red-500 text-xs font-semibold mt-2 text-center">Incorrect code, try again.</p>}
              <div className="flex flex-col gap-2 mt-4">
                <button onClick={handleClose}
                  className="w-full h-10 rounded-xl border border-gray-200 text-gray-600 text-sm font-bold hover:bg-gray-50 transition-colors">
                  Cancel
                </button>
                <button onClick={handleSubmit}
                  className="w-full h-10 rounded-xl bg-[#951E3A] text-white text-sm font-bold hover:bg-[#7a1830] transition-colors">
                  Confirm
                </button>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>, document.body
  );
}