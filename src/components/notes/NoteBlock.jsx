import React, { useEffect, useRef } from "react";
import { Trash2 } from "lucide-react";
import BlockToolbar from "./BlockToolbar";

const READ_CLASS = {
	p: "text-sm leading-relaxed text-foreground",
	h1: "font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight",
	h2: "font-display text-lg sm:text-xl font-semibold tracking-tight leading-snug",
	ul: "list-disc pl-5 text-sm leading-relaxed space-y-1",
	ol: "list-decimal pl-5 text-sm leading-relaxed space-y-1",
};

/* One block of the document. Read view by default; clicking it turns exactly
   this block editable in place — the rest of the document never re-renders. */
export default function NoteBlock({ block, editing, onStartEdit, onCommit, onSplit, onDelete, onType }) {
	const ref = useRef(null);

	useEffect(() => {
		if (!editing || !ref.current) return;
		const el = ref.current;
		el.innerHTML = block.html || ((block.type === "ul" || block.type === "ol") ? "<li><br></li>" : "<br>");
		el.focus();
		const range = document.createRange();
		range.selectNodeContents(el);
		range.collapse(false);
		const sel = window.getSelection();
		sel.removeAllRanges();
		sel.addRange(range);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [editing, block.type]);

	if (block.type === "img") {
		return (
			<div className="group relative my-3">
				<img src={block.src} alt="" className="max-w-full border border-border" />
				<button onClick={onDelete} title="Remove image"
					className="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-background/90 border border-border text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
					<Trash2 className="w-4 h-4" />
				</button>
			</div>
		);
	}

	const Tag = READ_CLASS[block.type] ? block.type : "p";

	if (!editing) {
		return (
			<div onClick={onStartEdit}
				className="group relative -mx-3 px-3 py-1.5 cursor-text border-l-2 border-transparent hover:border-primary/60 hover:bg-muted/40 transition-colors">
				<Tag className={READ_CLASS[Tag]} dangerouslySetInnerHTML={{ __html: block.html || "<br>" }} />
				<span className="tech-label absolute right-2 top-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">EDIT</span>
			</div>
		);
	}

	const onKeyDown = (e) => {
		if (e.key === "Escape") { e.preventDefault(); ref.current.blur(); }
		if (e.key === "Enter" && !e.shiftKey && Tag !== "ul" && Tag !== "ol") {
			e.preventDefault();
			onSplit(ref.current.innerHTML);
		}
	};

	return (
		<div className="relative -mx-3 px-3 py-1.5 border-l-2 border-primary bg-muted/30">
			<BlockToolbar
				type={block.type}
				onType={(t) => onType(t, ref.current.innerHTML)}
				onCmd={(cmd) => document.execCommand(cmd)}
				onDelete={onDelete}
				onDone={() => ref.current.blur()}
			/>
			<Tag
				ref={ref}
				contentEditable
				suppressContentEditableWarning
				onBlur={() => onCommit(ref.current.innerHTML)}
				onKeyDown={onKeyDown}
				className={`${READ_CLASS[Tag]} outline-none min-h-[1.5em]`}
			/>
		</div>
	);
}