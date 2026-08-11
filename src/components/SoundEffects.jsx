import { useEffect } from "react";
import { playClick, playType } from "@/lib/sound";

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
    document.addEventListener("click", clickHandler, true);
    document.addEventListener("input", inputHandler, true);
    return () => {
      document.removeEventListener("click", clickHandler, true);
      document.removeEventListener("input", inputHandler, true);
    };
  }, []);
  return null;
}