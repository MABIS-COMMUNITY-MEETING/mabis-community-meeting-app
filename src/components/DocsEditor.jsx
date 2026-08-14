import React, { useEffect, useMemo, useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import ReactQuill, { Quill } from "react-quill";
import "react-quill/dist/quill.snow.css";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  CheckSquare,
  ChevronDown,
  Code2,
  Copy,
  Download,
  Eraser,
  FileText,
  Highlighter,
  Image as ImageIcon,
  Indent,
  Italic,
  Link2,
  List,
  ListOrdered,
  Loader2,
  Maximize2,
  Minimize2,
  Minus,
  Outdent,
  Paintbrush,
  Plus,
  Printer,
  Quote,
  Redo2,
  Search,
  Strikethrough,
  Subscript,
  Superscript,
  Underline,
  Undo2,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

// Quill's built-in toolbar is deliberately disabled. Keeping registration here
// lets the custom Docs-style chrome support free font sizes and line spacing.
const SizeAttr = Quill.import("attributors/style/size");
SizeAttr.whitelist = null;
Quill.register(SizeAttr, true);

const FONTS = [
  { label: "GNU FreeMono", value: "'GNUFreeMonoUI'" },
  { label: "Torrefarfan", value: "'torrefarfan'" },
  { label: "Go", value: "'GoUI'" },
  { label: "Go Mono", value: "'GoMonoUI'" },
  { label: "GNU FreeSans", value: "'GNUFreeSansUI'" },
  { label: "GNU FreeSerif", value: "'GNUFreeSerifUI'" },
  { label: "Transgender Grotesk", value: "'TransgenderGroteskUI', 'GoUI'" },
  { label: "Atlas Mono", value: "'AtlasMonoUI', 'GoMonoUI'" },
  { label: "Iosevka", value: "'IosevkaUI'" },
  { label: "Lilex", value: "'LilexUI'" },
  { label: "UnifontEX", value: "'UnifontEX'" },
];

const FontAttr = Quill.import("attributors/style/font");
FontAttr.whitelist = FONTS.map((font) => font.value);
Quill.register(FontAttr, true);

const Parchment = Quill.import("parchment");
const LineHeightAttr = new Parchment.Attributor.Style("lineheight", "line-height", {
  scope: Parchment.Scope.BLOCK,
  whitelist: ["1", "1.15", "1.5", "2"],
});
Quill.register(LineHeightAttr, true);

const SIZE_PRESETS = [8, 9, 10, 11, 12, 14, 18, 24, 30, 36, 48, 60, 72, 96];
const LINE_HEIGHTS = ["1", "1.15", "1.5", "2"];
const ZOOM_LEVELS = [75, 90, 100, 110, 125, 150];

// Ink and highlight are applied as CLASSES, not inline styles.
//
// The previous approach wrote style="color: hsl(var(--editor-ink-primary))"
// and relied on the guards in index.css
//   .theme-rich-text [style*="color"]:not([style*="--editor-ink"]) { … !important }
// to spare it. That guard substring-matches the *serialised* style attribute,
// so any browser normalisation of the var() expression makes it miss — and the
// !important rule then repaints the user's colour back to the default ink.
// A class cannot be normalised away, and it keeps the colour bound to the
// theme token, so every one of the 133 themes stays contrast-correct.
const ThemeInkClass = new Parchment.Attributor.Class("themeInk", "ql-ink", { scope: Parchment.Scope.INLINE });
const ThemeHighlightClass = new Parchment.Attributor.Class("themeHighlight", "ql-hl", { scope: Parchment.Scope.INLINE });
Quill.register(ThemeInkClass, true);
Quill.register(ThemeHighlightClass, true);

const THEME_TEXT_COLORS = [
  { label: "Default text", value: null, token: null },
  { label: "Primary theme ink", value: "primary", token: "--editor-ink-primary" },
  { label: "Secondary theme ink", value: "secondary", token: "--editor-ink-secondary" },
  { label: "Accent theme ink", value: "accent", token: "--editor-ink-accent" },
];

const THEME_HIGHLIGHTS = [
  { label: "No highlight", value: null, token: null },
  { label: "Primary theme highlight", value: "primary", token: "--editor-highlight-primary" },
  { label: "Secondary theme highlight", value: "secondary", token: "--editor-highlight-secondary" },
  { label: "Accent theme highlight", value: "accent", token: "--editor-highlight-accent" },
];

const themeColor = (token) => token ? `hsl(var(${token}))` : false;

const emptyFormats = {
  bold: false,
  italic: false,
  underline: false,
  strike: false,
  blockquote: false,
  codeBlock: false,
  script: false,
  header: false,
  align: false,
  list: false,
  color: false,
  background: false,
};

function ToolButton({ title, onClick, active = false, disabled = false, children, className = "" }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active || undefined}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!disabled) onClick?.();
      }}
      className={`docs-tool-btn ${active ? "is-active" : ""} ${className}`}
    >
      {children}
    </button>
  );
}

function ToolbarDivider() {
  return <span className="docs-toolbar-divider" aria-hidden="true" />;
}

function Dropdown({ trigger, children, width = "w-48", align = "left" }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        onMouseDown={(event) => {
          event.preventDefault();
          setOpen((value) => !value);
        }}
        className="docs-dropdown-trigger"
        aria-expanded={open}
      >
        {trigger}
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            className="fixed inset-0 z-[70] cursor-default"
            onMouseDown={(event) => {
              event.preventDefault();
              setOpen(false);
            }}
          />
          <div
            className={`absolute top-[calc(100%+5px)] ${align === "right" ? "right-0" : "left-0"} ${width} max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl z-[80]`}
          >
            {typeof children === "function" ? children(() => setOpen(false)) : children}
          </div>
        </>
      )}
    </div>
  );
}

