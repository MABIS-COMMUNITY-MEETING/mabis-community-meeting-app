import { useEffect } from "react";
import { playClick, playType, playHover } from "@/lib/sound";

/* things worth a tick when the pointer crosses them — controls plus the
   card-ish rows (members, jobs, list items) that read as pickable */
const HOVER_TARGETS =
  "button, a, [role='button'], [role='option'], [role='menuitem'], [role='tab'], summary, label, li, [data-cursor], input[type='checkbox'], input[type='radio'], select";

// Plays a mouse click for any button / link / toggle press app-wide,
// and a soft keypress "tock" while typing in text fields.
export default function SoundEffects() {
  useEffect(() => {
    const clickHandler = (e) => {
      const t = e.target.closest?.(
        "button, a, [role='button'], input[type='checkbox'], input[type='radio'], input[type='submit']"
      );
      if (t) playClick();
    };
    const inputHandler = (e) => {
      const t = e.target;
      if (!t) return;
      const tag = t.tagName;
      if (tag === "INPUT" && !["text", "search", "email", "password", "tel", "url", "number"].includes(t.type)) return;
      if (tag !== "INPUT" && tag !== "TEXTAREA" && !t.isContentEditable) return;
      playType();
    };
    // one tick per element entered — moving within the same element stays quiet
    let last = null;
    const hoverHandler = (e) => {
      const t = e.target.closest?.(HOVER_TARGETS) || null;
      if (t === last) return;
      last = t;
      if (t) playHover();
    };
    document.addEventListener("mouseover", hoverHandler, true);
    document.addEventListener("click", clickHandler, true);
    document.addEventListener("input", inputHandler, true);
    return () => {
      document.removeEventListener("mouseover", hoverHandler, true);
      document.removeEventListener("click", clickHandler, true);
      document.removeEventListener("input", inputHandler, true);
    };
  }, []);
  return null;
}