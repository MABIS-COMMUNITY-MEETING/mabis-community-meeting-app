import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import base44 from "@base44/vite-plugin";
import path from "node:path";
import { lazyRealtimeAliases } from "./scripts/lazy-realtime-aliases.mjs";

/*
 * The shipped app is the Solid build.
 *
 * This config used to build the React app in src/. The UI now lives in solid/,
 * and src/ keeps the framework-agnostic foundation both builds shared — lib/,
 * api/, styles/ — which the Solid components import from in 35 places. That
 * layer is not React and does not move.
 *
 * vite.solid.config.js still exists and builds the same source to dist-solid/;
 * it is the harness the parity checks run against. This config is the one that
 * produces dist/, which is what gets served.
 */

/*
 * The Base44 plugin, minus the one thing incompatible with this build.
 *
 * Its `config` hook contributes `resolve.alias = { "@/": "/src/" }`, which is
 * filesystem-root-relative and takes precedence over the alias below, so every
 * `@/lib/*` import resolved to `/src/lib/*` and the build died on "Could not
 * load /src/index.css". Stripping that single key keeps what the plugin is
 * actually wanted for: the production analytics injection, and the error
 * overlay / sandbox mount / HMR notifier in dev.
 *
 * visualEditAgent stays OFF. It is dev-only regardless, and its JSX transform
 * derives a path with `parts.lastIndexOf("src")` — these files live under
 * solid/, so each would report a bare "Home.jsx" and the editor could not map
 * an edit back to a file.
 */
function base44ForSolid(options) {
  return base44(options).map((plugin) => {
    if (plugin?.name !== "base44" || typeof plugin.config !== "function") return plugin;
    const originalConfig = plugin.config;
    return {
      ...plugin,
      config: (...args) => {
        const contributed = originalConfig(...args);
        if (contributed?.resolve?.alias) delete contributed.resolve.alias["@/"];
        return contributed;
      },
    };
  });
}

export default defineConfig({
  logLevel: "error",
  root: path.resolve(process.cwd(), "solid"),
  // Fonts, logo and manifest are shared rather than copied.
  publicDir: path.resolve(process.cwd(), "public"),
  plugins: [
    base44ForSolid({
      hmrNotifier: true,
      navigationNotifier: true,
      analyticsTracker: true,
      visualEditAgent: false,
    }),
    solid(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "~": path.resolve(process.cwd(), "solid"),
      ...lazyRealtimeAliases(),
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), "dist"),
    emptyOutDir: true,
    // The service-worker generator reads Vite's exact hashed entry files so it
    // can precache a revision-correct app shell without a Workbox runtime.
    manifest: true,
  },
});
