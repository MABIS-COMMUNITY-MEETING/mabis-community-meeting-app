import { createSignal, createEffect, on, Show } from "solid-js";
import { useQuery, useMutation, useQueryClient } from "@tanstack/solid-query";
import { CalendarClock, Save, Link2, Pencil } from "lucide-solid";
import { base44 } from "@/api/base44Client";
import { Button, Input, EmptyState } from "~/components/ui";
import { JapaneseText } from "~/components/primitives";

const SETTING_KEY = "schedule_url";

/** Turn a Google Sheets share link into an embeddable preview URL. */
function toEmbedUrl(url) {
  if (!url) return "";
  const m = url.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (m) return `https://docs.google.com/spreadsheets/d/${m[1]}/preview`;
  return url;
}

/*
 * ScheduleWidget — Solid port of src/components/ScheduleWidget.jsx.
 *
 * Markup, classes and behaviour are 1:1. Two deliberate additions:
 *
 *   · the iframe is loading="lazy" — it is the single heaviest thing on Home
 *     (a full Google Sheets document), and inside a content-visibility
 *     section it would otherwise still be fetched and rendered off-screen.
 *   · Japanese companions on the visible strings, per the project rule that
 *     new UI copy ships with its translation.
 */
export default function ScheduleWidget(props) {
  const queryClient = useQueryClient();
  const [link, setLink] = createSignal("");
  const [editing, setEditing] = createSignal(false);

  const settings = useQuery(() => ({
    queryKey: ["app_settings", SETTING_KEY],
    queryFn: () => base44.entities.AppSetting.filter({ key: SETTING_KEY }),
  }));

  const current = () => settings.data?.[0];
  const savedUrl = () => current()?.value || "";
  const embedUrl = () => toEmbedUrl(savedUrl());

  createEffect(on([editing, savedUrl], ([isEditing, url]) => {
    if (isEditing) setLink(url);
  }));

  const save = useMutation(() => ({
    mutationFn: async (url) => {
      const c = current();
      if (c) await base44.entities.AppSetting.update(c.id, { value: url });
      else await base44.entities.AppSetting.create({ key: SETTING_KEY, value: url });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings", SETTING_KEY] });
      setEditing(false);
    },
  }));

  const remove = useMutation(() => ({
    mutationFn: () => base44.entities.AppSetting.delete(current().id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["app_settings", SETTING_KEY] });
      setEditing(false);
    },
  }));

  return (
    <div class="mabis-widget bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
      <div class="mabis-widget-header bg-primary px-4 py-4 flex flex-col items-start gap-3 sm:px-6 sm:flex-row sm:items-center">
        <CalendarClock class="w-5 h-5 text-primary-foreground" />
        <div class="flex-1">
          <h2 class="mabis-widget-title font-display font-bold text-primary-foreground text-xl">Schedule</h2>
          <JapaneseText
            ja="毎週の時間割り"
            class="block text-primary-foreground-muted text-xs mt-0.5"
            japaneseClass="block mt-0.5 text-[0.9em]"
          >
            Weekly class timetable
          </JapaneseText>
        </div>
        <Show when={props.isAdmin && savedUrl() && !editing()}>
          <Button
            size="sm"
            variant="outline"
            class="border-primary-foreground/40 text-primary-foreground bg-card/10 hover:bg-card/20 text-xs gap-1"
            onClick={() => setEditing(true)}
          >
            <Pencil class="w-3.5 h-3.5" />
            <JapaneseText ja="リンクを変更" layout="inline" japaneseClass="ml-1 inline text-[0.85em]">Change Link</JapaneseText>
          </Button>
        </Show>
      </div>

      <div class="mabis-widget-body p-4 space-y-4 sm:p-5">
        <Show
          when={!editing()}
          fallback={
            <div class="space-y-3">
              <p class="text-sm text-muted-foreground flex items-center gap-1.5">
                <Link2 class="w-4 h-4 text-primary" />
                Paste the link to your Google Sheets schedule (share it so “anyone with the link” can view).
              </p>
              <Input
                value={link()}
                onInput={(e) => setLink(e.currentTarget.value)}
                placeholder="https://docs.google.com/spreadsheets/d/..."
                class="rounded-lg"
              />
              <div class="grid grid-cols-2 gap-2 sm:flex">
                <Button
                  onClick={() => save.mutate(link().trim())}
                  disabled={!link().trim() || save.isPending}
                  class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg gap-1.5"
                >
                  <Save class="w-4 h-4" /> {save.isPending ? "Saving..." : "Save"}
                </Button>
                <Button variant="outline" onClick={() => setEditing(false)} class="rounded-lg">Cancel</Button>
                <Show when={savedUrl()}>
                  <Button
                    variant="ghost"
                    onClick={() => remove.mutate()}
                    disabled={remove.isPending}
                    class="col-span-2 rounded-lg text-destructive hover:bg-destructive/10 sm:ml-auto"
                  >
                    Remove Link
                  </Button>
                </Show>
              </div>
            </div>
          }
        >
          <Show
            when={embedUrl()}
            fallback={
              <EmptyState icon={<CalendarClock class="w-7 h-7 text-primary" />}>
                <Show
                  when={props.isAdmin}
                  fallback={
                    <JapaneseText ja="まだ時間割りが登録されていません。" class="block text-sm text-muted-foreground" japaneseClass="mt-1 block text-[0.9em]">
                      No schedule has been linked yet.
                    </JapaneseText>
                  }
                >
                  <JapaneseText ja="まだ時間割りが登録されていません" class="block text-sm font-semibold text-foreground" japaneseClass="mt-1 block text-[0.9em]">
                    No schedule linked yet
                  </JapaneseText>
                  <Button onClick={() => setEditing(true)} class="bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg gap-1.5">
                    <Link2 class="w-4 h-4" /> Add Spreadsheet Link
                  </Button>
                </Show>
              </EmptyState>
            }
          >
            <div class="rounded-xl overflow-hidden border border-border">
              {/* lazy: a full Sheets document is the heaviest asset on Home,
                  and without this it would load even while off-screen. */}
              <iframe
                src={embedUrl()}
                title="Weekly Schedule"
                loading="lazy"
                class="h-[70dvh] w-full sm:h-[600px]"
              />
            </div>
          </Show>
        </Show>
      </div>
    </div>
  );
}
