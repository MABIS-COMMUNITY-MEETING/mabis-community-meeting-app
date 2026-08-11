import React, { useRef, useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  ChevronDown, Plus, Minus, Highlighter, Link2, Image as ImageIcon, Loader2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  List, ListOrdered, Outdent, Indent, FileText, Eraser, ArrowUpDown, Copy,
} from "lucide-react";

// --- Quill format registration -------------------------------------------------
const SizeAttr = Quill.import("attributors/style/size");
SizeAttr.whitelist = null;
Quill.register(SizeAttr, true);

const FONTS = [
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Helvetica", value: "Helvetica, Arial, sans-serif" },
  { label: "Inter", value: "'Inter', sans-serif" },
  { label: "Space Grotesk", value: "'Space Grotesk', sans-serif" },
  { label: "Poppins", value: "'Poppins', sans-serif" },
  { label: "Montserrat", value: "'Montserrat', sans-serif" },
  { label: "Manrope", value: "'Manrope', sans-serif" },
  { label: "DM Sans", value: "'DM Sans', sans-serif" },
  { label: "Raleway", value: "'Raleway', sans-serif" },
  { label: "Nunito", value: "'Nunito', sans-serif" },
  { label: "Lato", value: "'Lato', sans-serif" },
  { label: "Alegreya", value: "'Alegreya', serif" },
  { label: "Georgia", value: "Georgia, serif" },
  { label: "Times New Roman", value: "'Times New Roman', serif" },
  { label: "Palatino", value: "'Palatino Linotype', serif" },
  { label: "Courier New", value: "'Courier New', monospace" },
  { label: "Lucida Console", value: "'Lucida Console', monospace" },
  { label: "Verdana", value: "Verdana, sans-serif" },
  { label: "Tahoma", value: "Tahoma, sans-serif" },
  { label: "Trebuchet MS", value: "'Trebuchet MS', sans-serif" },
  { label: "Comic Sans MS", value: "'Comic Sans MS', cursive" },
  { label: "Impact", value: "Impact, sans-serif" },
];

const FontAttr = Quill.import("attributors/style/font");
FontAttr.whitelist = FONTS.map(f => f.value);
Quill.register(FontAttr, true);

const Parchment = Quill.import("parchment");
const LineHeightAttr = new Parchment.Attributor.Style("lineheight", "line-height", {
  scope: Parchment.Scope.BLOCK,
  whitelist: ["1", "1.15", "1.5", "2"],
});
Quill.register(LineHeightAttr, true);

const RAINBOW = "linear-gradient(90deg,#ef4444,#f59e0b,#eab308,#22c55e,#3b82f6,#8b5cf6,#ec4899)";

const LINE_HEIGHTS = [
  { label: "1", v: "1" },
  { label: "1.15", v: "1.15" },
  { label: "1.5", v: "1.5" },
  { label: "2", v: "2" },
];

const SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];

function TBtn({ title, onClick, active, children }) {
  return (
    <button type="button" title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className={`h-8 min-w-[32px] px-2 rounded-md flex items-center justify-center text-sm transition-colors shrink-0
        ${active ? "bg-[#EBEBFA] text-[#4A3C78]" : "text-[#1F1F1F] hover:bg-gray-200/80"}`}>
      {children}
    </button>
  );
}
function TSep() { return <div className="w-px h-5 bg-gray-300/70 mx-1.5 shrink-0" />; }

function Dropdown({ trigger, children, width = "w-40" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen(v => !v); }}
        className="h-8 px-1.5 rounded-md flex items-center gap-1 text-sm text-[#1F1F1F] hover:bg-gray-200/80 transition-colors">
        {trigger}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onMouseDown={() => setOpen(false)} />
          <div className={`absolute top-9 left-0 ${width} max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg py-1 z-30`}>
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </>
      )}
    </div>
  );
}
function MenuItem({ label, onClick, style, active }) {
  return (
    <button type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      style={style}
      className={`w-full text-left px-3 py-1.5 text-xs hover:bg-gray-100 ${active ? "text-[#4A3C78] font-semibold" : "text-gray-700"}`}>
      {label}
    </button>
  );
}

