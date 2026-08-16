import { createEffect, on, Show } from "solid-js";
import { Dynamic } from "solid-js/web";
import { Trash2 } from "lucide-solid";
import BlockToolbar from "~/components/notes/BlockToolbar";

const READ_CLASS = {
  p: "text-sm leading-relaxed text-foreground",
  h1: "font-display text-2xl sm:text-3xl font-semibold tracking-tight leading-tight",
  h2: "font-display text-lg sm:text-xl font-semibold tracking-tight leading-snug",
  ul: "list-disc pl-5 text-sm leading-relaxed space-y-1",
  ol: "list-decimal pl-5 text-sm leading-relaxed space-y-1",
};

/*
 * One block of the document — 1:1 port of src/components/notes/NoteBlock.jsx.
 * Read view by default; clicking turns exactly this block editable in place.
 *
 * The editable element's content is written IMPERATIVELY, never bound. Binding
 * innerHTML to block.html would make Solid overwrite the DOM while the user is
 * typing into it, resetting the caret on every keystroke. React had the same
 * constraint and solved it the same way — hence the eslint-disable on its
 * dependency array, which `on([editing, type])` expresses directly here:
 * Solid's `on` does not track reads inside the callback, so pulling
 * block.html out cannot re-trigger this effect.
 */
export default function NoteBlock(props) {
  let el;

  const tag = () => (READ_CLASS[props.block.type] ? props.block.type : "p");

  createEffect(on([() => props.editing, () => props.block.type], ([editing]) => {
    if (!editing || !el) return;
    const isList = props.block.type === "ul" || props.block.type === "ol";
    el.innerHTML = props.block.html || (isList ? "<li><br></li>" : "<br>");
    el.focus();
    const range = document.createRange();
    range.selectNodeContents(el);
    range.collapse(false);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }));

  const onKeyDown = (e) => {
    if (e.key === "Escape") { e.preventDefault(); el.blur(); }
    if (e.key === "Enter" && !e.shiftKey && tag() !== "ul" && tag() !== "ol") {
      e.preventDefault();
      props.onSplit(el.innerHTML);
    }
  };

  return (
    <Show
      when={props.block.type === "img"}
      fallback={
        <Show
          when={props.editing}
          fallback={
            <div
              onClick={() => props.onStartEdit()}
              class="group relative -mx-3 px-3 py-1.5 cursor-text border-l-2 border-transparent hover:border-primary/60 hover:bg-muted/40 transition-colors"
            >
              <Dynamic component={tag()} class={READ_CLASS[tag()]} innerHTML={props.block.html || "<br>"} />
              <span class="tech-label absolute right-2 top-1.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">EDIT</span>
            </div>
          }
        >
          <div class="relative -mx-3 px-3 py-1.5 border-l-2 border-primary bg-muted/30">
            <BlockToolbar
              type={props.block.type}
              onType={(t) => props.onType(t, el.innerHTML)}
              onCmd={(cmd) => document.execCommand(cmd)}
              onDelete={() => props.onDelete()}
              onDone={() => el.blur()}
            />
            <Dynamic
              component={tag()}
              ref={el}
              contentEditable
              onBlur={() => props.onCommit(el.innerHTML)}
              onKeyDown={onKeyDown}
              class={`${READ_CLASS[tag()]} outline-none min-h-[1.5em]`}
            />
          </div>
        </Show>
      }
    >
      <div class="group relative my-3">
        <img src={props.block.src} alt="" class="max-w-full border border-border" />
        <button
          onClick={() => props.onDelete()}
          title="Remove image"
          class="absolute top-2 right-2 h-8 w-8 flex items-center justify-center bg-background/90 border border-border text-destructive opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>
    </Show>
  );
}
