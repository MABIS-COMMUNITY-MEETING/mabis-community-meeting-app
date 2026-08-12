import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import { applyTheme, getStoredTheme, getStoredCustomColors, applyCustomColors } from '@/lib/themes';
import { applyAnimationPreference } from '@/lib/motion-preference';

// Saved motion preference applies before first paint, so nothing animates in
// on load when animations are turned off.
applyAnimationPreference();

// Apply saved theme before first paint so every page (including Splash) is themed
const _storedTheme = getStoredTheme();
applyTheme(_storedTheme);
const _customColors = getStoredCustomColors();
if (_customColors) applyCustomColors(_customColors.primary, _customColors.secondary);

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)