import { createSignal, onMount, onCleanup, createEffect, on, Show, For, Index } from "solid-js";
import {
  Bold, Italic, Underline, Strikethrough, List, ListOrdered, ListChecks,
  Quote, Code, Link2, Image as ImageIcon, Undo2, Redo2, Search, X,
  Superscript, Subscript, IndentIncrease, IndentDecrease, Eraser,
  Paintbrush, ZoomIn, ZoomOut, Type, Palette, Highlighter, ChevronDown,
  Maximize2, Minimize2, Save, Printer, Download,
} from "lucide-solid";
import {
  Quill, FONTS, SIZE_PRESETS, LINE_HEIGHTS, ZOOM_LEVELS,
  THEME_TEXT_COLORS, THEME_HIGHLIGHTS, EDITOR_MODULES, EMPTY_FORMATS,
  resolveThemeColor, stripHtml, safeFilename,
} from "~/lib/quill-setup";
import { downloadOdt } from "@/lib/odt-export";
import { lockBodyScroll } from "@/lib/scroll-lock";
import "quill/dist/quill.snow.css";

/*
 * DocsEditor — Solid port of src/components/DocsEditor.jsx (1,397 lines).
 *
 * ── The workaround this port DELETES ────────────────────────────────────────
 * The React version carries this comment:
 *
 *   "ReactQuill restores its saved selection whenever it re-renders, which
 *    focuses the editor. Because the docbar title lives in this component,
 *    every keystroke in the title changed a prop, re-rendered the editor and
 *    pulled the caret straight back out of the field — the title was
 *    effectively untypeable. Holding the editor element in a memo keeps it out
 *    of unrelated re-renders. onChange is read through a ref so the memo never
 *    goes stale."
 *
 * That is a workaround for React's render model, not for Quill. A Solid
 * component body runs exactly once, so nothing re-renders the editor and
 * nothing can steal the caret. The useMemo wrapper, the changeRef indirection
 * and the bug they existed to suppress are all gone — Quill is created once in
 * onMount and simply left alone afterwards.
 *
 * Everything else (registered attributors, theme-token ink/highlight, the
 * embed-aware empty check) is carried over unchanged.
 */

function countStats(html) {
  const text = stripHtml(html || "").trim();
  return { words: text ? text.split(/\s+/).length : 0, characters: text.length };
}

function ToolButton(props) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      aria-pressed={props.active || undefined}
      disabled={props.disabled}
      onMouseDown={(e) => { e.preventDefault(); if (!props.disabled) props.onClick?.(); }}
      class={`docs-tool-btn ${props.active ? "is-active" : ""} ${props.class || ""}`}
    >
      {props.children}
    </button>
  );
}

function ToolbarDivider() {
  return <span class="docs-toolbar-divider" aria-hidden="true" />;
}

function MenuItem(props) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      style={props.style}
      onMouseDown={(e) => { e.preventDefault(); if (!props.disabled) props.onClick?.(); }}
      class={`docs-menu-item ${props.active ? "is-active" : ""} ${props.danger ? "is-danger" : ""}`}
    >
      <span class="flex min-w-0 items-center gap-2.5">
        <Show when={props.icon}><span class="shrink-0">{props.icon}</span></Show>
        <span class="truncate">{props.label}</span>
      </span>
      <Show when={props.hint}>
        <span class="ml-4 shrink-0 text-[10px] text-muted-foreground">{props.hint}</span>
      </Show>
    </button>
  );
}

function MenuDivider() {
  return <div class="my-1 h-px bg-border" />;
}

function Dropdown(props) {
  const [open, setOpen] = createSignal(false);
  const close = () => setOpen(false);

  return (
    <div class="relative shrink-0">
      <button
        type="button"
        onMouseDown={(e) => { e.preventDefault(); setOpen((v) => !v); }}
        class="docs-dropdown-trigger"
        aria-expanded={open()}
      >
        {props.trigger}
      </button>
      <Show when={open()}>
        <button
          type="button"
          aria-label="Close menu"
          class="fixed inset-0 z-[70] cursor-default"
          onMouseDown={(e) => { e.preventDefault(); close(); }}
        />
        <div
          class={`absolute top-[calc(100%+5px)] ${props.align === "right" ? "right-0" : "left-0"} ${props.width || "w-48"} max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-1.5 text-popover-foreground shadow-xl z-[80]`}
        >
          {typeof props.children === "function" ? props.children(close) : props.children}
        </div>
      </Show>
    </div>
  );
}

