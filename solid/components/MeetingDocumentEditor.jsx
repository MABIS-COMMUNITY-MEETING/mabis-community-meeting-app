import { createSignal, onMount, Show } from "solid-js";
import {
  Bold, Italic, Underline, List, ListOrdered, Quote, Link2,
  Eraser, Undo2, Redo2, Save, Palette, Highlighter,
} from "lucide-solid";

function ToolButton(props) {
  return (
    <button
      type="button"
      title={props.title}
      aria-label={props.title}
      disabled={props.disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        if (!props.disabled) props.onClick?.();
      }}
      class="docs-tool-btn"
    >
      {props.children}
    </button>
  );
}

function safeUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  if (/^(?:https?:|mailto:|tel:|\/|#)/i.test(value)) return value;
  return `https://${value}`;
}

function sanitizeDocumentHtml(html) {
  if (!html || typeof document === "undefined") return html || "";
  const template = document.createElement("template");
  template.innerHTML = html;

  template.content.querySelectorAll("script,style,iframe,object,embed,form,input,button,textarea,select,meta,link").forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((node) => {
    for (const attribute of [...node.attributes]) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value;
      if (name.startsWith("on")) node.removeAttribute(attribute.name);
      if ((name === "href" || name === "src") && /^\s*(?:javascript|data:text\/html)/i.test(value)) {
        node.removeAttribute(attribute.name);
      }
      if (name === "style" && /(?:expression\s*\(|url\s*\(\s*['"]?javascript:)/i.test(value)) {
        node.removeAttribute(attribute.name);
      }
    }
    if (node.tagName === "A" && node.hasAttribute("href")) {
      node.setAttribute("rel", "noopener noreferrer");
    }
  });
  return template.innerHTML;
}

/**
 * Meeting-specific flowing document editor.
 *
 * It intentionally does not import DocsEditor or Quill. Meeting Mode needs a
 * responsive notes surface immediately; importing and initialising the full
 * Discussion editor there converted saved HTML into a Delta on the main thread
 * and was the remaining freeze. This keeps the same document/tool-bar visual
 * contract using the browser's native editing engine.
 */
export default function MeetingDocumentEditor(props) {
  let editorEl;
  let savedRange = null;
  const [unrestrictedColors, setUnrestrictedColors] = createSignal(false);

  const emitChange = () => {
    if (!editorEl) return;
    const html = editorEl.innerHTML;
    const text = (editorEl.textContent || "").replace(/\u200B/g, "").trim();
    const hasEmbed = /<(?:img|video|audio|hr|table)\b/i.test(html);
    props.onChange?.(text || hasEmbed ? html : "");
  };

  const saveSelection = () => {
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (editorEl?.contains(range.commonAncestorContainer)) savedRange = range.cloneRange();
  };

  const restoreSelection = () => {
    if (!savedRange) return;
    const selection = window.getSelection?.();
    selection?.removeAllRanges();
    selection?.addRange(savedRange);
  };

  const runCommand = (command, value = null) => {
    editorEl?.focus();
    restoreSelection();
    document.execCommand(command, false, value);
    saveSelection();
    emitChange();
  };

  const applyClass = (className, style = {}) => {
    editorEl?.focus();
    restoreSelection();
    const selection = window.getSelection?.();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);
    if (range.collapsed || !editorEl?.contains(range.commonAncestorContainer)) return;

    const span = document.createElement("span");
    span.className = className;
    Object.assign(span.style, style);
    try {
      range.surroundContents(span);
    } catch {
      const fragment = range.extractContents();
      span.append(fragment);
      range.insertNode(span);
    }
    const next = document.createRange();
    next.selectNodeContents(span);
    selection.removeAllRanges();
    selection.addRange(next);
    savedRange = next.cloneRange();
    emitChange();
  };

  const addLink = () => {
    const raw = window.prompt("Paste or type a URL");
    const url = safeUrl(raw);
    if (url) runCommand("createLink", url);
  };

  const handlePaste = (event) => {
    const html = event.clipboardData?.getData("text/html");
    if (!html) return;
    event.preventDefault();
    runCommand("insertHTML", sanitizeDocumentHtml(html));
  };

  const handleLinkOpen = (event) => {
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || (event.type !== "dblclick" && !event.ctrlKey && !event.metaKey)) return;
    event.preventDefault();
    window.open(anchor.href, "_blank", "noopener,noreferrer");
  };

  onMount(() => {
    editorEl.innerHTML = sanitizeDocumentHtml(props.initialHtml || "");
    setUnrestrictedColors(document.body.classList.contains("mabis-unrestricted-document-colors"));
  });

  return (
    <div class="meeting-document-editor">
      <div
        class="docs-toolbar relative flex flex-wrap items-center gap-0.5 rounded-t-lg border border-border bg-card px-2 py-1.5"
        style={{ top: props.stickyTop || "0px" }}
        aria-label="Meeting notes formatting"
      >
        <ToolButton title="Undo (Ctrl+Z)" onClick={() => runCommand("undo")}><Undo2 class="h-4 w-4" /></ToolButton>
        <ToolButton title="Redo (Ctrl+Y)" onClick={() => runCommand("redo")}><Redo2 class="h-4 w-4" /></ToolButton>
        <span class="docs-toolbar-divider" aria-hidden="true" />
        <ToolButton title="Bold (Ctrl+B)" onClick={() => runCommand("bold")}><Bold class="h-4 w-4" /></ToolButton>
        <ToolButton title="Italic (Ctrl+I)" onClick={() => runCommand("italic")}><Italic class="h-4 w-4" /></ToolButton>
        <ToolButton title="Underline (Ctrl+U)" onClick={() => runCommand("underline")}><Underline class="h-4 w-4" /></ToolButton>
        <ToolButton title="Bullet list" onClick={() => runCommand("insertUnorderedList")}><List class="h-4 w-4" /></ToolButton>
        <ToolButton title="Numbered list" onClick={() => runCommand("insertOrderedList")}><ListOrdered class="h-4 w-4" /></ToolButton>
        <ToolButton title="Block quote" onClick={() => runCommand("formatBlock", "blockquote")}><Quote class="h-4 w-4" /></ToolButton>
        <ToolButton title="Insert or edit link" onClick={addLink}><Link2 class="h-4 w-4" /></ToolButton>
        <ToolButton title="Clear formatting" onClick={() => runCommand("removeFormat")}><Eraser class="h-4 w-4" /></ToolButton>
        <span class="docs-toolbar-divider" aria-hidden="true" />

        <ToolButton title="Theme primary text" onClick={() => applyClass("ql-ink-primary")}>
          <span class="meeting-color-dot bg-primary" /><Palette class="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Theme secondary text" onClick={() => applyClass("ql-ink-secondary")}>
          <span class="meeting-color-dot bg-secondary" /><Palette class="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Theme primary highlight" onClick={() => applyClass("ql-hl-primary")}>
          <span class="meeting-color-dot" style={{ background: "hsl(var(--editor-highlight-primary))" }} /><Highlighter class="h-4 w-4" />
        </ToolButton>
        <ToolButton title="Theme secondary highlight" onClick={() => applyClass("ql-hl-secondary")}>
          <span class="meeting-color-dot" style={{ background: "hsl(var(--editor-highlight-secondary))" }} /><Highlighter class="h-4 w-4" />
        </ToolButton>

        <Show when={unrestrictedColors()}>
          <label class="docs-native-color" title="Any MABIS text color" onPointerDown={saveSelection}>
            <Palette class="h-4 w-4" />
            <input
              type="color"
              aria-label="Any MABIS text color"
              onInput={(event) => applyClass("ql-user-paint-custom", { color: event.currentTarget.value })}
            />
          </label>
          <label class="docs-native-color" title="Any MABIS highlight color" onPointerDown={saveSelection}>
            <Highlighter class="h-4 w-4" />
            <input
              type="color"
              aria-label="Any MABIS highlight color"
              onInput={(event) => applyClass("ql-user-paint-custom", { "background-color": event.currentTarget.value })}
            />
          </label>
        </Show>

        <span class="ml-auto flex items-center gap-2 px-1 text-[11px] text-muted-foreground">
          <Show when={props.saving} fallback={<Show when={props.saved}>Saved</Show>}>Saving…</Show>
          <Show when={props.onSave}>
            <ToolButton title="Save meeting notes" onClick={() => props.onSave?.()}><Save class="h-4 w-4" /></ToolButton>
          </Show>
        </span>
      </div>

      <div
        ref={editorEl}
        class="meeting-document-surface theme-rich-text rounded-b-lg border border-t-0 border-border bg-card text-card-foreground"
        style={{ "min-height": props.minHeight || "360px" }}
        contenteditable
        role="textbox"
        aria-multiline="true"
        aria-label={props.title || "Meeting notes"}
        data-placeholder={props.placeholder || "Write meeting notes…"}
        onInput={emitChange}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onFocus={saveSelection}
        onPaste={handlePaste}
        onClick={handleLinkOpen}
        onDblClick={handleLinkOpen}
        onBlur={() => props.onSave?.()}
      />
    </div>
  );
}
