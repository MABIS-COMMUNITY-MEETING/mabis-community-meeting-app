import { useEffect } from "react";
import { useJapaneseText } from "@/lib/japanese-text-preference";
import { translateUiText } from "@/lib/japanese-ui-translations";

const COMPANION_ATTRIBUTE = "data-ja-companion";
const AUTO_ATTRIBUTE = "data-ja-auto";
const LAYOUT_ATTRIBUTE = "data-ja-layout";
const ORIGINAL_PLACEHOLDER = "data-ja-original-placeholder";
const ORIGINAL_TITLE = "data-ja-original-title";
const ORIGINAL_ARIA = "data-ja-original-aria";
const ORIGINAL_OPTION = "data-ja-original-option";

const SKIP_SELECTOR = [
  "[data-ja-skip]",
  "[data-japanese-manual]",
  "[contenteditable='true']",
  ".ql-editor",
  ".theme-rich-text",
  ".docs-editor-content",
  "script",
  "style",
  "code",
  "pre",
].join(",");

const BLOCK_TAGS = new Set(["DIV", "P", "H1", "H2", "H3", "H4", "H5", "H6", "LI", "TD", "TH", "DT", "DD"]);

function shouldSkip(element) {
  return !(element instanceof HTMLElement)
    || Boolean(element.closest(SKIP_SELECTOR));
}

function directText(element) {
  const parts = Array.from(element.childNodes)
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  return parts.length === 1 ? parts[0] : "";
}

function annotateText(element) {
  if (shouldSkip(element)) return;
  const text = directText(element);
  const japanese = translateUiText(text);
  if (!japanese || japanese === text) {
    if (element.hasAttribute(AUTO_ATTRIBUTE)) {
      element.removeAttribute(COMPANION_ATTRIBUTE);
      element.removeAttribute(AUTO_ATTRIBUTE);
      element.removeAttribute(LAYOUT_ATTRIBUTE);
    }
    return;
  }
  element.setAttribute(COMPANION_ATTRIBUTE, japanese);
  element.setAttribute(AUTO_ATTRIBUTE, "text");
  element.setAttribute(LAYOUT_ATTRIBUTE, BLOCK_TAGS.has(element.tagName) ? "block" : "inline");
}

function annotateControl(element) {
  if (shouldSkip(element)) return;

  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
    const original = element.getAttribute(ORIGINAL_PLACEHOLDER) || element.getAttribute("placeholder");
    const japanese = translateUiText(original);
    if (original && japanese) {
      if (!element.hasAttribute(ORIGINAL_PLACEHOLDER)) element.setAttribute(ORIGINAL_PLACEHOLDER, original);
      element.setAttribute("placeholder", `${original} / ${japanese}`);
    }
  }

  if (element instanceof HTMLOptionElement) {
    const original = element.getAttribute(ORIGINAL_OPTION) || element.textContent.trim();
    const japanese = translateUiText(original);
    if (original && japanese) {
      if (!element.hasAttribute(ORIGINAL_OPTION)) element.setAttribute(ORIGINAL_OPTION, original);
      element.textContent = `${original} / ${japanese}`;
    }
  }

  const originalTitle = element.getAttribute(ORIGINAL_TITLE) || element.getAttribute("title");
  const titleJapanese = translateUiText(originalTitle);
  if (originalTitle && titleJapanese) {
    if (!element.hasAttribute(ORIGINAL_TITLE)) element.setAttribute(ORIGINAL_TITLE, originalTitle);
    element.setAttribute("title", `${originalTitle} / ${titleJapanese}`);
  }

  const originalAria = element.getAttribute(ORIGINAL_ARIA) || element.getAttribute("aria-label");
  const ariaJapanese = translateUiText(originalAria);
  if (originalAria && ariaJapanese) {
    if (!element.hasAttribute(ORIGINAL_ARIA)) element.setAttribute(ORIGINAL_ARIA, originalAria);
    element.setAttribute("aria-label", `${originalAria} / ${ariaJapanese}`);
  }
}

function annotateTree(root) {
  if (!(root instanceof Element) && root !== document.body) return;
  const elements = root === document.body
    ? [document.body, ...document.body.querySelectorAll("*")]
    : [root, ...root.querySelectorAll("*")];
  elements.forEach((element) => {
    annotateText(element);
    annotateControl(element);
  });
}

function cleanup() {
  document.querySelectorAll(`[${AUTO_ATTRIBUTE}]`).forEach((element) => {
    element.removeAttribute(COMPANION_ATTRIBUTE);
    element.removeAttribute(AUTO_ATTRIBUTE);
    element.removeAttribute(LAYOUT_ATTRIBUTE);
  });
  document.querySelectorAll(`[${ORIGINAL_PLACEHOLDER}]`).forEach((element) => {
    element.setAttribute("placeholder", element.getAttribute(ORIGINAL_PLACEHOLDER));
    element.removeAttribute(ORIGINAL_PLACEHOLDER);
  });
  document.querySelectorAll(`[${ORIGINAL_TITLE}]`).forEach((element) => {
    element.setAttribute("title", element.getAttribute(ORIGINAL_TITLE));
    element.removeAttribute(ORIGINAL_TITLE);
  });
  document.querySelectorAll(`[${ORIGINAL_ARIA}]`).forEach((element) => {
    element.setAttribute("aria-label", element.getAttribute(ORIGINAL_ARIA));
    element.removeAttribute(ORIGINAL_ARIA);
  });
  document.querySelectorAll(`[${ORIGINAL_OPTION}]`).forEach((element) => {
    element.textContent = element.getAttribute(ORIGINAL_OPTION);
    element.removeAttribute(ORIGINAL_OPTION);
  });
}

export default function JapaneseUiCompanion() {
  const enabled = useJapaneseText();

  useEffect(() => {
    if (!enabled) {
      cleanup();
      return undefined;
    }

    let frame = 0;
    const pending = new Set([document.body]);
    const flush = () => {
      frame = 0;
      const roots = Array.from(pending);
      pending.clear();
      roots.forEach(annotateTree);
    };
    const schedule = (element) => {
      if (element) pending.add(element);
      if (!frame) frame = requestAnimationFrame(flush);
    };

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        if (record.type === "characterData") {
          schedule(record.target.parentElement);
          return;
        }
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) schedule(node);
          else if (node.parentElement) schedule(node.parentElement);
        });
      });
    });

    schedule(document.body);
    observer.observe(document.body, { childList: true, characterData: true, subtree: true });

    return () => {
      observer.disconnect();
      if (frame) cancelAnimationFrame(frame);
      cleanup();
    };
  }, [enabled]);

  return enabled
    ? <span lang="ja" data-ja-skip className="sr-only" aria-hidden="true">日本語</span>
    : null;
}