function LinkPopover(props) {
  const [url, setUrl] = createSignal("");
  let inputEl;

  onMount(() => {
    const quill = props.getQuill();
    if (quill) {
      const format = quill.getFormat(quill.getSelection() || { index: 0, length: 0 });
      if (typeof format.link === "string") setUrl(format.link);
    }
    inputEl?.focus();
  });

  const applyLink = () => {
    const quill = props.getQuill();
    if (!quill) return props.onClose();
    quill.focus();
    const raw = url().trim();
    if (!raw) {
      quill.format("link", false);
      return props.onClose();
    }
    const normalized = /^(https?|mailto|tel):/i.test(raw) ? raw : `https://${raw}`;
    quill.format("link", normalized);
    props.onClose();
  };

  return (
    <div class="absolute left-0 top-[calc(100%+5px)] z-[90] w-[min(320px,calc(100vw-32px))] rounded-xl border border-border bg-popover p-3 shadow-xl">
      <label class="mb-1.5 block text-[11px] font-medium text-muted-foreground">Link</label>
      <input
        ref={inputEl}
        value={url()}
        onInput={(e) => setUrl(e.currentTarget.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") { e.preventDefault(); applyLink(); }
          if (e.key === "Escape") { e.preventDefault(); props.onClose(); }
        }}
        placeholder="Paste or type a URL"
        class="h-9 w-full rounded-md border border-input bg-background px-2.5 text-xs text-foreground outline-none focus:border-primary"
      />
      <div class="mt-3 flex justify-end gap-2">
        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            const quill = props.getQuill();
            quill?.focus();
            quill?.format("link", false);
            props.onClose();
          }}
          class="h-8 rounded-md px-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          Remove
        </button>
        <button
          type="button"
          onMouseDown={(e) => { e.preventDefault(); applyLink(); }}
          class="h-8 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          Apply
        </button>
      </div>
    </div>
  );
}

