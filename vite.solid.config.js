import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
import base44 from "@base44/vite-plugin";
import path from "node:path";

/*
 * Parallel Solid build.
 *
 * The live React app (vite.config.js) is untouched and keeps shipping while
 * this grows to parity. Two reasons this is a separate config rather than a
 * flag on the main one:
 *
 *  1. @vitejs/plugin-react and vite-plugin-solid both claim .jsx and install
 *     incompatible JSX transforms. Solid compiles JSX to real DOM operations,
 *     React to createElement calls; one file cannot satisfy both.
 *  2. @base44/vite-plugin IS included, but with visualEditAgent off — see
 *     base44ForSolid below and the migration notes in docs/solid-migration.md.
 *
 * Everything under src/lib and src/styles is framework-agnostic and is shared
 * by BOTH builds from its original location — no fork, no copy to drift.
 */
/*
 * The Base44 plugin, minus the one thing that is incompatible with this build.
 *
 * Its `config` hook contributes `resolve.alias = { "@/": "/src/" }`. That path
 * is filesystem-root-relative, and Vite gives a plugin-contributed alias
 * precedence over the one below, so every `@/lib/*` import resolved to
 * `/src/lib/*` and the build died on "Could not load /src/index.css". Stripping
 * that single key keeps everything the plugin is actually wanted for:
 *
 *   · analyticsTracker  — a production <script> injection the React build ships
 *     and this one was silently missing.
 *   · error overlay / sandbox mount / HMR notifier — dev-server parity inside
 *     the Base44 editor.
 *
 * visualEditAgent stays OFF. It is dev-only in the first place, but its JSX
 * transform derives a file path with `parts.lastIndexOf("src")`, and these
 * files live under `solid/` — so every one of them would report a bare
 * "Home.jsx" and the editor could not map an edit back to a file.
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
  configFile: false,
  root: path.resolve(process.cwd(), "solid"),
  // Fonts, logo and manifest are shared with the React build rather than copied.
  publicDir: path.resolve(process.cwd(), "public"),
  plugins: [base44ForSolid({ analyticsTracker: true }), solid()],
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
      "~": path.resolve(process.cwd(), "solid"),
    },
  },
  build: {
    outDir: path.resolve(process.cwd(), "dist-solid"),
    emptyOutDir: true,
    manifest: true,
  },
});
