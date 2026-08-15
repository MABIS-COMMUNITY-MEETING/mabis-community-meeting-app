import { defineConfig } from "vite";
import solid from "vite-plugin-solid";
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
 *  2. @base44/vite-plugin runs visualEditAgent, which instruments React JSX.
 *     Pointing it at Solid output is untested, so it is deliberately absent
 *     here — see the migration notes in docs/solid-migration.md.
 *
 * Everything under src/lib and src/styles is framework-agnostic and is shared
 * by BOTH builds from its original location — no fork, no copy to drift.
 */
export default defineConfig({
  configFile: false,
  root: path.resolve(process.cwd(), "solid"),
  // Fonts, logo and manifest are shared with the React build rather than copied.
  publicDir: path.resolve(process.cwd(), "public"),
  plugins: [solid()],
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
