import fs from "node:fs";
import path from "node:path";
import { gzipSync } from "node:zlib";

const assetsDir = path.join(process.cwd(), "dist", "assets");
const failures = [];

if (!fs.existsSync(assetsDir)) {
  console.error("Bundle budget: dist/assets is missing. Run Vite first.");
  process.exit(1);
}

const files = fs.readdirSync(assetsDir).filter((file) => file.endsWith(".js"));

function gzipBytes(file) {
  return gzipSync(fs.readFileSync(path.join(assetsDir, file))).byteLength;
}

function largest(prefix) {
  const matches = files.filter((file) => file.startsWith(`${prefix}-`));
  if (matches.length === 0) return null;
  return matches
    .map((file) => ({ file, bytes: gzipBytes(file) }))
    .sort((a, b) => b.bytes - a.bytes)[0];
}

function requireChunk(prefix) {
  const chunk = largest(prefix);
  if (!chunk) failures.push(`Missing expected split chunk: ${prefix}`);
  return chunk;
}

function budget(prefix, maxKb) {
  const chunk = requireChunk(prefix);
  if (!chunk) return;
  const maxBytes = maxKb * 1024;
  if (chunk.bytes > maxBytes) {
    failures.push(`${chunk.file} is ${(chunk.bytes / 1024).toFixed(1)} KiB gzip; budget is ${maxKb} KiB`);
  }
}

budget("index", 205);
budget("Home", 35);
budget("Feedback", 15);
budget("DiscussionWidget", 20);
budget("CustomCursor", 15);
budget("DocsEditor", 80);
budget("AnalyticsTab", 115);

[
  "AnnouncementsWidget",
  "CalendarWidget",
  "JobsWidget",
  "MembersWidget",
  // MabisAIAssistant was removed from Home on 2026-08-19 (see
  // docs/solid-migration.md), so nothing imports it and no chunk is emitted.
  "SettingsModal",
].forEach(requireChunk);

if (failures.length > 0) {
  console.error("\nBundle-budget check failed:\n");
  failures.forEach((failure) => console.error(`- ${failure}`));
  console.error("\nKeep heavy features behind their interaction or near-viewport lazy boundaries.\n");
  process.exit(1);
}

const summary = ["index", "Home", "Feedback", "DiscussionWidget", "DocsEditor", "AnalyticsTab"]
  .map((prefix) => largest(prefix))
  .filter(Boolean)
  .map(({ file, bytes }) => `${file} ${(bytes / 1024).toFixed(1)} KiB gzip`)
  .join(" · ");

console.log(`Bundle budgets passed: ${summary}`);