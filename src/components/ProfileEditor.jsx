import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Upload, Palette, X, History } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

const AVATAR_COLORS = [
  "#951E3A", "#EACE54", "#4b5563", "#2563eb", "#dc2626", "#7c3aed", "#059669", "#ca8a04",
  "#0891b2", "#db2777", "#ea580c", "#1d4ed8", "#0f766e", "#9333ea", "#be123c", "#92400e",
];

const DEFAULT_URLS = [MABIS_LOGO];

export default function ProfileEditor({ open, onClose }) {
  const { user, updateUser } = useAuth();
  const [profileColor, setProfileColor] = useState(user?.avatar_color || "#951E3A");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const syncAvatarToMember = async (data) => {
    try {
      const matches = await base44.entities.Member.filter({ email: user?.email });
      if (matches.length > 0) await base44.entities.Member.update(matches[0].id, data);
    } catch (e) { /* ignore */ }
  };

  const saveAvatar = async (newUrl) => {
    const oldUrl = user?.avatar_url;
    const history = user?.avatar_history || [];
    let newHistory = [...history];
    if (oldUrl && !DEFAULT_URLS.includes(oldUrl)) {
      newHistory = [oldUrl, ...history].slice(0, 10);
    }
    await base44.auth.updateMe({ avatar_url: newUrl, avatar_history: newHistory });
    syncAvatarToMember({ avatar_url: newUrl });
    updateUser?.();
  };

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    await saveAvatar(file_url);
    setUploading(false);
    e.target.value = "";
  };

  const handleColorSave = async () => {
    await base44.auth.updateMe({ avatar_color: profileColor });
    syncAvatarToMember({ avatar_color: profileColor });
    updateUser?.();
  };

  const handleReset = async () => {
    await base44.auth.updateMe({ avatar_url: null, avatar_color: "#951E3A", avatar_history: [] });
    syncAvatarToMember({ avatar_url: null, avatar_color: "#951E3A" });
    updateUser?.();
    onClose();
  };

  const avatarHistory = user?.avatar_history || [];

  return (
    <AnimatePresence>
      {open && (
        <>
          <div className="fixed inset-0 z-[60] bg-ink/30" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="fixed inset-x-3 top-20 z-[61] max-h-[calc(100dvh-6rem)] w-auto overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl sm:inset-x-auto sm:right-6 sm:top-24 sm:max-h-[75vh] sm:w-80"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Palette className="w-4 h-4 text-[#951E3A]" />
                <p className="text-sm font-bold text-gray-700">Customize Profile Picture</p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Upload photo */}
            <motion.label
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 cursor-pointer mb-3 bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 border border-gray-200 transition-colors"
            >
              <Upload className="w-3.5 h-3.5 text-[#951E3A]" />
              <span className="text-xs font-semibold text-gray-600">
                {uploading ? "Uploading..." : "Upload Photo"}
              </span>
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} disabled={uploading} />
            </motion.label>

            {/* Default avatar — MABIS Logo */}
            <p className="text-[10px] text-gray-400 mb-2">Profile picture:</p>
            <div className="flex gap-2 mb-3">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                onClick={async () => { await base44.auth.updateMe({ avatar_url: null }); syncAvatarToMember({ avatar_url: null }); updateUser?.(); }}
                className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-transform bg-white flex items-center justify-center ${!user?.avatar_url ? "border-[#951E3A] scale-110" : "border-gray-200"}`}
                title="MABIS Logo"
              >
                <img src={MABIS_LOGO} alt="MABIS" className="w-full h-full object-contain p-1" />
              </motion.button>
            </div>

            {/* Avatar history */}
            {avatarHistory.length > 0 && (
              <div className="mb-3">
                <div className="flex items-center gap-1 mb-2">
                  <History className="w-3 h-3 text-gray-400" />
                  <p className="text-[10px] text-gray-400">Recent profile pictures ({avatarHistory.length}):</p>
                </div>
                <div className="flex gap-1.5 flex-wrap">
                  {avatarHistory.map((url, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => saveAvatar(url)}
                      className="w-8 h-8 rounded-full overflow-hidden border border-gray-200 hover:border-[#951E3A] transition-colors"
                    >
                      <img src={url} alt="" className="w-full h-full object-cover" />
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2">
              <button onClick={handleReset}
                className="flex-1 text-[10px] text-gray-400 hover:text-gray-600 underline text-center">
                Reset to default
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}