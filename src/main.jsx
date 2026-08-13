import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { applyTheme, getStoredTheme, getStoredCustomColors, applyCustomColors, applyFont, getStoredFont } from '@/lib/themes';
import { applyAnimationPreference } from '@/lib/motion-preference';

async function bootstrap() {
  // Every visual preference is resolved before React paints the loading screen.
  // Previously the loader mounted in the CSS default font, then PrefsSync
  // replaced it with the saved font after authentication, causing a visible
  // typeface flash.
  applyAnimationPreference();

  const storedTheme = getStoredTheme();
  applyTheme(storedTheme);
  const customColors = getStoredCustomColors();
  if (customColors) applyCustomColors(customColors.primary, customColors.secondary);

  const fontLoad = applyFont(getStoredFont());
  await Promise.race([
    fontLoad,
    new Promise((resolve) => window.setTimeout(resolve, 2200)),
  ]);
  document.documentElement.classList.add('ui-font-ready');

  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  );

  // Installing after load keeps precache traffic out of the critical path.
  // The worker is a progressive enhancement and never intercepts Base44 APIs.
  if (import.meta.env.PROD && "serviceWorker" in navigator) {
    const register = () => {
      const run = () => navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => {});
      if ("requestIdleCallback" in window) {
        window.requestIdleCallback(run, { timeout: 3000 });
      } else {
        window.setTimeout(run, 1000);
      }
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }
}

bootstrap();