function LinkPopover({ getQuill, onClose }) {
  const [url, setUrl] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    const quill = getQuill();
    if (quill) { const f = quill.getFormat(); if (typeof f.link === "string") setUrl(f.link); }
    ref.current?.focus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const apply = () => {
    const quill = getQuill();
    if (quill) {
      quill.focus();
      const v = url.trim();
      if (v) {
        let u = v;
        if (!/^(https?|mailto|tel):/i.test(u)) u = "https://" + u;
        quill.format("link", u);
      } else {
        quill.format("link", false);
      }
    }
    onClose();
  };
  const remove = () => {
    const quill = getQuill();
    if (quill) { quill.focus(); quill.format("link", false); }
    onClose();
  };
  return (
    <div className="absolute top-9 left-0 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 z-30 space-y-2">
      <input ref={ref} value={url} onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); apply(); } if (e.key === "Escape") { e.preventDefault(); onClose(); } }}
        placeholder="Paste a link (https://…)"
        className="w-full h-8 rounded-md border border-gray-200 px-2 text-xs focus:border-[#951E3A]/40 focus:outline-none" />
      <div className="flex gap-2">
        <button onMouseDown={(e) => { e.preventDefault(); apply(); }}
          className="flex-1 h-8 rounded-md bg-[#951E3A] text-white text-xs font-semibold hover:bg-[#7a1830]">Apply link</button>
        <button onMouseDown={(e) => { e.preventDefault(); remove(); }}
          className="px-3 h-8 rounded-md border border-gray-200 text-xs text-gray-600 hover:bg-gray-50">Remove</button>
      </div>
    </div>
  );
}

