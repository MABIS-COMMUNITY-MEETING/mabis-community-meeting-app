import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Plus, Heading1, List, ImagePlus, Loader2, FileText } from "lucide-react";
import NoteBlock from "./NoteBlock";
import { parseBlocks, serializeBlocks, convertHtml, uid } from "./block_html";

/*
 * Block-based document editor. The document is a stack of blocks; click any
 * block to edit exactly that block in place. Every change autosaves via
 * onChange — there is no separate save step.
 */
export default function BlockNotesEditor({ initialHtml = "", onChange, status = "" }) {
	const [blocks, setBlocks] = useState(() => parseBlocks(initialHtml));
	const [editingId, setEditingId] = useState(null);
	const [uploading, setUploading] = useState(false);
	const fileRef = useRef(null);

	const emit = (next) => { setBlocks(next); onChange?.(serializeBlocks(next)); };

	const isEmptyHtml = (html) => !html?.replace(/<br\s*\/?>/gi, "").replace(/<[^>]*>/g, "").trim();

	const commit = (id, html) => {
		let next = blocks.map((b) => (b.id === id ? { ...b, html } : b));
		if (isEmptyHtml(html)) next = next.filter((b) => b.id !== id);
		emit(next);
		setEditingId((cur) => (cur === id ? null : cur));
	};

	const split = (id, html) => {
		const fresh = { id: uid(), type: "p", html: "" };
		const next = [];
		for (const b of blocks) {
			if (b.id === id) {
				if (!isEmptyHtml(html)) next.push({ ...b, html });
				next.push(fresh);
			} else next.push(b);
		}
		emit(next);
		setEditingId(fresh.id);
	};

	const changeType = (id, type, currentHtml) => {
		emit(blocks.map((b) => (b.id === id ? { ...b, type, html: convertHtml(b.type, type, currentHtml) } : b)));
	};

	const removeBlock = (id) => {
		emit(blocks.filter((b) => b.id !== id));
		setEditingId((cur) => (cur === id ? null : cur));
	};

	const addBlock = (type) => {
		const fresh = { id: uid(), type, html: "" };
		setBlocks((prev) => [...prev, fresh]);
		setEditingId(fresh.id);
	};

	const addImage = async (e) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setUploading(true);
		try {
			const { file_url } = await base44.integrations.Core.UploadFile({ file });
			emit([...blocks, { id: uid(), type: "img", src: file_url }]);
		} finally {
			setUploading(false);
			e.target.value = "";
		}
	};

	const addBtn = "flex items-center gap-1.5 h-8 px-3 tech-label text-muted-foreground border border-border hover:border-foreground hover:text-foreground transition-colors";

	return (
		<div className="border border-border bg-card">
			{/* status strip */}
			<div className="flex items-center gap-2 px-4 h-9 border-b border-border">
				<FileText className="w-3.5 h-3.5 text-primary" />
				<span className="tech-label text-muted-foreground">DOCUMENT CLICK A BLOCK TO EDIT IT</span>
				<span className="ml-auto tech-label text-muted-foreground" aria-live="polite">{status}</span>
			</div>

			<div className="px-4 sm:px-6 pt-12 pb-4 space-y-1">
				{blocks.length === 0 && (
					<button onClick={() => addBlock("p")}
						className="w-full text-left px-3 py-6 text-sm text-muted-foreground border border-dashed border-border hover:border-foreground/50 transition-colors">
						Click to start writing…
					</button>
				)}
				{blocks.map((b) => (
					<NoteBlock
						key={b.id}
						block={b}
						editing={editingId === b.id}
						onStartEdit={() => setEditingId(b.id)}
						onCommit={(html) => commit(b.id, html)}
						onSplit={(html) => split(b.id, html)}
						onDelete={() => removeBlock(b.id)}
						onType={(t, html) => changeType(b.id, t, html)}
					/>
				))}
			</div>

			{/* add row */}
			<div className="flex flex-wrap items-center gap-2 px-4 sm:px-6 py-3 border-t border-border">
				<button onClick={() => addBlock("p")} className={addBtn}><Plus className="w-3.5 h-3.5" /> TEXT</button>
				<button onClick={() => addBlock("h1")} className={addBtn}><Heading1 className="w-3.5 h-3.5" /> HEADING</button>
				<button onClick={() => addBlock("ul")} className={addBtn}><List className="w-3.5 h-3.5" /> LIST</button>
				<button onClick={() => fileRef.current?.click()} disabled={uploading} className={addBtn}>
					{uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ImagePlus className="w-3.5 h-3.5" />} IMAGE
				</button>
				<input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={addImage} />
			</div>
		</div>
	);
}