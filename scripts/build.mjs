/*
 * Single entry point for `npm run build`.
 *
 * The publish pipeline invokes `npm run build --mode development` (and may
 * append other flags). npm appends extra arguments to the LAST command of a
 * `&&` chain, so with the old inline script the flags landed on
 * check-css-split.mjs, which read `--mode` as a dist directory and failed the
 * whole build with "No build found at /app_temp/--mode".
 *
 * Wrapping the sequence in one script fixes that class of bug permanently:
 * appended flags arrive here and are deliberately IGNORED — including
 * `--mode development`. Forwarding that to `vite build` would ship a
 * development-mode bundle (import.meta.env.DEV true, larger output that can
 * trip the bundle budgets); the published app must always be the production
 * build, which is exactly what the pipeline's own checks passed against.
 */
import { spawnSync } from "node:child_process";

const steps = [
  ["npx", ["vite", "build"]],
  ["node", ["scripts/check-tailwind-layer.mjs"]],
  ["node", ["scripts/check-font-subset.mjs"]],
  ["node", ["scripts/generate-service-worker.mjs"]],
  ["node", ["scripts/check-bundle-budget.mjs"]],
  ["node", ["scripts/check-css-split.mjs"]],
];

for (const [cmd, args] of steps) {
  const result = spawnSync(cmd, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}