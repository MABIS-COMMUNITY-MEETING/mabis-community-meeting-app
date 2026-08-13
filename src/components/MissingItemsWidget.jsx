import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Plus, Trash2, CheckCircle2, Loader2, X, Image as ImageIcon, PackageSearch, Maximize2, History } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const MABIS_LOGO = "/images/mabis-logo-128.webp";

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return ""; }
}

export default function MissingItemsWidget({ members }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [showFound, setShowFound] = useState(false);
  const [itemName, setItemName] = useState("");
  const [colors, setColors] = useState("");
  const [lastSeen, setLastSeen] = useState("");
  const [dateLost, setDateLost] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const queryClient = useQueryClient();

  const { data: activeItems = [], isLoading: activeLoading } = useQuery({
    queryKey: ["missing-items", "active"],
    queryFn: () => base44.entities.MissingItem.filter({ found: { $ne: true } }),
  });
  const { data: foundItems = [], isLoading: foundLoading } = useQuery({
    queryKey: ["missing-items", "found"],
    queryFn: () => base44.entities.MissingItem.filter({ found: true }),
    enabled: showFound,
  });
  const isLoading = activeLoading || (showFound && foundLoading);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.MissingItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["missing-items"] });
      setItemName(""); setColors(""); setLastSeen(""); setDateLost(""); setImageUrl(""); setShowForm(false);
    },
  });

  const foundMutation = useMutation({
    mutationFn: (id) => base44.entities.MissingItem.update(id, { found: true }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missing-items"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.MissingItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["missing-items"] }),
  });

  const handleFileUpload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setImageUrl(file_url);
    } catch (e) { /* ignore */ }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!itemName.trim()) return;
    createMutation.mutate({
      item_name: itemName.trim(),
      colors: colors.trim(),
      last_seen: lastSeen.trim(),
      date_lost: dateLost,
      reported_by_name: user?.full_name || "Unknown",
      image_url: imageUrl,
    });
  };

  const renderAddForm = () => (
    <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
      <Input placeholder="Item name (e.g. Water bottle)..." value={itemName}
        onChange={(e) => setItemName(e.target.value)} className="rounded-lg" />
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <Input placeholder="Colors (e.g. Blue, red cap)..." value={colors}
          onChange={(e) => setColors(e.target.value)} className="rounded-lg" />
        <Input list="missing-locations" placeholder="Last seen (e.g. MPR, Lounge)..." value={lastSeen}
          onChange={(e) => setLastSeen(e.target.value)} className="rounded-lg" />
      </div>
      <datalist id="missing-locations">
        <option value="MPR" />
        <option value="Forum" />
        <option value="Ms. Claudia's Office" />
        <option value="Lounge" />
        <option value="Maths Room" />
        <option value="Hallway" />
        <option value="Science Room" />
        <option value="Teachers Room" />
      </datalist>
      <Input type="date" value={dateLost} onChange={(e) => setDateLost(e.target.value)} className="rounded-lg" />
      <div className="flex flex-wrap gap-2">
        <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600">
          <ImageIcon className="w-3.5 h-3.5" />
          {imageUrl ? "Photo ✓" : "Add Photo"}
          <input type="file" accept="image/*" className="hidden"
            onChange={(e) => handleFileUpload(e.target.files[0])} />
        </label>
        {uploading && <Loader2 className="w-4 h-4 animate-spin text-[#951E3A] self-center" />}
      </div>
      {imageUrl && (
        <div className="relative">
          <img src={imageUrl} alt="preview" className="rounded-lg max-h-40 object-cover w-full" />
          <button onClick={() => setImageUrl("")} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}
      <Button onClick={handleSubmit} disabled={!itemName.trim() || createMutation.isPending}
        className="bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-lg w-full">
        {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
        Add to Missing Items
      </Button>
    </div>
  );

  const renderItemCard = (item, isActive) => (
    <motion.div key={item.id} layout
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
      className={`border rounded-xl overflow-hidden hover:shadow-md transition-shadow group ${isActive ? "border-amber-200" : "border-green-200"}`}>
      {item.image_url && (
        <img src={item.image_url} alt={item.item_name} className="w-full max-h-56 object-cover" />
      )}
      <div className="p-4">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-white" style={{ border: "2px solid hsl(var(--primary))" }}>
            <img src={MABIS_LOGO} alt="" className="w-full h-full object-contain p-0.5" />
          </div>
          <span className="text-xs font-bold text-gray-700">{item.reported_by_name}</span>
          <span className="text-[10px] text-gray-400 ml-auto">{formatDate(item.created_date)}</span>
          {isActive && (
            <button onClick={() => foundMutation.mutate(item.id)}
              className="p-1 rounded text-green-500 hover:text-green-600 hover:bg-green-50 transition-colors" title="Mark found">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => deleteMutation.mutate(item.id)}
            className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
        <h3 className={`font-display font-bold text-base mb-1 ${isActive ? "text-gray-800" : "text-gray-500 line-through"}`}>
          {item.item_name}
        </h3>
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
          {item.colors && (
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-[10px]">{item.colors}</span>
          )}
          {item.last_seen && <span>Last seen: {item.last_seen}</span>}
          {item.date_lost && <span>Lost: {formatDate(item.date_lost)}</span>}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className={`mabis-widget bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${fullscreen ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div className="mabis-widget-header bg-[#951E3A] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between sticky top-0 z-10">
        <div className="min-w-0">
          <h2 className="mabis-widget-title font-display font-bold text-white text-xl flex items-center gap-2">
            <Search className="w-5 h-5" /> Missing Items
          </h2>
          <p className="text-white/60 text-xs mt-0.5">{activeItems.length} active · {foundItems.length} found</p>
        </div>
        <div className="mabis-widget-actions flex items-center flex-wrap gap-2 shrink-0">
          <Button size="sm" variant="outline"
            className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
            onClick={() => setShowForm(s => !s)}>
            <Plus className="w-3.5 h-3.5" /> {showForm ? "Cancel" : "Report"}
          </Button>
          <Button size="sm" variant="outline"
            className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
            onClick={() => setShowFound(s => !s)}>
            <History className="w-3.5 h-3.5" /> {showFound ? "Hide" : "Found"}
          </Button>
          {fullscreen ? (
            <Button size="sm" variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
              onClick={() => setFullscreen(false)}>
              <X className="w-3.5 h-3.5" /> Close
            </Button>
          ) : (
            <Button size="sm" variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
              onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>

      <div className="mabis-widget-body p-4 space-y-4 sm:p-5">
        {showForm && renderAddForm()}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#951E3A]" /></div>
        ) : activeItems.length === 0 && foundItems.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-8 text-gray-400">
            <PackageSearch className="w-10 h-10 opacity-40" />
            <p className="text-sm">No missing items reported</p>
          </div>
        ) : (
          <>
            {activeItems.length > 0 && (
              <div className="space-y-3">
                <AnimatePresence>
                  {activeItems.map(item => renderItemCard(item, true))}
                </AnimatePresence>
              </div>
            )}

            {foundItems.length > 0 && (
              <AnimatePresence>
                {showFound && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden border-t border-gray-100 pt-3 space-y-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-gray-500 mb-1">
                      <History className="w-3.5 h-3.5" /> Found / Archived ({foundItems.length})
                    </p>
                    {foundItems.length === 0
                      ? <p className="text-center text-gray-400 text-sm py-4">No items found yet</p>
                      : foundItems.map(item => renderItemCard(item, false))}
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </>
        )}
      </div>
    </div>
  );
}