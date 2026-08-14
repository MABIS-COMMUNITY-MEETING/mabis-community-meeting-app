import { useState, useRef, useEffect } from "react";
import { Highlighter } from "lucide-react";

const HIGHLIGHT_COLORS = [
  "#EACE54", "#bfdbfe", "#bbf7d0", "#fecaca",
  "#fde68a", "#e9d5ff", "#fed7aa", "#a7f3d0",
];

export default function HighlightPicker({ onHighlight }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button type="button" title="Highlight color"
        onMouseDown={(e) => { e.preventDefault(); setOpen(o => !o); }}
        className="h-7 min-w-[28px] px-1.5 rounded flex items-center justify-center text-sm transition-colors hover:bg-muted text-foreground">
        <Highlighter className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 bg-card rounded-lg shadow-lg border border-border p-2 flex gap-1 z-50">
          {HIGHLIGHT_COLORS.map(color => (
            <button key={color} type="button" title={color}
              onMouseDown={(e) => { e.preventDefault(); onHighlight(color); setOpen(false); }}
              className="w-5 h-5 rounded border border-border hover:scale-110 transition-transform"
              style={{ backgroundColor: color }} />
          ))}
        </div>
      )}
    </div>
  );
}