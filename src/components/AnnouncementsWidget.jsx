import React, { useState, useRef } from "react";
import JapaneseText from "@/components/JapaneseText";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, Pin, Loader2, Video, Image as ImageIcon, X, Megaphone, Maximize2, History } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DocsEditor from "@/components/DocsEditor";
import { format } from "date-fns";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/lib/AuthContext";

const MABIS_LOGO = "https://media.base44.com/images/public/6a2fcc3f4fec7200fed7a889/b6064da4f_MabisLogo-800x800.png/v1/fill/w_144,h_144/logo.webp";

export default function AnnouncementsWidget({ members, isAdmin }) {
  const [showForm, setShowForm] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const imgRef = useRef(null);
  const vidRef = useRef(null);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: announcements = [] } = useQuery({
    queryKey: ["announcements"],
    queryFn: () => base44.entities.Announcement.list("-created_date", 50)
  });

  const addMutation = useMutation({
    mutationFn: (data) => base44.entities.Announcement.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["announcements"] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Announcement.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] })
  });

  const pinMutation = useMutation({
    mutationFn: ({ id, pinned }) => base44.entities.Announcement.update(id, { pinned }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["announcements"] })
  });

  const resetForm = () => {
    setTitle("");setBody("");setAuthorName("");
    setImageFile(null);setVideoFile(null);setImagePreview(null);
    setShowForm(false);
  };

  const handleImageSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleVideoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFile(file);
  };

  const handleSubmit = async () => {
    if (!title.trim() || !authorName.trim()) return;
    setUploading(true);
    let image_url = "";
    let video_url = "";
    if (imageFile) {
      const res = await base44.integrations.Core.UploadFile({ file: imageFile });
      image_url = res.file_url;
    }
    if (videoFile) {
      const res = await base44.integrations.Core.UploadFile({ file: videoFile });
      video_url = res.file_url;
    }
    setUploading(false);
    const author = (members || []).find(m => m.name === authorName);
    addMutation.mutate({ title: title.trim(), body: body.trim(), author_name: authorName.trim(), image_url, video_url, pinned: false, avatar_url: user?.avatar_url || author?.avatar_url || "", avatar_color: author?.avatar_color || user?.avatar_color || "" });
  };

  const sorted = [...announcements].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.published_date || b.created_date) - new Date(a.published_date || a.created_date);
  });

  return (
    <div className={`mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden ${fullscreen ? "fixed inset-0 z-50 rounded-none overflow-y-auto" : ""}`}>
      <div className="mabis-widget-header bg-primary px-4 sm:px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Megaphone className="w-5 h-5 text-primary-foreground" />
          <div>
            <h2 className="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Announcements</h2>
            <JapaneseText as="p" ja={`${announcements.length}件のお知らせ`} className="text-primary-foreground-muted text-xs mt-0.5" japaneseClassName="block mt-0.5 text-[0.9em]">{announcements.length} announcement{announcements.length !== 1 ? "s" : ""}</JapaneseText>
          </div>
        </div>
        <div className="mabis-widget-actions flex items-center flex-wrap gap-2 shrink-0">
          <Link to="/history/announcements">
            <Button size="sm" variant="outline"
            className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1">
              <History className="w-3.5 h-3.5" /> History
            </Button>
          </Link>
          <Button size="sm" variant="outline"
          className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1"
          onClick={() => setShowForm((f) => !f)}>
            <Plus className="w-3.5 h-3.5" /> Post
          </Button>
          {fullscreen ?
          <Button size="sm" variant="outline"
          className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1"
          onClick={() => setFullscreen(false)}>
              <X className="w-3.5 h-3.5" /> Close
            </Button> :

          <Button size="sm" variant="outline"
          className="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1"
          onClick={() => setFullscreen(true)}>
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          }
        </div>
      </div>

      <div className="mabis-widget-body p-4 space-y-4 sm:p-5">
        {/* Post form */}
        <AnimatePresence>
          {showForm &&
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="border border-border rounded-xl p-4 bg-muted space-y-3 overflow-hidden sm:rounded-2xl sm:p-5">
            
              {/* Author */}
              <Select value={authorName} onValueChange={setAuthorName}>
                <SelectTrigger className="rounded-lg border-border bg-card">
                  <SelectValue placeholder="Your name..." />
                </SelectTrigger>
                <SelectContent>
                  {members?.map((m) =>
                <SelectItem key={m.id} value={m.name}>{m.name}</SelectItem>
                )}
                </SelectContent>
              </Select>

              <Input placeholder="Announcement title..." value={title} onChange={(e) => setTitle(e.target.value)}
            className="rounded-lg border-border bg-card font-semibold" />

              <DocsEditor initialHtml={body} onChange={setBody} placeholder="Write your announcement…" minHeight="120px" title="Announcement" />
            

              {/* Media preview */}
              {imagePreview &&
            <div className="relative inline-block">
                  <img src={imagePreview} alt="preview" className="h-28 rounded-lg object-cover border border-border" />
                  <button onClick={() => {setImageFile(null);setImagePreview(null);}}
              className="absolute -top-1.5 -right-1.5 bg-red-500 text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center">
                    <X className="w-3 h-3" />
                  </button>
                </div>
            }
              {videoFile &&
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                  <Video className="w-3.5 h-3.5 text-primary" />
                  {videoFile.name}
                  <button onClick={() => setVideoFile(null)} className="ml-auto text-muted-foreground hover:text-red-500">
                    <X className="w-3 h-3" />
                  </button>
                </div>
            }

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <button onClick={() => imgRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <ImageIcon className="w-3.5 h-3.5" /> Image
                </button>
                <button onClick={() => vidRef.current?.click()}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary px-2 py-1.5 rounded-lg border border-border hover:border-primary/30 transition-colors">
                  <Video className="w-3.5 h-3.5" /> Video
                </button>
                <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                <input ref={vidRef} type="file" accept="video/*" className="hidden" onChange={handleVideoSelect} />
                <div className="flex gap-2 sm:ml-auto">
                  <Button variant="outline" size="sm" onClick={resetForm} className="text-xs rounded-lg">Cancel</Button>
                  <Button size="sm" onClick={handleSubmit}
                disabled={!title.trim() || !authorName.trim() || uploading || addMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg text-xs">
                    {uploading || addMutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Post"}
                  </Button>
                </div>
              </div>
            </motion.div>
          }
        </AnimatePresence>

        {/* Announcements list */}
        {sorted.length === 0 &&
        <p className="text-center text-muted-foreground text-sm py-8">No announcements yet — be the first to post!</p>
        }

        <div className="space-y-3">
          <AnimatePresence>
            {sorted.map((ann) =>
            <motion.div key={ann.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className={`rounded-xl border p-4 group transition-all ${ann.pinned ? "bg-primary/8 border-primary/40" : "bg-card border-border"}`}>

                <div className="flex items-start gap-3">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center shrink-0 mt-0.5 bg-card" style={{ border: "2px solid hsl(var(--primary))" }}>
                    <img src={MABIS_LOGO} alt="" className="w-full h-full object-contain p-0.5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-0.5">
                      <span className="font-bold text-sm text-foreground">{ann.author_name}</span>
                      {ann.pinned &&
                    <span className="text-[10px] font-bold bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase tracking-wide">PINNED</span>
                    }
                      <span className="text-xs text-muted-foreground ml-auto">
                        {ann.published_date || ann.created_date ? format(new Date(ann.published_date || ann.created_date), "d MMM yyyy") : ""}
                      </span>
                    </div>
                    <p className="font-semibold text-foreground text-sm">{ann.title}</p>
                    {ann.body && <div className="theme-rich-text text-sm text-muted-foreground mt-1 leading-relaxed prose prose-sm max-w-none
                      [&_img]:max-w-full [&_img]:rounded-lg [&_img]:my-2
                      [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1
                      [&_li]:my-0.5 [&_h1]:text-base [&_h1]:font-bold [&_h2]:text-sm [&_h2]:font-semibold [&_p]:my-1
                      [&_a]:text-blue-600 [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: ann.body }} />}

                    {ann.image_url &&
                  <img src={ann.image_url} alt={ann.title}
                  className="mt-3 rounded-xl max-h-64 object-cover border border-border w-full" />
                  }
                    {ann.video_url &&
                  <video src={ann.video_url} controls className="mt-3 rounded-xl max-h-64 w-full border border-border" />
                  }
                  </div>

                  {isAdmin &&
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => pinMutation.mutate({ id: ann.id, pinned: !ann.pinned })}
                  className={`p-1.5 rounded-lg transition-colors ${ann.pinned ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-primary hover:bg-primary/10"}`}>
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => deleteMutation.mutate(ann.id)}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-red-400 hover:bg-red-50 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                }
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>);

}