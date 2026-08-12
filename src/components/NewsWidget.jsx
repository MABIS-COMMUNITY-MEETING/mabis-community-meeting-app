import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Newspaper, Plus, Trash2, Loader2, X, Image as ImageIcon, Video, Maximize2, History } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import { displayName } from "@/lib/names";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DocsEditor from "@/components/DocsEditor";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png";

function formatDate(d) {
  try { return new Date(d).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return ""; }
}

export default function NewsWidget({ members, isAdmin, limit }) {
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const queryClient = useQueryClient();

  const { data: news = [], isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: () => base44.entities.NewsItem.list("-created_date", 100),
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.NewsItem.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news"] });
      setTitle(""); setBody(""); setImageUrl(""); setVideoUrl(""); setShowForm(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.NewsItem.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["news"] }),
  });

  const handleFileUpload = async (file, kind) => {
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (kind === "image") setImageUrl(file_url);
      else setVideoUrl(file_url);
    } catch (e) { /* ignore */ }
    setUploading(false);
  };

  const handleSubmit = () => {
    if (!title.trim() || !body.trim()) return;
    createMutation.mutate({
      title: title.trim(),
      body: body.trim(),
      image_url: imageUrl,
      video_url: videoUrl,
      author_name: user?.full_name || displayName(members.find(m => m.email === user?.email)) || "Unknown",
      author_email: user?.email || "",
    });
  };

  const displayNews = limit && !fullscreen ? news.slice(0, limit) : news;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${fullscreen ? "fixed inset-0 z-50 rounded-none" : ""}`}>
      <div className="bg-[#951E3A] px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display font-bold text-white text-xl flex items-center gap-2">
            <Newspaper className="w-5 h-5" /> News
          </h2>
          <p className="text-white/60 text-xs mt-0.5">{news.length} articles</p>
        </div>
        <div className="flex items-center flex-wrap gap-2 shrink-0">
            <Link to="/history/news">
              <Button size="sm" variant="outline"
                className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5">
                <History className="w-3.5 h-3.5" /> History
              </Button>
            </Link>
            <Button size="sm" variant="outline"
              className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1.5"
              onClick={() => setShowForm(s => !s)}>
              <Plus className="w-3.5 h-3.5" /> {showForm ? "Cancel" : "Add News"}
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

      <div className="p-5 space-y-4">
        {showForm && (
          <div className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <Input placeholder="News title..." value={title} onChange={(e) => setTitle(e.target.value)}
              className="rounded-lg" />
            <DocsEditor initialHtml={body} onChange={setBody} placeholder="Write the news…" minHeight="140px" title={title || "Untitled news"} />
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600">
                <ImageIcon className="w-3.5 h-3.5" />
                {imageUrl ? "Image ✓" : "Add Image"}
                <input type="file" accept="image/*" className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0], "image")} />
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-xs font-semibold text-gray-600">
                <Video className="w-3.5 h-3.5" />
                {videoUrl ? "Video ✓" : "Add Video"}
                <input type="file" accept="video/*" className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files[0], "video")} />
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
            <Button onClick={handleSubmit} disabled={!title.trim() || !body.trim() || createMutation.isPending}
              className="bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-lg w-full">
              {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Publish
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-[#951E3A]" /></div>
        ) : news.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No news yet</p>
        ) : (
          <>
          <div className="space-y-3">
            {displayNews.map((n) => (
              <motion.div key={n.id} layout
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow group">
                {n.image_url && (
                  <img src={n.image_url} alt={n.title} className="w-full max-h-56 object-cover" />
                )}
                {n.video_url && (
                  <video src={n.video_url} controls className="w-full max-h-56 object-cover bg-black" />
                )}
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-6 h-6 rounded-full overflow-hidden flex items-center justify-center shrink-0 bg-white" style={{ border: "2px solid hsl(var(--primary))" }}>
                      <img src={MABIS_LOGO} alt="" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <span className="text-xs font-bold text-gray-700">{n.author_name}</span>
                    <span className="text-[10px] text-gray-400 ml-auto">{formatDate(n.created_date)}</span>
                    {isAdmin && (
                      <button onClick={() => deleteMutation.mutate(n.id)}
                        className="p-1 rounded text-gray-300 hover:text-red-500 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h3 className="font-display font-bold text-gray-800 text-base mb-1">{n.title}</h3>
                  <div className="text-sm text-gray-600 leading-relaxed prose prose-sm max-w-none
                    [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
                    [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                    [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-1
                    [&_a]:text-blue-600 [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: n.body }} />
                </div>
              </motion.div>
            ))}
          </div>
          {limit && !fullscreen && news.length > limit && (
            <button onClick={() => setFullscreen(true)}
              className="w-full mt-3 py-2.5 rounded-xl border border-[#951E3A]/30 text-[#951E3A] hover:bg-[#951E3A]/5 text-sm font-semibold transition-colors">
              More News ({news.length - limit} more)
            </button>
          )}
          </>
        )}
      </div>
    </div>
  );
}