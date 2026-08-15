// Lightweight, heuristic OS detection for the analytics OS breakdown.
// navigator.userAgentData is the modern Client Hints source; userAgent is the
// fallback for browsers that don't support it yet.
export function detectOS() {
  if (typeof navigator === "undefined") return "Other";

  const uaPlatform = navigator.userAgentData?.platform;
  const ua = navigator.userAgent || "";
  const source = uaPlatform || ua;

  if (/android/i.test(ua)) return "Android";
  if (/iphone|ipad|ipod/i.test(ua)) return "iOS";
  if (/win/i.test(source)) return "Windows";
  if (/mac/i.test(source)) return "macOS";
  if (/cros/i.test(ua)) return "Chrome OS";
  if (/linux/i.test(source)) return "Linux";
  return "Other";
}
