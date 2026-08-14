import { useEffect } from "react";

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
  useEffect(() => {
    const loadWhenNeeded = () => {
      if (!document.querySelector(CJK_SELECTOR)) return false;
      ensureMapleMonoCjk();
      return true;
    };

    if (loadWhenNeeded() || typeof MutationObserver === "undefined") return undefined;

    const observer = new MutationObserver(() => {
      if (loadWhenNeeded()) observer.disconnect();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["class", "data-script", "lang"],
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, []);

  return null;
}
