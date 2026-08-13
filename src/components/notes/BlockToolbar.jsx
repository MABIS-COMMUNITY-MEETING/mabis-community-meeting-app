import React from "react";
import { Bold, Italic, Underline, Trash2, Check } from "lucide-react";

const TYPES = [
	{ t: "p", label: "TEXT" },
	{ t: "h1", label: "H1" },
	{ t: "h2", label: "H2" },
	{ t: "ul", label: "•" },
	{ t: "ol", label: "1." },
];

/* Tiny per-block toolbar. Buttons act on mousedown with preventDefault so the
   contentEditable block never loses focus mid-edit. */
export default function BlockToolbar({ type, onType, onCmd, onDelete, onDone }) {
	const md = (fn) => (e) => { e.preventDefault(); fn(); };
	const base = "h-7 min-w-[28px] px-1.5 flex items-center justify-center text-[10px] tracking-[0.14em] transition-colors";
	return (
		<div className="absolute -top-[38px] left-0 z-20 flex items-center gap-px bg-background border border-border shadow-sm">
			{TYPES.map((o) => (
				<button key={o.t} type="button" title={o.label} onMouseDown={md(() => onType(o.t))}
					className={`${base} ${type === o.t ? "bg-foreground text-background" : "text-foreground hover:bg-muted"}`}>
					{o.label}
				</button>
			))}
			<span className="w-px h-4 bg-border mx-1" />
			<button type="button" title="Bold" onMouseDown={md(() => onCmd("bold"))} className={`${base} text-foreground hover:bg-muted`}><Bold className="w-3.5 h-3.5" /></button>
			<button type="button" title="Italic" onMouseDown={md(() => onCmd("italic"))} className={`${base} text-foreground hover:bg-muted`}><Italic className="w-3.5 h-3.5" /></button>
			<button type="button" title="Underline" onMouseDown={md(() => onCmd("underline"))} className={`${base} text-foreground hover:bg-muted`}><Underline className="w-3.5 h-3.5" /></button>
			<span className="w-px h-4 bg-border mx-1" />
			<button type="button" title="Delete block" onMouseDown={md(onDelete)} className={`${base} text-destructive hover:bg-destructive hover:text-destructive-foreground`}><Trash2 className="w-3.5 h-3.5" /></button>
			<button type="button" title="Done" onMouseDown={md(onDone)} className={`${base} bg-primary text-primary-foreground`}><Check className="w-3.5 h-3.5" /></button>
		</div>
	);
}