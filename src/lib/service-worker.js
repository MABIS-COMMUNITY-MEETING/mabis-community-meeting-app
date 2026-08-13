export function registerServiceWorker() {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  if (window.location.protocol !== "https:" && window.location.hostname !== "localhost") return;

  const register = () => {
    navigator.serviceWorker.register("/sw.js", {
      scope: "/",
      updateViaCache: "none",
    }).catch(() => {});
  };

  if (document.readyState === "complete") {
    if ("requestIdleCallback" in window) window.requestIdleCallback(register, { timeout: 4000 });
    else window.setTimeout(register, 600);
    return;
  }

  window.addEventListener("load", () => {
    if ("requestIdleCallback" in window) window.requestIdleCallback(register, { timeout: 4000 });
    else window.setTimeout(register, 600);
  }, { once: true });
}