export default function DocsEditor(props) {
  let editorEl;
  let imageInputEl;
  let quill = null;
  let copiedFormats = null;
  let searchFrom = 0;

  const [uploading, setUploading] = createSignal(false);
  /* Reflects what the caret is sitting in: "UI font" normally, or the family
     a legacy document pinned before the picker was removed. */
  const [fontLabel, setFontLabel] = createSignal("UI font");
  const [sizeInput, setSizeInput] = createSignal("14");
  const [formats, setFormats] = createSignal(EMPTY_FORMATS);
  const [painterArmed, setPainterArmed] = createSignal(false);
  const [linkOpen, setLinkOpen] = createSignal(false);
  const [findOpen, setFindOpen] = createSignal(false);
  const [findQuery, setFindQuery] = createSignal("");
  const [findResult, setFindResult] = createSignal("");
  const [zoom, setZoom] = createSignal(100);
  const [fullscreen, setFullscreen] = createSignal(false);
  // Computed eagerly, not passed as a function: React's useState treats a
  // function argument as a lazy initialiser, Solid's createSignal does not —
  // it would store the function itself as the value.
  const [stats, setStats] = createSignal(countStats(props.initialHtml));

  const getQuill = () => quill;

  const syncFormats = () => {
    if (!quill) return;
    try {
      const format = quill.getFormat(quill.getSelection() || { index: 0, length: 0 });
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
        const font = FONTS.find((c) => c.value === format.font);
        setFontLabel(font?.label || "UI font");
      } else {
        setFontLabel("UI font");
      }
    } catch {
      // Selection reads can race a teardown inside dialogs.
    }
  };

  const emitChange = () => {
    if (!quill) return;
    const content = quill.root.innerHTML;
    const rawText = quill.getText() || "";
    const trimmed = rawText.replace(/\n$/, "").trim();
    // Quill reports no text for embeds, so a body of only a pasted image was
    // treated as empty and emitted as "" — silently discarding it on save.
    const hasEmbed = /<(?:img|iframe|video|audio|hr|table)\b/i.test(content || "");
    const emitted = (trimmed || hasEmbed) ? content : "";
    setStats({
      words: trimmed ? trimmed.split(/\s+/).length : 0,
      characters: trimmed.length,
    });
    props.onChange?.(emitted);
  };

  onMount(() => {
    quill = new Quill(editorEl, {
      theme: "snow",
      modules: EDITOR_MODULES,
      placeholder: props.placeholder || "Start writing…",
    });

    if (props.initialHtml) {
      quill.clipboard.dangerouslyPasteHTML(props.initialHtml, "silent");
    }

    quill.on("selection-change", syncFormats);
    quill.on("text-change", () => { syncFormats(); emitChange(); });
    syncFormats();

    onCleanup(() => {
      quill?.off("selection-change", syncFormats);
      quill = null;
    });
  });

  createEffect(on(fullscreen, (isFull) => {
    if (!isFull) return;
    onCleanup(lockBodyScroll());
  }, { defer: true }));

  createEffect(on(findOpen, (isOpen) => {
    if (!isOpen) { setFindResult(""); setFindQuery(""); searchFrom = 0; }
  }, { defer: true }));

  // ── commands ─────────────────────────────────────────────────────────────
  const focusAndFormat = (name, value) => {
    if (!quill) return;
    quill.focus();
    quill.format(name, value, "user");
    syncFormats();
  };

  const toggleFormat = (name) => {
    if (!quill) return;
    const current = quill.getFormat(quill.getSelection() || { index: 0, length: 0 });
    focusAndFormat(name, !current[name]);
  };

  // Class only — no redundant inline colour. That used to also be written
  // here (quill.format on "color"/"background" via resolveThemeColor) as a
  // "belt and braces" guard, but it is what broke theme-following in the
  // first place: it wrote a frozen snapshot of whichever theme was active at
  // the moment of the click, and since an inline style always beats a class
  // selector, that snapshot silently overrode the class's live
  // hsl(var(--editor-ink-*)) the instant it was applied — the text just never
  // updated again on a theme switch. The class alone is correct:
  // .theme-rich-text already wraps the live .ql-editor (see the div below),
  // and the CSS rules for .ql-ink-*/.ql-hl-* are !important specifically so
  // they win over any stray inline colour, including ones already baked into
  // documents saved before this fix (index.css has the full account).
  const applyThemeInk = (color) => {
    if (!quill) return;
    quill.focus();
    quill.format("themeInk", color.value || false, "user");
    syncFormats();
  };

  const applyThemeHighlight = (highlight) => {
    if (!quill) return;
    quill.focus();
    quill.format("themeHighlight", highlight.value || false, "user");
    syncFormats();
  };

  const setBlockStyle = (header) => focusAndFormat("header", header || false);
  const toggleList = (kind) => {
    const current = formats().list;
    focusAndFormat("list", current === kind ? false : kind);
  };

  const changeIndent = (delta) => {
    if (!quill) return;
    const current = quill.getFormat(quill.getSelection() || { index: 0, length: 0 });
    const next = Math.max(0, Math.min(8, (current.indent || 0) + delta));
    focusAndFormat("indent", next || false);
  };

  const applySize = (value) => {
    const parsed = Number.parseInt(value, 10);
    if (Number.isNaN(parsed)) return;
    const clamped = Math.max(6, Math.min(200, parsed));
    setSizeInput(String(clamped));
    focusAndFormat("size", `${clamped}px`);
  };

  const stepSize = (delta) => applySize(String((Number.parseInt(sizeInput(), 10) || 14) + delta));

  const clearFormatting = () => {
    if (!quill) return;
    const selection = quill.getSelection();
    if (!selection) return;
    quill.removeFormat(selection.index, selection.length, "user");
    syncFormats();
  };

  const undo = () => { quill?.history.undo(); syncFormats(); };
  const redo = () => { quill?.history.redo(); syncFormats(); };
  const selectAll = () => { quill?.focus(); quill?.setSelection(0, quill.getLength()); syncFormats(); };

  const insertText = (text) => {
    if (!quill) return;
    quill.focus();
    const selection = quill.getSelection(true);
    quill.insertText(selection ? selection.index : quill.getLength(), text, "user");
    syncFormats();
  };

  const handlePainter = () => {
    if (!quill) return;
    if (painterArmed()) {
      const selection = quill.getSelection();
      if (selection && copiedFormats) {
        Object.entries(copiedFormats).forEach(([key, value]) => {
          quill.formatText(selection.index, selection.length, key, value, "user");
        });
      }
      setPainterArmed(false);
      syncFormats();
      return;
    }
    copiedFormats = quill.getFormat(quill.getSelection() || { index: 0, length: 0 });
    setPainterArmed(true);
  };

  const findNext = () => {
    if (!quill) return;
    const query = findQuery().trim();
    if (!query) { setFindResult(""); return; }
    const text = quill.getText();
    const haystack = text.toLocaleLowerCase();
    const needle = query.toLocaleLowerCase();
    let index = haystack.indexOf(needle, searchFrom);
    if (index === -1) index = haystack.indexOf(needle, 0);
    if (index === -1) { setFindResult("No matches"); return; }
    searchFrom = index + needle.length;
    quill.setSelection(index, query.length, "user");
    setFindResult(`Match at ${index}`);
  };

  const activeFont = () => getComputedStyle(document.documentElement).getPropertyValue("--font-body").trim() || "'GNUFreeMonoUI'";

  /*
   * ODT rather than HTML — see the note in the React editor. Minutes get opened
   * in a word processor, and .odt keeps headings, lists and emphasis editable.
   */
  const downloadOdtFile = () => {
    if (!quill) return;
    const title = props.title || "document";
    downloadOdt(quill.root.innerHTML, { title, filename: safeFilename(props.title) });
  };

  const downloadHtml = () => {
    if (!quill) return;
    const title = props.title || "document";
    const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{max-width:760px;margin:48px auto;padding:0 24px;font-family:${activeFont()};font-size:16px;line-height:1.65;color:#202124}img{max-width:100%}blockquote{border-left:3px solid #dadce0;margin-left:0;padding-left:16px;color:#5f6368}pre{white-space:pre-wrap;background:#f8f9fa;padding:12px;border-radius:8px}</style></head><body>${quill.root.innerHTML}</body></html>`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safeFilename(props.title)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const printDocument = () => {
    if (!quill) return;
    const title = props.title || "document";
    const popup = window.open("", "_blank", "noopener,noreferrer,width=900,height=700");
    if (!popup) return;
    popup.document.write(`<!doctype html><html><head><title>${title}</title><style>@page{margin:18mm}body{max-width:760px;margin:0 auto;font-family:${activeFont()};font-size:11pt;line-height:1.55;color:#111}img{max-width:100%;page-break-inside:avoid}blockquote{border-left:3px solid #aaa;margin-left:0;padding-left:14px}pre{white-space:pre-wrap}</style></head><body>${quill.root.innerHTML}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  };

  const copyPlainText = async () => {
    if (!quill) return;
    try { await navigator.clipboard.writeText(quill.getText()); } catch { /* denied */ }
  };

  const handleImage = async (event) => {
    const file = event.currentTarget.files?.[0];
    if (!file || !quill) return;
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const selection = quill.getSelection(true);
        quill.insertEmbed(selection ? selection.index : quill.getLength(), "image", reader.result, "user");
        setUploading(false);
      };
      reader.readAsDataURL(file);
    } catch {
      setUploading(false);
    }
    event.currentTarget.value = "";
  };

  const f = () => formats();

  const handleShellKeyDown = (event) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && event.key.toLowerCase() === "s") {
      event.preventDefault();
      props.onSave?.();
    }
    if (mod && event.key.toLowerCase() === "f") {
      event.preventDefault();
      setFindOpen(true);
    }
    if (event.key === "Escape" && fullscreen()) setFullscreen(false);
  };

  return (
    <div
      class={`docs-editor ${fullscreen() ? "fixed inset-0 z-[120] bg-background p-4 overflow-auto" : ""}`}
      onKeyDown={handleShellKeyDown}
    >
      <Show when={props.onTitleChange}>
        <input
          value={props.title || ""}
          onInput={(e) => props.onTitleChange?.(e.currentTarget.value)}
          placeholder="Document title"
          aria-label="Document title"
          class="mb-2 w-full bg-transparent text-lg font-display font-bold text-foreground outline-none placeholder:text-muted-foreground"
        />
      </Show>

      <div class="docs-toolbar relative flex flex-wrap items-center gap-0.5 rounded-t-lg border border-border bg-card px-2 py-1.5">
        <ToolButton title="Undo (Ctrl+Z)" onClick={undo}><Undo2 class="h-4 w-4" /></ToolButton>
        <ToolButton title="Redo (Ctrl+Y)" onClick={redo}><Redo2 class="h-4 w-4" /></ToolButton>
        <ToolButton title="Format painter" active={painterArmed()} onClick={handlePainter}><Paintbrush class="h-4 w-4" /></ToolButton>
        <ToolbarDivider />

        {/*
          * No font picker: the document always uses the UI font.
          *
          * Minutes are read inside the app, where the reader has already chosen
          * a typeface in Settings. Letting the author pin a different family
          * per-span meant a document could ignore that choice entirely, and it
          * pulled a second face into a page that had deliberately loaded one.
          * The size, spacing and emphasis controls are unaffected.
          *
          * The Quill font attributor stays registered in quill-setup.js so any
          * document already carrying a font span still renders as written.
          */}
        <span class="tech-label px-2 text-muted-foreground" title="Documents use the interface font">
          {fontLabel()}
        </span>

        <ToolButton title="Decrease font size" onClick={() => stepSize(-1)}>−</ToolButton>
        <input
          value={sizeInput()}
          onInput={(e) => setSizeInput(e.currentTarget.value)}
          onBlur={(e) => applySize(e.currentTarget.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); applySize(e.currentTarget.value); } }}
          aria-label="Font size"
          class="h-7 w-10 rounded border border-input bg-background text-center text-xs tabular-nums outline-none focus:border-primary"
        />
        <ToolButton title="Increase font size" onClick={() => stepSize(1)}>+</ToolButton>
        <ToolbarDivider />

        <ToolButton title="Bold (Ctrl+B)" active={f().bold} onClick={() => toggleFormat("bold")}><Bold class="h-4 w-4" /></ToolButton>
        <ToolButton title="Italic (Ctrl+I)" active={f().italic} onClick={() => toggleFormat("italic")}><Italic class="h-4 w-4" /></ToolButton>
        <ToolButton title="Underline (Ctrl+U)" active={f().underline} onClick={() => toggleFormat("underline")}><Underline class="h-4 w-4" /></ToolButton>
        <ToolButton title="Strikethrough" active={f().strike} onClick={() => toggleFormat("strike")}><Strikethrough class="h-4 w-4" /></ToolButton>

        <Dropdown width="w-52" trigger={<Palette class="h-4 w-4" />}>
          {(close) => (
            <Index each={THEME_TEXT_COLORS}>
              {(color) => (
                <MenuItem
                  label={color().label}
                  active={f().color === color().value}
                  icon={<span class="docs-color-line" style={{ background: color().token ? `hsl(var(${color().token}))` : "currentColor" }} />}
                  onClick={() => { applyThemeInk(color()); close(); }}
                />
              )}
            </Index>
          )}
        </Dropdown>

        <Dropdown width="w-56" trigger={<Highlighter class="h-4 w-4" />}>
          {(close) => (
            <Index each={THEME_HIGHLIGHTS}>
              {(hl) => (
                <MenuItem
                  label={hl().label}
                  active={f().background === hl().value}
                  icon={<span class="docs-color-line" style={{ background: hl().token ? `hsl(var(${hl().token}))` : "transparent" }} />}
                  onClick={() => { applyThemeHighlight(hl()); close(); }}
                />
              )}
            </Index>
          )}
        </Dropdown>

        <ToolbarDivider />
        <ToolButton title="Superscript" active={f().script === "super"} onClick={() => focusAndFormat("script", f().script === "super" ? false : "super")}><Superscript class="h-4 w-4" /></ToolButton>
        <ToolButton title="Subscript" active={f().script === "sub"} onClick={() => focusAndFormat("script", f().script === "sub" ? false : "sub")}><Subscript class="h-4 w-4" /></ToolButton>
        <ToolButton title="Bullet list" active={f().list === "bullet"} onClick={() => toggleList("bullet")}><List class="h-4 w-4" /></ToolButton>
        <ToolButton title="Numbered list" active={f().list === "ordered"} onClick={() => toggleList("ordered")}><ListOrdered class="h-4 w-4" /></ToolButton>
        <ToolButton title="Checklist" active={f().list === "unchecked"} onClick={() => toggleList("unchecked")}><ListChecks class="h-4 w-4" /></ToolButton>
        <ToolButton title="Decrease indent" onClick={() => changeIndent(-1)}><IndentDecrease class="h-4 w-4" /></ToolButton>
        <ToolButton title="Increase indent" onClick={() => changeIndent(1)}><IndentIncrease class="h-4 w-4" /></ToolButton>
        <ToolButton title="Block quote" active={f().blockquote} onClick={() => toggleFormat("blockquote")}><Quote class="h-4 w-4" /></ToolButton>
        <ToolButton title="Code block" active={f().codeBlock} onClick={() => focusAndFormat("code-block", !f().codeBlock)}><Code class="h-4 w-4" /></ToolButton>

        <ToolbarDivider />
        <div class="relative shrink-0">
          <ToolButton title="Insert or edit link" active={linkOpen()} onClick={() => setLinkOpen((v) => !v)}><Link2 class="h-4 w-4" /></ToolButton>
          <Show when={linkOpen()}>
            <LinkPopover getQuill={getQuill} onClose={() => setLinkOpen(false)} />
          </Show>
        </div>
        <ToolButton title="Insert image" disabled={uploading()} onClick={() => imageInputEl?.click()}><ImageIcon class="h-4 w-4" /></ToolButton>
        <input ref={imageInputEl} type="file" accept="image/*" class="hidden" onChange={handleImage} />
        <ToolButton title="Clear formatting" onClick={clearFormatting}><Eraser class="h-4 w-4" /></ToolButton>

        <ToolbarDivider />
        <ToolButton title="Find in document (Ctrl+F)" active={findOpen()} onClick={() => setFindOpen((v) => !v)}><Search class="h-4 w-4" /></ToolButton>
        <ToolButton title="Zoom out" onClick={() => setZoom((z) => ZOOM_LEVELS[Math.max(0, ZOOM_LEVELS.indexOf(z) - 1)] ?? z)}><ZoomOut class="h-4 w-4" /></ToolButton>
        <Dropdown width="w-24" trigger={<span class="w-9 text-center text-[11px] tabular-nums">{zoom()}%</span>}>
          {(close) => (
            <Index each={ZOOM_LEVELS}>
              {(level) => <MenuItem label={`${level()}%`} active={zoom() === level()} onClick={() => { setZoom(level()); close(); }} />}
            </Index>
          )}
        </Dropdown>
        <ToolButton title="Zoom in" onClick={() => setZoom((z) => ZOOM_LEVELS[Math.min(ZOOM_LEVELS.length - 1, ZOOM_LEVELS.indexOf(z) + 1)] ?? z)}><ZoomIn class="h-4 w-4" /></ToolButton>

        <Dropdown align="right" width="w-52" trigger={<span class="text-xs">Document formatting<ChevronDown class="ml-1 inline h-3 w-3" /></span>}>
          {(close) => (
            <>
              <MenuItem label="Normal text" active={!f().header} onClick={() => { setBlockStyle(false); close(); }} />
              <MenuItem label="Heading 1" active={f().header === 1} onClick={() => { setBlockStyle(1); close(); }} />
              <MenuItem label="Heading 2" active={f().header === 2} onClick={() => { setBlockStyle(2); close(); }} />
              <MenuItem label="Heading 3" active={f().header === 3} onClick={() => { setBlockStyle(3); close(); }} />
              <MenuDivider />
              <MenuItem label="Align left" active={!f().align} onClick={() => { focusAndFormat("align", false); close(); }} />
              <MenuItem label="Align center" active={f().align === "center"} onClick={() => { focusAndFormat("align", "center"); close(); }} />
              <MenuItem label="Align right" active={f().align === "right"} onClick={() => { focusAndFormat("align", "right"); close(); }} />
              <MenuItem label="Justify" active={f().align === "justify"} onClick={() => { focusAndFormat("align", "justify"); close(); }} />
              <MenuDivider />
              <Index each={LINE_HEIGHTS}>
                {(height) => (
                  <MenuItem label={`Line spacing ${height()}`} onClick={() => { focusAndFormat("lineheight", height()); close(); }} />
                )}
              </Index>
            </>
          )}
        </Dropdown>

        <Dropdown align="right" width="w-52" trigger={<span class="text-xs">File<ChevronDown class="ml-1 inline h-3 w-3" /></span>}>
          {(close) => (
            <>
              <Show when={props.onSave}>
                <MenuItem label="Save" icon={<Save class="h-3.5 w-3.5" />} onClick={() => { props.onSave?.(); close(); }} />
                <MenuDivider />
              </Show>
              <MenuItem label="Select all" onClick={() => { selectAll(); close(); }} />
              <MenuItem label="Copy plain text" onClick={() => { copyPlainText(); close(); }} />
              <MenuDivider />
              <MenuItem label="Current date" onClick={() => { insertText(new Date().toLocaleDateString()); close(); }} />
              <MenuItem label="Current time" onClick={() => { insertText(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })); close(); }} />
              <MenuDivider />
              <MenuItem label="Download as ODT" icon={<Download class="h-3.5 w-3.5" />} onClick={() => { downloadOdtFile(); close(); }} />
              <MenuItem label="Print" icon={<Printer class="h-3.5 w-3.5" />} onClick={() => { printDocument(); close(); }} />
            </>
          )}
        </Dropdown>

        <ToolButton
          title={fullscreen() ? "Exit full screen" : "Full screen"}
          onClick={() => setFullscreen((v) => !v)}
          class="ml-auto"
        >
          <Show when={fullscreen()} fallback={<Maximize2 class="h-4 w-4" />}><Minimize2 class="h-4 w-4" /></Show>
        </ToolButton>
      </div>

      <Show when={findOpen()}>
        <div class="flex items-center gap-2 border-x border-border bg-muted/40 px-2 py-1.5">
          <Search class="h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={findQuery()}
            onInput={(e) => setFindQuery(e.currentTarget.value)}
            onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); findNext(); } }}
            placeholder="Find"
            aria-label="Find in document"
            class="h-7 flex-1 rounded border border-input bg-background px-2 text-xs outline-none focus:border-primary"
          />
          <span class="text-[10px] text-muted-foreground">{findResult()}</span>
          <ToolButton title="Close find" onClick={() => setFindOpen(false)}><X class="h-3.5 w-3.5" /></ToolButton>
        </div>
      </Show>

      <div
        class="docs-editor-content theme-rich-text rounded-b-lg border border-t-0 border-border"
        style={{ "min-height": props.minHeight || "180px", zoom: `${zoom()}%` }}
      >
        <div ref={editorEl} />
      </div>

      <div class="mt-1.5 flex items-center gap-3 text-[10px] text-muted-foreground">
        <span>{stats().words} words</span>
        <span>{stats().characters} characters</span>
        <Show when={props.saving}><span>Saving…</span></Show>
        <Show when={props.saved && !props.saving}><span>Saved</span></Show>
      </div>
    </div>
  );
}
