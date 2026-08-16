import { createSignal, onMount, Show } from "solid-js";
import { useQuery } from "@tanstack/solid-query";
import { base44 } from "@/api/base44Client";
import { Cake, X } from "lucide-solid";
import { format } from "date-fns";

/** Today's birthdays — 1:1 port of src/components/BirthdayBanner.jsx. */
export default function BirthdayBanner() {
  const [dismissed, setDismissed] = createSignal(false);
  const todayKey = `birthday_dismissed_${new Date().toDateString()}`;

  onMount(() => {
    try {
      if (localStorage.getItem(todayKey)) setDismissed(true);
    } catch { /* private mode */ }
  });

  const birthdaysQuery = useQuery(() => ({
    queryKey: ["birthdays"],
    queryFn: () => base44.entities.Birthday.list("name", 200),
  }));

  const today = new Date();
  const mm = format(today, "MM");
  const dd = format(today, "dd");

  const todayBirthdays = () => (birthdaysQuery.data || []).filter((b) => {
    if (!b.date) return false;
    const parts = b.date.split("-");
    return parts[1] === mm && parts[2] === dd;
  });

  const handleDismiss = () => {
    try {
      localStorage.setItem(todayKey, "true");
    } catch { /* private mode */ }
    setDismissed(true);
  };

  return (
    <Show when={!dismissed() && todayBirthdays().length > 0}>
      <aside class="dropdown-pop birthday-notice" aria-label="Birthday notice">
        <div class="birthday-notice__mark" aria-hidden>
          <Cake class="h-5 w-5" />
        </div>
        <div class="min-w-0">
          <p class="tech-label mb-1 text-muted-foreground">
            Birthday / {format(today, "dd.MM")}
          </p>
          <p class="font-display text-lg font-medium leading-tight tracking-[-0.03em]">
            Happy birthday
          </p>
          <p class="mt-1 truncate text-sm text-muted-foreground">
            {todayBirthdays().map((b) => b.name).join(", ")}
          </p>
        </div>
        <button
          type="button"
          onClick={handleDismiss}
          class="birthday-notice__close"
          aria-label="Dismiss birthday notice"
        >
          <X class="h-4 w-4" />
        </button>
      </aside>
    </Show>
  );
}
