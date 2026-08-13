import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Heart, X, Star, Send, Loader2, ImagePlus, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";

export default function FeedbackWidget({ defaultOpen = false }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(defaultOpen);
  const [tab, setTab] = useState("feedback");
  const [rating, setRating] = useState(8);
  const [message, setMessage] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef(null);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setImageUrl(file_url);
    setUploading(false);
    e.target.value = "";
  };

  const handleSubmit = async () => {
    if (!message.trim()) return;
    setSubmitting(true);
    await base44.entities.Feedback.create({
      type: tab,
      rating: tab === "feedback" ? rating : null,
      message: message.trim(),
      image_url: imageUrl || undefined,
      submitted_by_name: user?.full_name || "Anonymous",
      submitted_by_email: user?.email || "",
      status: "new",
    });
    setSubmitting(false);
    setSubmitted(true);
    setMessage("");
    setImageUrl("");
    setRating(8);
    setTimeout(() => { setSubmitted(false); setOpen(false); }, 2000);
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(!open)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        className={`mobile-fab mobile-fab-left fixed bottom-5 left-5 z-[60] w-14 h-14 rounded-full shadow-xl flex items-center justify-center text-white border-2 border-white ${open ? "mobile-fab-open" : ""}`}
        style={{ background: "hsl(var(--primary))" }}
        title="Feedback & Bug Reports"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span key="heart" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} transition={{ duration: 0.15 }}>
              <Heart className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="mobile-feedback-panel fixed bottom-24 left-5 z-[60] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden"
          >
            <div className="px-4 py-3 flex items-center gap-2" style={{ background: "hsl(var(--primary))" }}>
              <Heart className="w-4 h-4 text-white" />
              <span className="flex-1 text-white font-bold text-sm">Feedback & Bug Reports</span>
              <button type="button" onClick={() => setOpen(false)} className="flex h-9 w-9 items-center justify-center text-white/75 hover:text-white" aria-label="Close feedback panel">
                <X className="h-4 w-4" />
              </button>
            </div>

            <AnimatePresence mode="wait">
              {submitted ? (
                <motion.div key="success"
                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                  className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
                    className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                    <Star className="w-6 h-6 text-green-600" />
                  </motion.div>
                  <p className="text-sm font-semibold text-gray-700">Thank you!</p>
                  <p className="text-xs text-gray-400 mt-1">Your {tab === "feedback" ? "feedback" : "bug report"} has been submitted.</p>
                </motion.div>
              ) : (
                <motion.div key="form"
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="p-4">
                  <div className="flex gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab("feedback")}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${tab === "feedback" ? "bg-white text-[#951E3A] shadow-sm" : "text-gray-500"}`}>
                      Feedback
                    </motion.button>
                    <motion.button whileTap={{ scale: 0.95 }} onClick={() => setTab("bug")}
                      className={`flex-1 py-1.5 rounded-md text-xs font-bold transition-colors ${tab === "bug" ? "bg-white text-[#951E3A] shadow-sm" : "text-gray-500"}`}>
                      Report Issue or Bug
                    </motion.button>
                  </div>

                  {tab === "feedback" && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mb-4 overflow-hidden">
                      <label className="text-xs font-bold text-gray-600 mb-2 block">
                        Satisfaction: <span className="text-[#951E3A]">{rating}/10</span>
                      </label>
                      <div className="flex gap-1">
                        {[1,2,3,4,5,6,7,8,9,10].map(r => (
                          <motion.button key={r} type="button" whileTap={{ scale: 0.85 }} onClick={() => setRating(r)}
                            className={`w-6 h-6 rounded text-[10px] font-bold border-2 transition-all
                              ${rating === r ? "bg-[#951E3A] text-white border-[#951E3A]" : "bg-white text-gray-400 border-gray-200 hover:border-[#951E3A]/30"}`}>
                            {r}
                          </motion.button>
                        ))}
                      </div>
                    </motion.div>
                  )}

                  <div className="mb-4">
                    <label className="text-xs font-bold text-gray-600 mb-2 block">
                      {tab === "feedback" ? "Your feedback" : "Describe the issue"}
                    </label>
                    <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4}
                      placeholder={tab === "feedback" ? "Tell us what you think..." : "What happened? What did you expect?"}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:border-[#951E3A]/50 resize-none" />
                    {imageUrl ? (
                      <div className="relative mt-2 rounded-lg overflow-hidden border border-gray-200">
                        <img src={imageUrl} alt="Attachment" className="w-full max-h-40 object-cover" />
                        <button onClick={() => setImageUrl("")}
                          className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading}
                        className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-[#951E3A] hover:bg-[#951E3A]/5 px-3 py-1.5 rounded-lg border border-[#951E3A]/30 transition-colors disabled:opacity-50">
                        {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />}
                        {uploading ? "Uploading..." : "Attach image"}
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
                  </div>

                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleSubmit} disabled={!message.trim() || submitting}
                    className="w-full bg-[#951E3A] hover:bg-[#7a1830] text-white font-bold text-sm py-2.5 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                    {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</> : <><Send className="w-3.5 h-3.5" /> Submit</>}
                  </motion.button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}