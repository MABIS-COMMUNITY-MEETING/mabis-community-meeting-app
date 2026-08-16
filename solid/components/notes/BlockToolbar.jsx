import { Index } from "solid-js";
import { Bold, Italic, Underline, Trash2, Check } from "lucide-solid";

const TYPES = [
  { t: "p", label: "TEXT" },
  { t: "h1", label: "H1" },
  { t: "h2", label: "H2" },
  { t: "ul", label: "•" },
  { t: "ol", label: "1." },
];

const BASE = "h-7 min-w-[28px] px-1.5 flex items-center justify-center text-[10px] tracking-[0.14em] transition-colors";

/* Tiny per-block toolbar. Buttons act on mousedown with preventDefault so the
   contentEditable block never loses focus mid-edit — 1:1 port of
   src/components/notes/BlockToolbar.jsx. */
export default function BlockToolbar(props) {
  const md = (fn) => (e) => { e.preventDefault(); fn(); };

  return (
    <div class="absolute -top-[38px] left-0 z-20 flex items-center gap-px bg-background border border-border shadow-sm">
      <Index each={TYPES}>
        {(option) => (
          <button
            type="button"
            title={option().label}
            onMouseDown={md(() => props.onType(option().t))}
            class={`${BASE} ${props.type === option().t ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}
          >
            {option().label}
          </button>
        )}
      </Index>
      <span class="w-px h-4 bg-border mx-1" />
      <button type="button" title="Bold" onMouseDown={md(() => props.onCmd("bold"))} class={`${BASE} text-foreground hover:bg-muted`}><Bold class="w-3.5 h-3.5" /></button>
      <button type="button" title="Italic" onMouseDown={md(() => props.onCmd("italic"))} class={`${BASE} text-foreground hover:bg-muted`}><Italic class="w-3.5 h-3.5" /></button>
      <button type="button" title="Underline" onMouseDown={md(() => props.onCmd("underline"))} class={`${BASE} text-foreground hover:bg-muted`}><Underline class="w-3.5 h-3.5" /></button>
      <span class="w-px h-4 bg-border mx-1" />
      <button type="button" title="Delete block" onMouseDown={md(() => props.onDelete())} class={`${BASE} text-destructive hover:bg-destructive hover:text-destructive-foreground`}><Trash2 class="w-3.5 h-3.5" /></button>
      <button type="button" title="Done" onMouseDown={md(() => props.onDone())} class={`${BASE} bg-primary text-primary-foreground`}><Check class="w-3.5 h-3.5" /></button>
    </div>
  );
}