function MenuItem({ label, hint, icon, onClick, active = false, danger = false, disabled = false, style }) {
  return (
    <button
      type="button"
      disabled={disabled}
      style={style}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!disabled) onClick?.();
      }}
      className={`docs-menu-item ${active ? "is-active" : ""} ${danger ? "is-danger" : ""}`}
    >
      <span className="flex min-w-0 items-center gap-2.5">
        {icon && <span className="shrink-0">{icon}</span>}
        <span className="truncate">{label}</span>
      </span>
      {hint && <span className="ml-4 shrink-0 text-[10px] text-muted-foreground">{hint}</span>}
    </button>
  );
}

function MenuDivider() {
  return <div className="my-1 h-px bg-border" />;
}

function LinkPopover({ getQuill, onClose }) {
  const [url, setUrl] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    const quill = getQuill();
    if (quill) {
      const format = quill.getFormat();
      if (typeof format.link === "string") setUrl(format.link);
    }
    inputRef.current?.focus();
  }, [getQuill]);

  const applyLink = () => {
    const quill = getQuill();
    if (!quill) return onClose();
    quill.focus();
    const raw = url.trim();
    if (!raw) {
      quill.format("link", false);
      return onClose();
    }
    const normalized = /^(https?|mailto|tel):/i.test(raw) ? raw : `https://${raw}`;
    quill.format("link", normalized);
    onClose();
  };

  return (
    <div className="absolute left-0 top-[calc(100%+5px)] z-[90] w-[min(320px,calc(100vw-32px))] rounded-xl border border-border bg-popover p-3 shadow-xl">
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Link</label>
      <input
        ref={inputRef}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            applyLink();
          }
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        placeholder="Paste or type a URL"
        className="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none focus:border-primary"
      />
      <div className="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            const quill = getQuill();
            quill?.focus();
            quill?.format("link", false);
            onClose();
          }}
          className="h-8 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Remove
        </button>
        <button
          type="button"
          onMouseDown={(event) => {
            event.preventDefault();
            applyLink();
          }}
          className="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

function stripHtml(html) {
  if (!html) return "";
  if (typeof document === "undefined") return html.replace(/<[^>]+>/g, " ");
  const container = document.createElement("div");
  container.innerHTML = html;
  return container.textContent || "";
}

