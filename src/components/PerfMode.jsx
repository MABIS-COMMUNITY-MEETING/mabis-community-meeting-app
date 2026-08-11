import { useEffect } from "react";

/**
 * Detects browsers/platforms where compositing-heavy effects are expensive
 * (Firefox, Linux, low core counts) and flags the document with `perf-lite`
 * so CSS can drop blur, grain animation and other costly layers.
 */
export default function PerfMode() {
  useEffect(() => {
    const ua = navigator.userAgent;
    const isFirefox = ua.includes("Firefox");
    const isLinux = /Linux|X11|CrOS/.test(navigator.platform || ua) && !/Android/.test(ua);
    const lowCores = (navigator.hardwareConcurrency || 8) <= 4;
    if (isFirefox || isLinux || lowCores) {
      document.documentElement.classList.add("perf-lite");
      if (isFirefox) document.documentElement.classList.add("is-firefox");
    }
    return () => document.documentElement.classList.remove("perf-lite", "is-firefox");
  }, []);

  return null;
}