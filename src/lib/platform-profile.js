export function detectedPlatform() {
  if (typeof navigator === "undefined") return "";
  return navigator.userAgentData?.platform
    || navigator.platform
    || navigator.userAgent
    || "";
}

export function isLinuxPlatform() {
  if (typeof navigator === "undefined") return false;
  const platform = detectedPlatform();
  return /linux/i.test(platform) && !/android/i.test(navigator.userAgent || "");
}

/**
 * Mark the real browser platform before the app mounts.
 *
 * A web page cannot call Linux schedulers, Vulkan or kernel APIs. This profile
 * therefore sticks to capabilities the browser intentionally exposes, and the
 * CSS it enables keeps the complete visual treatment while making active
 * transforms easier for Linux compositors to isolate.
 */
export function applyPlatformProfile() {
  if (typeof document === "undefined") return { linux: false };
  const linux = isLinuxPlatform();
  const root = document.documentElement;
  root.classList.toggle("platform-linux", linux);
  if (linux) root.dataset.platform = "linux";
  else delete root.dataset.platform;
  return { linux };
}
