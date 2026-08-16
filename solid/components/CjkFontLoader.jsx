import { onMount, onCleanup } from "solid-js";

/*
 * Maple Mono CJK loader — 1:1 port of src/components/CjkFontLoader.jsx.
 *
 * The CJK face is ~5 MB, so it is never in the critical path. The stylesheet is
 * appended only once something on the page actually declares a CJK script,
 * which for this app means the Japanese companion layer being switched on. If
 * nothing CJK ever renders, nothing is ever downloaded.
 */
export const MAPLE_MONO_CJK_STYLESHEET =
  "https://fontsapi.zeoseven.com/442/main/result.css";

const CJK_SELECTOR = [
  ':lang(ja)',
  ':lang(zh)',
  ':lang(zh-CN)',
  ':lang(zh-TW)',
  ':lang(ko)',
  '[data-script="ja"]',
  '[data-script="zh"]',
  '[data-script="ko"]',
  '.font-multilingual',
  '.font-cjk',
].join(",");

function ensureMapleMonoCjk() {
  if (document.getElementById("maple-mono-cjk-styles")) return;

  const stylesheet = document.createElement("link");
  stylesheet.id = "maple-mono-cjk-styles";
  stylesheet.rel = "stylesheet";
  stylesheet.href = MAPLE_MONO_CJK_STYLESHEET;
  stylesheet.crossOrigin = "anonymous";
  document.head.appendChild(stylesheet);
}

export default function CjkFontLoader() {
  onMount(() => {
    const loadWhenNeeded = () => {
      if (!document.querySelector(CJK_SELECTOR)) return false;
      ensureMapleMonoCjk();
      return true;
    };

    if (loadWhenNeeded() || typeof MutationObserver === "undefined") return;

    // Once the font is requested the observer has no further job, so it
    // disconnects itself rather than watching the whole subtree forever.
    const observer = new MutationObserver(() => {
      if (loadWhenNeeded()) observer.disconnect();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-script", "lang"],
      childList: true,
      subtree: true,
    });

    onCleanup(() => observer.disconnect());
  });

  return null;
}
