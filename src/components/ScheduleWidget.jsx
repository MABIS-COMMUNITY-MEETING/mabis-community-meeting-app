import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarClock, Save, Link2, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SETTING_KEY = "schedule_url";

// Turn a Google Sheets share link into an embeddable preview URL.
function toEmbedUrl(url) {
  if (!url) return "";
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/preview`;
  return url;
}

export default function ScheduleWidget({ isAdmin }) {
  const queryClient = useQueryClient();
  const [link, setLink] = useState("");
  const [editing, setEditing] = useState(false);

  const { data: settings = [] } = useQuery({
    queryKey: ["app_settings", SETTING_KEY],
    queryFn: () => base44.entities.AppSetting.filter({ key: SETTING_KEY }),
  });
  const current = settings[0];
  const savedUrl = current?.value || "";

  useEffect(() => { if (editing) setLink(savedUrl); }, [editing, savedUrl]);

  const saveMutation = useMutation({
    mutationFn: async (url) => {
      if (current) await base44.entities.AppSetting.update(current.id, { value: url });
      else await base44.entities.AppSetting.create({ key: SETTING_KEY, value: url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings", SETTING_KEY] });
      setEditing(false);
    },
  });

  const removeMutation = useMutation({
    mutationFn: () => base44.entities.AppSetting.delete(current.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings", SETTING_KEY] });
      setEditing(false);
    },
  });

  const embedUrl = toEmbedUrl(savedUrl);

  return (
    <div className="mabis-widget bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="mabis-widget-header bg-[#951E3A] px-4 py-4 flex flex-col items-start gap-3 sm:px-6 sm:flex-row sm:items-center">
        <CalendarClock className="w-5 h-5 text-white" />
        <div className="flex-1">
          <h2 className="mabis-widget-title font-display font-bold text-white text-xl">Schedule</h2>
          <p className="text-white/60 text-xs mt-0.5">Weekly class timetable</p>
        </div>
        {isAdmin && savedUrl && !editing && (
          <Button size="sm" variant="outline"
            className="border-white/40 text-white bg-white/10 hover:bg-white/20 text-xs gap-1"
            onClick={() => setEditing(true)}>
            <Pencil className="w-3.5 h-3.5" /> Change Link
          </Button>
        )}
      </div>

      <div className="mabis-widget-body p-4 space-y-4 sm:p-5">
        {editing ? (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 flex items-center gap-1.5">
              <Link2 className="w-4 h-4 text-[#951E3A]" />
              Paste the link to your Google Sheets schedule (share it so &ldquo;anyone with the link&rdquo; can view).
            </p>
            <Input value={link} onChange={(e) => setLink(e.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/..." className="rounded-lg" />
            <div className="grid grid-cols-2 gap-2 sm:flex">
              <Button onClick={() => saveMutation.mutate(link.trim())}
                disabled={!link.trim() || saveMutation.isPending}
                className="bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-lg gap-1.5">
                <Save className="w-4 h-4" /> {saveMutation.isPending ? "Saving..." : "Save"}
              </Button>
              <Button variant="outline" onClick={() => setEditing(false)} className="rounded-lg">Cancel</Button>
              {savedUrl && (
                <Button variant="ghost" onClick={() => removeMutation.mutate()}
                  disabled={removeMutation.isPending}
                  className="col-span-2 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 sm:ml-auto">
                  Remove Link
                </Button>
              )}
            </div>
          </div>
        ) : embedUrl ? (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            <iframe src={embedUrl} title="Weekly Schedule" className="h-[70dvh] w-full sm:h-[600px]" />
          </div>
        ) : (
          <div className="p-8 flex flex-col items-center justify-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#951E3A]/10 flex items-center justify-center">
              <CalendarClock className="w-7 h-7 text-[#951E3A]" />
            </div>
            {isAdmin ? (
              <>
                <p className="text-sm font-semibold text-gray-700">No schedule linked yet</p>
                <Button onClick={() => setEditing(true)}
                  className="bg-[#951E3A] hover:bg-[#7a1830] text-white rounded-lg gap-1.5">
                  <Link2 className="w-4 h-4" /> Add Spreadsheet Link
                </Button>
              </>
            ) : (
              <p className="text-sm text-gray-400">No schedule has been linked yet.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}