function safeFilename(value) {
  return (value || "document")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, " ")
    .slice(0, 80) || "document";
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
  const imageInputRef = useRef(null);
  const copiedFormatsRef = useRef(null);
  const searchFromRef = useRef(0);

  const [uploading, setUploading] = useState(false);
  const [fontLabel, setFontLabel] = useState("UI font");
  const [sizeInput, setSizeInput] = useState("14");
  const [formats, setFormats] = useState(emptyFormats);
  const [painterArmed, setPainterArmed] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const [findQuery, setFindQuery] = useState("");
  const [findResult, setFindResult] = useState("");
  const [zoom, setZoom] = useState(100);
  const [fullscreen, setFullscreen] = useState(false);
  const [copiedFlash, setCopiedFlash] = useState(false);
  const [stats, setStats] = useState(() => {
    const text = stripHtml(initialHtml).trim();
    return {
      words: text ? text.split(/\s+/).length : 0,
      characters: text.length,
    };
  });

  const modules = useMemo(
    () => ({
      toolbar: false,
      history: { delay: 650, maxStack: 150, userOnly: true },
      clipboard: { matchVisual: false },
    }),
    [],
  );

  const getQuill = () => quillRef.current?.getEditor();

  const syncFormats = () => {
    const quill = getQuill();
    if (!quill) return;
    try {
      const format = quill.getFormat();
      setFormats({
        bold: !!format.bold,
        italic: !!format.italic,
        underline: !!format.underline,
        strike: !!format.strike,
        blockquote: !!format.blockquote,
        codeBlock: !!format["code-block"],
        script: format.script || false,
        header: format.header || false,
        align: format.align || false,
        list: format.list || false,
        color: format.themeInk || false,
        background: format.themeHighlight || false,
      });
      if (format.size) {
        const parsed = Number.parseInt(format.size, 10);
        if (!Number.isNaN(parsed)) setSizeInput(String(parsed));
      } else {
        setSizeInput("14");
      }
      if (format.font) {
        const font = FONTS.find((candidate) => candidate.value === format.font);
        setFontLabel(font?.label || "UI font");
      } else {
        setFontLabel("UI font");
      }
    } catch {
      // Selection changes can race a ReactQuill unmount in dialogs.
    }
  };

  useEffect(() => {
    const quill = getQuill();
    if (!quill) return undefined;
    const handleSelection = () => syncFormats();
    const handleText = () => syncFormats();
    quill.on("selection-change", handleSelection);
    quill.on("text-change", handleText);
    syncFormats();
    return () => {
      quill.off("selection-change", handleSelection);
      quill.off("text-change", handleText);
    };
  }, []);

  useEffect(() => {
    if (!fullscreen) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!findOpen) {
      setFindResult("");
      setFindQuery("");
      searchFromRef.current = 0;
    }
  }, [findOpen]);

  const handleChange = (content, delta, source, editor) => {
    const rawText = editor?.getText() || "";
    const trimmed = rawText.replace(/\n$/, "").trim();
    // Quill reports no text for embeds, so a body consisting only of a pasted
    // image used to be treated as empty and emitted as "" — silently discarding
    // the content on save. Anything embedded counts as real content too.
    const hasEmbed = /<(?:img|iframe|video|audio|hr|table)\b/i.test(content || "");
    const emitted = (trimmed || hasEmbed) ? content : "";
    const cleanText = rawText.replace(/\n$/, "").trim();
    setStats({
      words: cleanText ? cleanText.split(/\s+/).length : 0,
      characters: cleanText.length,
    });
    onChange?.(emitted);
  };

  const focusAndFormat = (name, value) => {
    const quill = getQuill();
    if (!quill) return;
    quill.focus();
    quill.format(name, value, "user");
    syncFormats();
  };

  // The highlight class carries its own readable foreground in CSS, so there is
  // no second colour format to keep in sync.
  const applyThemeHighlight = (highlight) => {
    const quill = getQuill();
    if (!quill) return;
    quill.focus();
    quill.format("themeHighlight", highlight.value || false, "user");
    syncFormats();
  };

  const toggleFormat = (name) => {
    const quill = getQuill();
    if (!quill) return;
    const current = quill.getFormat();
    quill.focus();
    quill.format(name, !current[name], "user");
    syncFormats();
  };

  const setBlockStyle = (value) => {
    const quill = getQuill();
    if (!quill) return;
    quill.focus();
    quill.format("header", value || false, "user");
    syncFormats();
  };

  const toggleList = (type) => {
    const quill = getQuill();
    if (!quill) return;
    const current = quill.getFormat();
    quill.focus();
    quill.format("list", current.list === type ? false : type, "user");
    syncFormats();
  };

  const changeIndent = (delta) => {
    const quill = getQuill();
    if (!quill) return;
    const current = quill.getFormat();
    const indent = Number(current.indent || 0);
    quill.focus();
    quill.format("indent", Math.max(0, indent + delta), "user");
  };

  const applySize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed) || parsed < 1 || parsed > 200) return;
    setSizeInput(String(parsed));
    focusAndFormat("size", `${parsed}px`);
  };

  const stepSize = (delta) => {
    applySize(Math.max(1, (Number.parseInt(sizeInput, 10) || 14) + delta));
  };

  const setFont = (value, label) => {
    setFontLabel(label);
    focusAndFormat("font", value);
  };

  const clearFormatting = () => {
    const quill = getQuill();
    if (!quill) return;
    quill.focus();
    const range = quill.getSelection() || { index: 0, length: Math.max(0, quill.getLength() - 1) };
    quill.removeFormat(range.index, range.length, "user");
    syncFormats();
  };

  const undo = () => {
    getQuill()?.history.undo();
    syncFormats();
  };

  const redo = () => {
    getQuill()?.history.redo();
    syncFormats();
  };

  const selectAll = () => {
    const quill = getQuill();
    if (!quill) return;
    quill.focus();
    quill.setSelection(0, Math.max(0, quill.getLength() - 1), "silent");
    syncFormats();
  };

  const insertText = (text) => {
    const quill = getQuill();
    if (!quill) return;
    quill.focus();
    const range = quill.getSelection(true) || { index: quill.getLength() - 1, length: 0 };
    quill.insertText(range.index, text, "user");
    quill.setSelection(range.index + text.length, 0, "silent");
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const quill = getQuill();
      if (quill && file_url) {
        quill.focus();
        const range = quill.getSelection(true) || { index: Math.max(0, quill.getLength() - 1), length: 0 };
        quill.insertEmbed(range.index, "image", file_url, "user");
        quill.insertText(range.index + 1, "\n", "user");
        quill.setSelection(range.index + 2, 0, "silent");
      }
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handlePainter = () => {
    const quill = getQuill();
    if (!quill) return;
    if (!painterArmed) {
      const range = quill.getSelection();
      if (!range || range.length === 0) return;
      const format = quill.getFormat(range);
      copiedFormatsRef.current = {
        bold: format.bold || false,
        italic: format.italic || false,
        underline: format.underline || false,
        strike: format.strike || false,
        color: format.themeInk || false,
        background: format.themeHighlight || false,
        size: format.size || false,
        font: format.font || false,
      };
      setPainterArmed(true);
      return;
    }
    const range = quill.getSelection();
    if (range && copiedFormatsRef.current) {
      quill.formatText(range.index, range.length, copiedFormatsRef.current, "user");
    }
    copiedFormatsRef.current = null;
    setPainterArmed(false);
    syncFormats();
  };

  const findNext = () => {
    const quill = getQuill();
    const query = findQuery.trim();
    if (!quill || !query) {
      setFindResult("");
      return;
    }
    const text = quill.getText();
    const haystack = text.toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    let index = haystack.indexOf(needle, searchFromRef.current);
    if (index < 0 && searchFromRef.current > 0) index = haystack.indexOf(needle, 0);
    if (index < 0) {
      setFindResult("No matches");
      searchFromRef.current = 0;
      return;
    }
    quill.focus();
    quill.setSelection(index, query.length, "silent");
    quill.scrollIntoView?.();
    searchFromRef.current = index + query.length;
    setFindResult(`Found at ${index + 1}`);
  };

  const copyDocument = async () => {
    const quill = getQuill();
    if (!quill || !navigator.clipboard) return;
    await navigator.clipboard.writeText(quill.getText().replace(/\n$/, ""));
    setCopiedFlash(true);
    window.setTimeout(() => setCopiedFlash(false), 1200);
  };

  const downloadHtml = () => {
    const quill = getQuill();
    if (!quill) return;
    const activeFont = getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'";
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font-family:${activeFont};font-size:16px;line-height:1.65;color:#202124}img{max-width:100%}blockquote{border-left:3px solid #dadce0;margin-left:0;padding-left:16px;color:#5f6368}pre{white-space:pre-wrap;background:#f8f9fa;padding:12px;border-radius:8px}</style></head><body>${quill.root.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFilename(title)}.html`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const printDocument = () => {
    const quill = getQuill();
    if (!quill) return;
    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!popup) return;
    const activeFont = getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'";
    popup.document.write(`<!doctype html><html><head><title>${title}</title><style>@page{margin:18mm}body{max-width:760px;margin:0 auto;font-family:${activeFont};font-size:11pt;line-height:1.55;color:#111}img{max-width:100%;page-break-inside:avoid}blockquote{border-left:3px solid #aaa;margin-left:0;padding-left:14px}pre{white-space:pre-wrap}</style></head><body>${quill.root.innerHTML}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const handleKeyDown = (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "s") {
      event.preventDefault();
      onSave?.();
    }
    if (mod && event.key.toLowerCase() === "f") {
      event.preventDefault();
      setFindOpen(true);
    }
    if (event.key === "Escape" && fullscreen) setFullscreen(false);
  };

  const documentStatus = saving ? "Saving…" : saved ? "Saved" : onSave ? "Unsaved changes" : "Editing";
  const statusIcon = saving ? <Loader2 className="h-3 w-3 animate-spin" /> : saved ? <Check className="h-3 w-3" /> : null;

  const editorShellClass = fullscreen
    ? "theme-rich-text fixed inset-0 z-[10020] flex min-h-0 flex-col bg-background docs-quill docs-editor-shell"
    : "theme-rich-text docs-quill docs-editor-shell overflow-hidden rounded-xl border border-border bg-card shadow-sm";

  return (
    <div className={editorShellClass} onKeyDown={handleKeyDown}>
      <div className="docs-docbar">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="docs-file-icon">
            <FileText className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[13px] font-medium text-foreground">{title || "Untitled document"}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground" aria-live="polite">
              {statusIcon}
              <span>{documentStatus}</span>
              <span aria-hidden="true">·</span>
              <span>{stats.words} words</span>
            </div>
          </div>
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFindOpen((value) => !value)}
            className="docs-top-action"
            title="Find in document (Ctrl+F)"
          >
            <Search className="h-4 w-4" />
            <span className="hidden sm:inline">Find</span>
          </button>
          {onSave && (
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="docs-save-button"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              {saving ? "Saving" : saved ? "Saved" : "Save"}
            </button>
          )}
          <button
            type="button"
            onClick={() => setFullscreen((value) => !value)}
            className="docs-top-action docs-icon-action"
            title={fullscreen ? "Exit full screen" : "Full screen"}
          >
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </button>
        </div>
      </div>

      <div className="docs-menubar">
        <Dropdown trigger={<span>File</span>} width="w-56">
          {(close) => (
            <>
              {onSave && (
                <MenuItem label="Save" hint="Ctrl+S" onClick={() => { onSave(); close(); }} icon={<Check className="h-4 w-4" />} disabled={saving} />
              )}
              <MenuItem label="Download as HTML" onClick={() => { downloadHtml(); close(); }} icon={<Download className="h-4 w-4" />} />
              <MenuItem label="Print" hint="Ctrl+P" onClick={() => { printDocument(); close(); }} icon={<Printer className="h-4 w-4" />} />
              <MenuDivider />
              <MenuItem label="Copy plain text" onClick={() => { copyDocument(); close(); }} icon={<Copy className="h-4 w-4" />} />
              <MenuItem label={fullscreen ? "Exit full screen" : "Full screen"} onClick={() => { setFullscreen((value) => !value); close(); }} icon={fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />} />
            </>
          )}
        </Dropdown>

        <Dropdown trigger={<span>Edit</span>} width="w-52">
          {(close) => (
            <>
              <MenuItem label="Undo" hint="Ctrl+Z" onClick={() => { undo(); close(); }} icon={<Undo2 className="h-4 w-4" />} />
              <MenuItem label="Redo" hint="Ctrl+Y" onClick={() => { redo(); close(); }} icon={<Redo2 className="h-4 w-4" />} />
              <MenuDivider />
              <MenuItem label="Find" hint="Ctrl+F" onClick={() => { setFindOpen(true); close(); }} icon={<Search className="h-4 w-4" />} />
              <MenuItem label="Select all" hint="Ctrl+A" onClick={() => { selectAll(); close(); }} />
              <MenuDivider />
              <MenuItem label="Clear formatting" onClick={() => { clearFormatting(); close(); }} icon={<Eraser className="h-4 w-4" />} />
            </>
          )}
        </Dropdown>

        <Dropdown trigger={<span>Insert</span>} width="w-56">
          {(close) => (
            <>
              <MenuItem label="Link" hint="Ctrl+K" onClick={() => { setLinkOpen(true); close(); }} icon={<Link2 className="h-4 w-4" />} />
              <MenuItem label="Image" onClick={() => { imageInputRef.current?.click(); close(); }} icon={<ImageIcon className="h-4 w-4" />} />
              <MenuDivider />
              <MenuItem label="Checklist" onClick={() => { toggleList("checked"); close(); }} icon={<CheckSquare className="h-4 w-4" />} />
              <MenuItem label="Block quote" onClick={() => { toggleFormat("blockquote"); close(); }} icon={<Quote className="h-4 w-4" />} />
              <MenuItem label="Code block" onClick={() => { toggleFormat("code-block"); close(); }} icon={<Code2 className="h-4 w-4" />} />
              <MenuDivider />
              <MenuItem label="Current date" onClick={() => { insertText(new Date().toLocaleDateString()); close(); }} />
              <MenuItem label="Current time" onClick={() => { insertText(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); close(); }} />
            </>
          )}
        </Dropdown>

        <Dropdown trigger={<span>Format</span>} width="w-56">
          {(close) => (
            <>
              <MenuItem label="Paragraph" active={!formats.header} onClick={() => { setBlockStyle(false); close(); }} />
              <MenuItem label="Heading 1" active={formats.header === 1} onClick={() => { setBlockStyle(1); close(); }} />
              <MenuItem label="Heading 2" active={formats.header === 2} onClick={() => { setBlockStyle(2); close(); }} />
              <MenuItem label="Heading 3" active={formats.header === 3} onClick={() => { setBlockStyle(3); close(); }} />
              <MenuDivider />
              <MenuItem label="Bold" hint="Ctrl+B" active={formats.bold} onClick={() => { toggleFormat("bold"); close(); }} />
              <MenuItem label="Italic" hint="Ctrl+I" active={formats.italic} onClick={() => { toggleFormat("italic"); close(); }} />
              <MenuItem label="Underline" hint="Ctrl+U" active={formats.underline} onClick={() => { toggleFormat("underline"); close(); }} />
              <MenuItem label="Strikethrough" active={formats.strike} onClick={() => { toggleFormat("strike"); close(); }} />
              <MenuDivider />
              <MenuItem label="Clear formatting" onClick={() => { clearFormatting(); close(); }} icon={<Eraser className="h-4 w-4" />} />
            </>
          )}
        </Dropdown>

        <span className="ml-auto hidden text-[10px] text-muted-foreground md:inline">
          {copiedFlash ? "Copied to clipboard" : painterArmed ? "Format painter ready: select destination, then click the brush" : "Ctrl+S saves · Ctrl+F finds"}
        </span>
      </div>

      {findOpen && (
        <div className="docs-findbar">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            value={findQuery}
            onChange={(event) => {
              setFindQuery(event.target.value);
              setFindResult("");
              searchFromRef.current = 0;
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                findNext();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                setFindOpen(false);
              }
            }}
            placeholder="Find in document"
            className="h-8 min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
          />
          <span className="shrink-0 text-[10px] text-muted-foreground">{findResult}</span>
          <button type="button" onClick={findNext} className="docs-find-action">Next</button>
          <button type="button" onClick={() => setFindOpen(false)} className="docs-find-icon" title="Close find">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="docs-toolbar-wrap">
        <div className="docs-toolbar" role="toolbar" aria-label="Document formatting">
          <ToolButton title="Undo (Ctrl+Z)" onClick={undo}><Undo2 className="h-4 w-4" /></ToolButton>
          <ToolButton title="Redo (Ctrl+Y)" onClick={redo}><Redo2 className="h-4 w-4" /></ToolButton>
          <ToolbarDivider />

          <Dropdown
            trigger={(
              <>
                <span className="w-[82px] truncate text-left text-xs">
                  {formats.header === 1 ? "Heading 1" : formats.header === 2 ? "Heading 2" : formats.header === 3 ? "Heading 3" : "Normal text"}
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
            width="w-44"
          >
            {(close) => (
              <>
                <MenuItem label="Normal text" active={!formats.header} onClick={() => { setBlockStyle(false); close(); }} />
                <MenuItem label="Heading 1" active={formats.header === 1} onClick={() => { setBlockStyle(1); close(); }} style={{ fontSize: 18, fontWeight: 700 }} />
                <MenuItem label="Heading 2" active={formats.header === 2} onClick={() => { setBlockStyle(2); close(); }} style={{ fontSize: 16, fontWeight: 650 }} />
                <MenuItem label="Heading 3" active={formats.header === 3} onClick={() => { setBlockStyle(3); close(); }} style={{ fontSize: 14, fontWeight: 650 }} />
              </>
            )}
          </Dropdown>

          <ToolbarDivider />
          <Dropdown
            trigger={(
              <>
                <span className="w-[92px] truncate text-left text-xs">{fontLabel}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
            width="w-56"
          >
            {(close) => FONTS.map((font) => (
              <MenuItem
                key={font.label}
                label={font.label}
                active={font.label === fontLabel}
                style={{ fontFamily: font.value }}
                onClick={() => {
                  setFont(font.value, font.label);
                  close();
                }}
              />
            ))}
          </Dropdown>

          <ToolbarDivider />
          <ToolButton title="Decrease font size" onClick={() => stepSize(-1)}><Minus className="h-3.5 w-3.5" /></ToolButton>
          <Dropdown
            trigger={(
              <>
                <span className="w-6 text-center text-xs tabular-nums">{sizeInput}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
            width="w-20"
          >
            {(close) => SIZE_PRESETS.map((size) => (
              <MenuItem
                key={size}
                label={String(size)}
                active={String(size) === sizeInput}
                onClick={() => {
                  applySize(size);
                  close();
                }}
              />
            ))}
          </Dropdown>
          <ToolButton title="Increase font size" onClick={() => stepSize(1)}><Plus className="h-3.5 w-3.5" /></ToolButton>

          <ToolbarDivider />
          <ToolButton title="Bold (Ctrl+B)" active={formats.bold} onClick={() => toggleFormat("bold")}><Bold className="h-4 w-4" /></ToolButton>
          <ToolButton title="Italic (Ctrl+I)" active={formats.italic} onClick={() => toggleFormat("italic")}><Italic className="h-4 w-4" /></ToolButton>
          <ToolButton title="Underline (Ctrl+U)" active={formats.underline} onClick={() => toggleFormat("underline")}><Underline className="h-4 w-4" /></ToolButton>
          <ToolButton title="Strikethrough" active={formats.strike} onClick={() => toggleFormat("strike")}><Strikethrough className="h-4 w-4" /></ToolButton>

          <ToolbarDivider />
          <Dropdown
            trigger={(
              <>
                <span className="docs-palette-trigger" title="Theme text color">
                  <span className="text-sm font-semibold">A</span>
                  <span className="docs-color-line bg-[hsl(var(--editor-ink-primary))]" />
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
            width="w-52"
          >
            {(close) => THEME_TEXT_COLORS.map((color) => (
              <MenuItem
                key={color.label}
                label={color.label}
                active={color.value ? formats.color === color.value : !formats.color}
                icon={<span className="docs-palette-swatch" style={{ background: color.token ? themeColor(color.token) : "hsl(var(--card-foreground))" }} />}
                onClick={() => {
                  focusAndFormat("themeInk", color.value || false);
                  close();
                }}
              />
            ))}
          </Dropdown>
          <Dropdown
            trigger={(
              <>
                <span className="docs-palette-trigger" title="Theme highlight color">
                  <Highlighter className="h-4 w-4" />
                  <span className="docs-color-line bg-[hsl(var(--editor-highlight-secondary))]" />
                </span>
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
            width="w-56"
          >
            {(close) => THEME_HIGHLIGHTS.map((highlight) => (
              <MenuItem
                key={highlight.label}
                label={highlight.label}
                active={highlight.value ? formats.background === highlight.value : !formats.background}
                icon={<span className="docs-palette-swatch" style={{ background: highlight.token ? themeColor(highlight.token) : "transparent" }} />}
                onClick={() => {
                  applyThemeHighlight(highlight);
                  close();
                }}
              />
            ))}
          </Dropdown>

          <ToolbarDivider />
          <Dropdown
            trigger={(
              <>
                {formats.align === "center" ? <AlignCenter className="h-4 w-4" /> : formats.align === "right" ? <AlignRight className="h-4 w-4" /> : formats.align === "justify" ? <AlignJustify className="h-4 w-4" /> : <AlignLeft className="h-4 w-4" />}
                <ChevronDown className="h-3.5 w-3.5" />
              </>
            )}
            width="w-44"
          >
            {(close) => (
              <>
                <MenuItem label="Align left" icon={<AlignLeft className="h-4 w-4" />} active={!formats.align || formats.align === "left"} onClick={() => { focusAndFormat("align", false); close(); }} />
                <MenuItem label="Align center" icon={<AlignCenter className="h-4 w-4" />} active={formats.align === "center"} onClick={() => { focusAndFormat("align", "center"); close(); }} />
                <MenuItem label="Align right" icon={<AlignRight className="h-4 w-4" />} active={formats.align === "right"} onClick={() => { focusAndFormat("align", "right"); close(); }} />
                <MenuItem label="Justify" icon={<AlignJustify className="h-4 w-4" />} active={formats.align === "justify"} onClick={() => { focusAndFormat("align", "justify"); close(); }} />
              </>
            )}
          </Dropdown>

          <ToolButton title="Bullet list" active={formats.list === "bullet"} onClick={() => toggleList("bullet")}><List className="h-4 w-4" /></ToolButton>
          <ToolButton title="Numbered list" active={formats.list === "ordered"} onClick={() => toggleList("ordered")}><ListOrdered className="h-4 w-4" /></ToolButton>
          <ToolButton title="Checklist" active={formats.list === "checked" || formats.list === "unchecked"} onClick={() => toggleList("checked")}><CheckSquare className="h-4 w-4" /></ToolButton>

          <ToolbarDivider />
          <ToolButton title="Decrease indent" onClick={() => changeIndent(-1)}><Outdent className="h-4 w-4" /></ToolButton>
          <ToolButton title="Increase indent" onClick={() => changeIndent(1)}><Indent className="h-4 w-4" /></ToolButton>
          <Dropdown trigger={<><span className="text-xs">Spacing</span><ChevronDown className="h-3.5 w-3.5" /></>} width="w-40">
            {(close) => LINE_HEIGHTS.map((height) => (
              <MenuItem key={height} label={`${height} line spacing`} onClick={() => { focusAndFormat("lineheight", height); close(); }} />
            ))}
          </Dropdown>

          <ToolbarDivider />
          <ToolButton title="Block quote" active={formats.blockquote} onClick={() => toggleFormat("blockquote")}><Quote className="h-4 w-4" /></ToolButton>
          <ToolButton title="Code block" active={formats.codeBlock} onClick={() => toggleFormat("code-block")}><Code2 className="h-4 w-4" /></ToolButton>
          <ToolButton title="Subscript" active={formats.script === "sub"} onClick={() => focusAndFormat("script", formats.script === "sub" ? false : "sub")}><Subscript className="h-4 w-4" /></ToolButton>
          <ToolButton title="Superscript" active={formats.script === "super"} onClick={() => focusAndFormat("script", formats.script === "super" ? false : "super")}><Superscript className="h-4 w-4" /></ToolButton>

          <ToolbarDivider />
          <ToolButton title="Format painter" active={painterArmed} onClick={handlePainter}><Paintbrush className="h-4 w-4" /></ToolButton>

          <div className="relative shrink-0">
            <ToolButton title="Insert or edit link" active={linkOpen} onClick={() => setLinkOpen((value) => !value)}><Link2 className="h-4 w-4" /></ToolButton>
            {linkOpen && (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-[70] cursor-default"
                  aria-label="Close link editor"
                  onMouseDown={(event) => {
                    event.preventDefault();
                    setLinkOpen(false);
                  }}
                />
                <LinkPopover getQuill={getQuill} onClose={() => setLinkOpen(false)} />
              </>
            )}
          </div>

          <ToolButton title="Insert image" disabled={uploading} onClick={() => imageInputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          </ToolButton>
          <ToolButton title="Clear formatting" onClick={clearFormatting}><Eraser className="h-4 w-4" /></ToolButton>
        </div>
      </div>

      <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />

      <div className={`docs-workspace ${fullscreen ? "min-h-0 flex-1 overflow-auto" : ""}`}>
        <div className="docs-page-rail">
          <div className="docs-page" style={{ zoom: `${zoom}%` }}>
            <ReactQuill
              ref={quillRef}
              theme="snow"
              defaultValue={initialHtml}
              onChange={handleChange}
              modules={modules}
              placeholder={placeholder}
            />
          </div>
        </div>
      </div>

      <div className="docs-statusbar">
        <div className="flex min-w-0 items-center gap-3">
          <span>{stats.words} words</span>
          <span>{stats.characters} characters</span>
          <span className="hidden sm:inline">HTML document</span>
        </div>
        <div className="ml-auto flex items-center gap-1">
          <ToolButton title="Zoom out" onClick={() => {
            const index = ZOOM_LEVELS.findLastIndex((level) => level < zoom);
            setZoom(index >= 0 ? ZOOM_LEVELS[index] : ZOOM_LEVELS[0]);
          }}><ZoomOut className="h-3.5 w-3.5" /></ToolButton>
          <Dropdown trigger={<span className="w-9 text-center text-[11px] tabular-nums">{zoom}%</span>} width="w-24" align="right">
            {(close) => ZOOM_LEVELS.map((level) => (
              <MenuItem key={level} label={`${level}%`} active={zoom === level} onClick={() => { setZoom(level); close(); }} />
            ))}
          </Dropdown>
          <ToolButton title="Zoom in" onClick={() => {
            const level = ZOOM_LEVELS.find((candidate) => candidate > zoom);
            setZoom(level || ZOOM_LEVELS[ZOOM_LEVELS.length - 1]);
          }}><ZoomIn className="h-3.5 w-3.5" /></ToolButton>
        </div>
      </div>

      <style>{`
        .docs-editor-shell {
          --docs-blue: hsl(var(--editor-ink-primary));
          --docs-blue-soft: color-mix(in srgb, var(--docs-blue) 12%, transparent);
          color: hsl(var(--card-foreground));
          font-family: var(--font-body);
        }
        .docs-docbar {
          min-height: 54px;
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 10px 6px 12px;
          border-bottom: 1px solid hsl(var(--border) / .72);
          background: hsl(var(--card));
        }
        .docs-file-icon {
          width: 32px;
          height: 32px;
          display: grid;
          place-items: center;
          flex: none;
          border-radius: 7px;
          color: var(--docs-blue);
          background: color-mix(in srgb, var(--docs-blue) 10%, hsl(var(--card)));
        }
        .docs-top-action,
        .docs-save-button,
        .docs-find-action,
        .docs-find-icon {
          min-height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          border-radius: 999px;
          font-size: 11px;
          white-space: nowrap;
        }
        .docs-top-action {
          padding: 0 10px;
          color: hsl(var(--foreground));
        }
        .docs-top-action:hover { background: hsl(var(--muted)); }
        .docs-icon-action { width: 34px; padding: 0; }
        .docs-save-button {
          padding: 0 13px;
          border: 1px solid color-mix(in srgb, var(--docs-blue) 18%, hsl(var(--border)));
          background: color-mix(in srgb, var(--docs-blue) 14%, hsl(var(--card)));
          color: color-mix(in srgb, var(--docs-blue) 82%, hsl(var(--foreground)));
          font-weight: 600;
        }
        .docs-save-button:hover { background: color-mix(in srgb, var(--docs-blue) 21%, hsl(var(--card))); }
        .docs-menubar {
          min-height: 32px;
          display: flex;
          align-items: center;
          gap: 1px;
          padding: 2px 10px;
          border-bottom: 1px solid hsl(var(--border) / .62);
          background: hsl(var(--card));
        }
        .docs-menubar > .relative > .docs-dropdown-trigger {
          height: 26px;
          padding: 0 8px;
          border-radius: 5px;
          font-size: 11px;
        }
        .docs-findbar {
          min-height: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 10px 4px 14px;
          border-bottom: 1px solid hsl(var(--border) / .65);
          background: hsl(var(--muted) / .38);
        }
        .docs-find-action { padding: 0 10px; color: hsl(var(--foreground)); background: hsl(var(--card)); border: 1px solid hsl(var(--border)); }
        .docs-find-icon { width: 32px; color: hsl(var(--muted-foreground)); }
        .docs-toolbar-wrap {
          overflow-x: auto;
          border-bottom: 1px solid hsl(var(--border) / .72);
          background: hsl(var(--card));
          scrollbar-width: none;
        }
        .docs-toolbar-wrap::-webkit-scrollbar { display: none; }
        .docs-toolbar {
          min-width: max-content;
          min-height: 44px;
          display: flex;
          align-items: center;
          gap: 1px;
          padding: 5px 8px;
        }
        .docs-tool-btn,
        .docs-dropdown-trigger,
        .docs-color-tool {
          height: 32px;
          min-width: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 4px;
          flex: none;
          border-radius: 6px;
          color: hsl(var(--foreground));
          transition: background-color .12s ease, color .12s ease, box-shadow .12s ease;
        }
        .docs-tool-btn { padding: 0 7px; }
        .docs-tool-btn:hover,
        .docs-dropdown-trigger:hover,
        .docs-color-tool:hover { background: hsl(var(--muted)); }
        .docs-tool-btn.is-active {
          background: color-mix(in srgb, var(--docs-blue) 13%, hsl(var(--card)));
          color: color-mix(in srgb, var(--docs-blue) 86%, hsl(var(--foreground)));
        }
        .docs-tool-btn:disabled { opacity: .42; }
        .docs-dropdown-trigger { padding: 0 7px; }
        .docs-toolbar-divider {
          width: 1px;
          height: 22px;
          margin: 0 4px;
          flex: none;
          background: hsl(var(--border));
        }
        .docs-menu-item {
          width: 100%;
          min-height: 32px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          border-radius: 5px;
          padding: 5px 9px;
          color: hsl(var(--popover-foreground));
          font-size: 11px;
          line-height: 1.25;
          text-align: left;
        }
        .docs-menu-item:hover { background: hsl(var(--muted)); }
        .docs-menu-item.is-active {
          background: color-mix(in srgb, var(--docs-blue) 10%, hsl(var(--popover)));
          color: color-mix(in srgb, var(--docs-blue) 84%, hsl(var(--foreground)));
          font-weight: 600;
        }
        .docs-menu-item.is-danger { color: hsl(var(--destructive)); }
        .docs-menu-item:disabled { opacity: .45; }
        .docs-palette-trigger { position: relative; display: inline-flex; height: 24px; width: 22px; align-items: center; justify-content: center; }
        .docs-color-line { position: absolute; left: 2px; right: 2px; bottom: 1px; height: 3px; border-radius: 999px; }
        .docs-palette-swatch { width: 15px; height: 15px; flex: none; border-radius: 3px; border: 1px solid hsl(var(--border)); }
        .docs-workspace {
          position: relative;
          overflow-x: auto;
          background:
            linear-gradient(hsl(var(--foreground) / .025) 1px, transparent 1px),
            hsl(var(--muted) / .42);
          background-size: 100% 24px;
        }
        .docs-page-rail {
          min-width: min(100%, 620px);
          padding: 20px 14px 24px;
        }
        .docs-page {
          width: min(816px, calc(100vw - 36px));
          max-width: 100%;
          margin: 0 auto;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border) / .78);
          box-shadow: 0 3px 16px hsl(var(--foreground) / .08);
          transform-origin: top center;
        }
        .docs-quill .ql-container.ql-snow { border: none !important; font-family: inherit; }
        .docs-quill .ql-editor {
          min-height: ${minHeight};
          padding: clamp(22px, 5vw, 48px) clamp(22px, 7vw, 64px);
          color: hsl(var(--card-foreground));
          font-family: var(--font-body);
          font-size: 14px;
          line-height: 1.65;
          overflow-y: visible;
        }
        .docs-quill .ql-editor.ql-blank::before {
          left: clamp(22px, 7vw, 64px);
          right: clamp(22px, 7vw, 64px);
          color: hsl(var(--muted-foreground));
          font-style: normal;
        }
        .docs-quill .ql-editor h1 {
          margin: .85em 0 .35em;
          font-family: inherit;
          font-size: 2em;
          font-weight: 700;
          letter-spacing: -.035em;
          line-height: 1.16;
        }
        .docs-quill .ql-editor h2 {
          margin: .75em 0 .3em;
          font-family: inherit;
          font-size: 1.55em;
          font-weight: 650;
          letter-spacing: -.025em;
          line-height: 1.2;
        }
        .docs-quill .ql-editor h3 {
          margin: .65em 0 .25em;
          font-family: inherit;
          font-size: 1.22em;
          font-weight: 650;
          line-height: 1.25;
        }
        .docs-quill .ql-editor p { margin: .28em 0; }
        .docs-quill .ql-editor ul,
        .docs-quill .ql-editor ol { margin: .35em 0; padding-left: 1.6em; }
        .docs-quill .ql-editor li { margin: .16em 0; }
        .docs-quill .ql-editor blockquote {
          margin: .7em 0;
          padding-left: 14px;
          border-left: 3px solid hsl(var(--border));
          color: hsl(var(--muted-foreground));
        }
        .docs-quill .ql-editor pre.ql-syntax {
          margin: .7em 0;
          padding: 12px 14px;
          border-radius: 6px;
          background: hsl(var(--muted));
          color: hsl(var(--foreground));
          font-family: var(--font-mono);
          font-size: .9em;
        }
        .docs-quill .ql-editor img {
          max-width: 100%;
          height: auto;
          margin: .65em 0;
          border-radius: 6px;
          border: 1px solid hsl(var(--border));
        }
        .docs-quill .ql-editor a { color: var(--docs-blue); text-decoration: underline; text-underline-offset: 2px; }
        .docs-statusbar {
          min-height: 34px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 2px 8px 2px 12px;
          border-top: 1px solid hsl(var(--border) / .7);
          background: hsl(var(--card));
          color: hsl(var(--muted-foreground));
          font-size: 10px;
        }
        @media (max-width: 640px) {
          .docs-docbar { min-height: 50px; }
          .docs-menubar { overflow-x: auto; scrollbar-width: none; }
          .docs-page-rail { padding: 10px 6px 14px; }
          .docs-page { width: calc(100vw - 28px); box-shadow: none; }
          .docs-quill .ql-editor { padding: 20px 18px; }
          .docs-quill .ql-editor.ql-blank::before { left: 18px; right: 18px; }
        }
      `}</style>
    </div>
  );
}
