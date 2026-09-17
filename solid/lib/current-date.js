import { createSignal, onMount, onCleanup } from "solid-js";

// Calendar state needs one wake at local midnight, not a polling loop. Focus
// also catches sleep/resume, a changed system clock, and background throttling.
export function createLocalDate() {
  const [today, setToday] = createSignal(new Date(), {
    equals: (a, b) => a.toDateString() === b.toDateString(),
  });
  onMount(() => {
    let timer;
    const refresh = () => {
      const now = new Date();
      setToday(now);
      clearTimeout(timer);
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      timer = setTimeout(refresh, midnight.getTime() - now.getTime() + 50);
    };
    const visible = () => { if (!document.hidden) refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", visible);
    onCleanup(() => {
      clearTimeout(timer);
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", visible);
    });
  });
  return today;
}
