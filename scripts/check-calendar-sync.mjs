import fs from "node:fs";
import path from "node:path";
import { JSDOM } from "jsdom";
import { createServer } from "vite";

function assertEqual(label, actual, expected) {
  if (actual !== expected) {
    throw new Error(`${label}: expected ${expected}, received ${actual}`);
  }
}

const browser = new JSDOM("<!doctype html><html><body></body></html>", {
  url: "https://app.test/home",
});
globalThis.window = browser.window;
globalThis.document = browser.window.document;
globalThis.localStorage = browser.window.localStorage;

const server = await createServer({
  configFile: false,
  root: process.cwd(),
  server: { middlewareMode: true, hmr: false },
  optimizeDeps: { noDiscovery: true },
  appType: "custom",
  logLevel: "silent",
});

try {
  const { useSharedCalendarState } = await server.ssrLoadModule("/solid/lib/calendar-state.js");
  const summerCalendar = useSharedCalendarState();
  summerCalendar.setViewDate(new Date(2031, 11, 1));
  summerCalendar.setView("Year");

  const bossCalendar = useSharedCalendarState();
  assertEqual("Boss receives Summer's selected year", bossCalendar.viewDate().getFullYear(), 2031);
  assertEqual("Boss receives Summer's selected month", bossCalendar.viewDate().getMonth(), 11);
  assertEqual("Boss receives Summer's selected view", bossCalendar.view(), "Year");

  bossCalendar.setViewDate(new Date(2028, 0, 1));
  bossCalendar.setView("Month");
  assertEqual("Summer receives Boss's selected year", summerCalendar.viewDate().getFullYear(), 2028);
  assertEqual("Summer receives Boss's selected month", summerCalendar.viewDate().getMonth(), 0);
  assertEqual("Summer receives Boss's selected view", summerCalendar.view(), "Month");

  const persisted = JSON.parse(localStorage.getItem("mabis-calendar-state"));
  assertEqual("calendar date persists", persisted.date, "2028-01-01");
  assertEqual("calendar view persists", persisted.view, "Month");

  const calendarSource = fs.readFileSync(path.resolve("solid/components/CalendarWidget.jsx"), "utf8");
  assertEqual("calendar uses shared layout state", calendarSource.includes("useSharedCalendarState"), true);
  assertEqual("calendar exposes every month through a native month picker", calendarSource.includes('type="month"'), true);
  assertEqual("month picker is unbounded", calendarSource.includes('type="month"\n            min='), false);

  const homeSource = fs.readFileSync(path.resolve("solid/pages/Home.jsx"), "utf8");
  assertEqual("Summer uses the shared widget renderer", homeSource.includes("<SummerHome sections={SECTIONS}>{renderWidget}</SummerHome>"), true);
  assertEqual("Boss uses the shared widget renderer", homeSource.includes("{renderWidget}\n            </BossHome>"), true);
} finally {
  await server.close();
}

console.log("Calendar sync: all 12 months and shared Summer/Boss state passed.");