export default function DocsEditor({
  title = "Untitled document",
  onChange,
  initialHtml = "",
  minHeight = "180px",
  placeholder = "Start writing…",
  onSave,
  saving = false,
  saved = false,
}) {
  const quillRef = useRef(null);
  const imgInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [fontLabel, setFontLabel] = useState("Arial");
  const [sizeInput, setSizeInput] = useState("14");
  const [active, setActive] = useState({ bold: false, italic: false, underline: false, strike: false, h1: false, h2: false });
  const [painterArmed, setPainterArmed] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const copiedFormats = useRef(null);

  // Stable modules ref — react-quill re-inits (and wipes content) if this object identity changes.
  const modules = useMemo(() => ({ toolbar: false }), []);

  const q = () => quillRef.current?.getEditor();

  const syncActive = () => {
    const quill = q();
    if (!quill) return;
    try {
      const f = quill.getFormat();
      setActive({
        bold: !!f.bold, italic: !!f.italic, underline: !!f.underline, strike: !!f.strike,
        h1: f.header === 1, h2: f.header === 2,
      });
      if (f.size) { const n = parseInt(f.size, 10); if (!isNaN(n)) setSizeInput(String(n)); } else setSizeInput("14");
      if (f.font) { const found = FONTS.find(x => x.value === f.font); setFontLabel(found ? found.label : "Arial"); } else setFontLabel("Arial");
    } catch { /* ignore */ }
  };

  useEffect(() => {
    const quill = q();
    if (!quill) return;
    const handler = () => syncActive();
    quill.on("selection-change", handler);
    quill.on("text-change", handler);
    return () => { quill.off("selection-change", handler); quill.off("text-change", handler); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (content, delta, source, editor) => {
    const text = editor?.getText().trim();
    onChange?.(text ? content : "");
  };

  const apply = (name, value) => {
    const quill = q(); if (!quill) return;
    quill.focus(); quill.format(name, value); syncActive();
  };
  const toggleInline = (name) => {
    const quill = q(); if (!quill) return;
    const f = quill.getFormat(); quill.focus(); quill.format(name, !f[name]); syncActive();
  };
  const toggleHeader = (level) => {
    const quill = q(); if (!quill) return;
    const f = quill.getFormat(); quill.focus(); quill.format("header", f.header === level ? false : level); syncActive();
  };
  const toggleList = (type) => {
    const quill = q(); if (!quill) return;
    const f = quill.getFormat(); quill.focus(); quill.format("list", f.list === type ? false : type); syncActive();
  };
  const changeIndent = (delta) => {
    const quill = q(); if (!quill) return;
    const f = quill.getFormat(); const cur = f.indent || 0;
    quill.focus(); quill.format("indent", Math.max(0, cur + delta));
  };
  const applySize = (val) => {
    const n = parseInt(val, 10);
    if (isNaN(n) || n < 1) return;
    apply("size", n + "px");
  };
  const stepSize = (delta) => {
    const cur = parseInt(sizeInput, 10) || 14;
    const next = Math.max(1, cur + delta);
    setSizeInput(String(next)); applySize(next);
  };
  const setFont = (value, label) => { setFontLabel(label); apply("font", value); };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const quill = q();
      if (quill) {
        quill.focus();
        const range = quill.getSelection() || { index: quill.getLength() };
        quill.insertEmbed(range.index, "image", file_url);
        quill.setSelection(range.index + 1, 0);
      }
    } catch { /* ignore */ }
    setUploading(false);
    e.target.value = "";
  };

  const handlePainter = () => {
    const quill = q(); if (!quill) return;
    if (!painterArmed) {
      const range = quill.getSelection();
      if (range && range.length > 0) {
        const f = quill.getFormat(range);
        copiedFormats.current = {
          bold: f.bold || false, italic: f.italic || false, underline: f.underline || false,
          strike: f.strike || false, color: f.color || false, background: f.background || false,
          size: f.size || false, font: f.font || false,
        };
        setPainterArmed(true);
      }
    } else {
      quill.focus();
      if (copiedFormats.current) quill.format(copiedFormats.current);
      setPainterArmed(false); copiedFormats.current = null; syncActive();
    }
  };

  const handleKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") { e.preventDefault(); onSave?.(); }
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm docs-quill font-body">
      <div className="flex items-center px-3 h-10 bg-white border-b border-gray-100 gap-2">
        <FileText className="w-4 h-4 text-blue-500 shrink-0" />
        <span className="text-sm text-gray-600 truncate max-w-[180px]">{title || "Untitled document"}</span>
        {onSave && (
          <button onClick={onSave} disabled={saving}
            className="ml-auto flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-medium text-[#001d35] bg-[#c2e7ff] hover:bg-[#aed1f5] transition-colors disabled:opacity-60 whitespace-nowrap">
            {saving ? "Saving…" : saved ? "✓ Saved" : "Save"}
          </button>
        )}
      </div>

      {/* Canva-style pill toolbar */}
      <div className="px-2 py-2 bg-white border-b border-gray-100">
        <div className="inline-flex items-center gap-0.5 bg-[#F3F4F6] rounded-full px-1.5 py-1 overflow-x-auto max-w-full shadow-sm border border-gray-200/60">
          <TBtn title="Heading 1" active={active.h1} onClick={() => toggleHeader(1)}>
            <span className="font-bold text-[13px]">H1</span>
          </TBtn>
          <TBtn title="Heading 2" active={active.h2} onClick={() => toggleHeader(2)}>
            <span className="font-bold text-[13px]">H2</span>
          </TBtn>
          <TSep />

          <Dropdown trigger={<><span className="text-xs max-w-[110px] truncate">{fontLabel}</span><ChevronDown className="w-3 h-3" /></>} width="w-52">
            {(close) => FONTS.map(f => (
              <MenuItem key={f.label} label={f.label} style={{ fontFamily: f.value }}
                onClick={() => { setFont(f.value, f.label); close(); }} />
            ))}
          </Dropdown>
          <TSep />

          <div className="flex items-center gap-0.5 shrink-0">
            <TBtn title="Decrease font size" onClick={() => stepSize(-1)}><Minus className="w-3.5 h-3.5" /></TBtn>
            <Dropdown
              trigger={<><span className="text-xs w-7 text-center tabular-nums">{sizeInput}</span><ChevronDown className="w-3 h-3" /></>}
              width="w-16">
              {(close) => SIZE_PRESETS.map(s => (
                <button key={s} type="button"
                  onMouseDown={(e) => { e.preventDefault(); setSizeInput(String(s)); applySize(s); close(); }}
                  className={`w-full text-center px-3 py-1.5 text-xs tabular-nums hover:bg-gray-100 ${String(s) === sizeInput ? "text-[#4A3C78] font-semibold" : "text-gray-700"}`}>
                  {s}
                </button>
              ))}
            </Dropdown>
            <TBtn title="Increase font size" onClick={() => stepSize(1)}><Plus className="w-3.5 h-3.5" /></TBtn>
          </div>
          <TSep />

          <label title="Text color" className="relative h-8 min-w-[32px] px-2 rounded-md flex items-center justify-center cursor-pointer shrink-0 hover:bg-gray-200/80">
            <span className="font-bold text-sm text-[#1F1F1F] leading-none">A</span>
            <span className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-full" style={{ background: RAINBOW }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => apply("color", e.target.value)} />
          </label>
          <label title="Highlight color" className="relative h-8 min-w-[32px] px-2 rounded-md flex items-center justify-center cursor-pointer shrink-0 hover:bg-gray-200/80">
            <Highlighter className="w-4 h-4 text-[#1F1F1F]" />
            <span className="absolute bottom-1 left-1.5 right-1.5 h-1 rounded-full" style={{ background: RAINBOW }} />
            <input type="color" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => apply("background", e.target.value)} />
          </label>
          <TSep />

          <TBtn title="Bold (Ctrl+B)" active={active.bold} onClick={() => toggleInline("bold")}>
            <span className="font-bold text-[13px]">B</span>
          </TBtn>
          <TBtn title="Italic (Ctrl+I)" active={active.italic} onClick={() => toggleInline("italic")}>
            <span className="italic text-[13px] font-serif">I</span>
          </TBtn>
          <TBtn title="Underline (Ctrl+U)" active={active.underline} onClick={() => toggleInline("underline")}>
            <span className="underline text-[13px]">U</span>
          </TBtn>
          <TBtn title="Strikethrough" active={active.strike} onClick={() => toggleInline("strike")}>
            <span className="relative text-[13px] font-semibold">S<span className="absolute left-0 right-0 top-1/2 h-px bg-current rotate-[-8deg]" /></span>
          </TBtn>
          <TSep />

          <Dropdown trigger={<><AlignLeft className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></>} width="w-40">
            {(close) => [
              { label: "Align left", icon: <AlignLeft className="w-4 h-4" />, v: "left" },
              { label: "Align center", icon: <AlignCenter className="w-4 h-4" />, v: "center" },
              { label: "Align right", icon: <AlignRight className="w-4 h-4" />, v: "right" },
              { label: "Justify", icon: <AlignJustify className="w-4 h-4" />, v: "justify" },
            ].map(o => (
              <button key={o.label} type="button"
                onMouseDown={(e) => { e.preventDefault(); apply("align", o.v); close(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                {o.icon}{o.label}
              </button>
            ))}
          </Dropdown>

          <Dropdown trigger={<><List className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></>} width="w-44">
            {(close) => [
              { label: "Bullet list", icon: <List className="w-4 h-4" />, v: "bullet" },
              { label: "Numbered list", icon: <ListOrdered className="w-4 h-4" />, v: "ordered" },
            ].map(o => (
              <button key={o.label} type="button"
                onMouseDown={(e) => { e.preventDefault(); toggleList(o.v); close(); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                {o.icon}{o.label}
              </button>
            ))}
          </Dropdown>

          <Dropdown trigger={<><ArrowUpDown className="w-4 h-4" /><ChevronDown className="w-3 h-3" /></>} width="w-36">
            {(close) => LINE_HEIGHTS.map(o => (
              <button key={o.v} type="button"
                onMouseDown={(e) => { e.preventDefault(); apply("lineheight", o.v); close(); }}
                className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100">
                Line height {o.label}
              </button>
            ))}
          </Dropdown>

          <TBtn title="Decrease indent" onClick={() => changeIndent(-1)}><Outdent className="w-4 h-4" /></TBtn>
          <TBtn title="Increase indent" onClick={() => changeIndent(1)}><Indent className="w-4 h-4" /></TBtn>
          <TSep />

          <TBtn title={painterArmed ? "Click text to paste copied format" : "Copy format (select text first)"} active={painterArmed} onClick={handlePainter}>
            <Copy className="w-4 h-4" />
          </TBtn>
          <TSep />

          {/* Link popover */}
          <div className="relative shrink-0">
            <TBtn title="Insert / edit link" onClick={() => setLinkOpen(o => !o)}><Link2 className="w-4 h-4" /></TBtn>
            {linkOpen && (
              <>
                <div className="fixed inset-0 z-20" onMouseDown={() => setLinkOpen(false)} />
                <LinkPopover getQuill={q} onClose={() => setLinkOpen(false)} />
              </>
            )}
          </div>

          <TBtn title="Insert image" onClick={() => imgInputRef.current?.click()}>
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
          </TBtn>
          <TBtn title="Clear formatting" onClick={() => {
            const quill = q(); if (!quill) return;
            quill.focus();
            let range = quill.getSelection();
            if (!range) { const len = quill.getLength(); range = { index: 0, length: Math.max(0, len - 1) }; }
            quill.removeFormat(range.index, range.length);
            syncActive();
          }}>
            <Eraser className="w-4 h-4" />
          </TBtn>
          <input ref={imgInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </div>
      </div>

      {/* Editor */}
      <div onKeyDown={handleKeyDown}>
        <ReactQuill
          ref={quillRef}
          theme="snow"
          defaultValue={initialHtml}
          onChange={handleChange}
          modules={modules}
          placeholder={placeholder}
        />
      </div>

      <style>{`
        .docs-quill .ql-container.ql-snow{border:none!important;border-top:1px solid #f3f4f6!important;}
        .docs-quill .ql-editor{min-height:${minHeight};padding:1rem 1.5rem;font-size:14px;line-height:1.7;color:#1f2937;font-family:var(--font-body);}
        .docs-quill .ql-editor.ql-blank::before{color:#9ca3af;font-style:normal;left:1.5rem;right:1.5rem;}
        .docs-quill .ql-editor h1{font-size:1.7em;font-weight:700;margin:.5em 0 .25em;line-height:1.2;font-family:var(--font-heading);}
        .docs-quill .ql-editor h2{font-size:1.4em;font-weight:600;margin:.45em 0 .2em;line-height:1.2;font-family:var(--font-heading);}
        .docs-quill .ql-editor p{margin:.3em 0;}
        .docs-quill .ql-editor ul,.docs-quill .ql-editor ol{padding-left:1.5em;margin:.3em 0;}
        .docs-quill .ql-editor li{margin:.15em 0;}
        .docs-quill .ql-editor img{max-width:100%;border-radius:8px;margin:.4em 0;}
        .docs-quill .ql-editor a{color:#1a73e8;text-decoration:underline;}
      `}</style>
    </div>
  );
}