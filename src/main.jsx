import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { applyTheme, getStoredTheme, getStoredCustomColors, applyCustomColors, applyFont, getStoredFont } from '@/lib/themes';
import { applyAnimationPreference } from '@/lib/motion-preference';
import { applyNetworkPreference, startNetworkMonitoring } from '@/lib/network-policy';
import { registerServiceWorker } from '@/lib/service-worker';

async function bootstrap() {
  // Every visual preference is resolved before React paints the loading screen.
  // Previously the loader mounted in the CSS default font, then PrefsSync
  // replaced it with the saved font after authentication, causing a visible
  // typeface flash.
  const network = applyNetworkPreference({ notify: false });
  startNetworkMonitoring();
  applyAnimationPreference();

  const storedTheme = getStoredTheme();
  await applyTheme(storedTheme);
  const customColors = getStoredCustomColors();
  if (customColors) applyCustomColors(customColors.primary, customColors.secondary);

  const fontLoad = applyFont(getStoredFont());
  await Promise.race([
    fontLoad,
    // A slow connection must never stare at an empty root while a decorative
    // webfont downloads. The compact fallback is metrically close enough for
    // the first paint; the selected face settles in when its bytes arrive.
    new Promise((resolve) => window.setTimeout(resolve, network.constrained ? 280 : 950)),
  ]);
  document.documentElement.classList.add('ui-font-ready');

  ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
  );
  registerServiceWorker();
}

bootstrap();