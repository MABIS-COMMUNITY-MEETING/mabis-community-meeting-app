import { getISOWeek, getYear, nextFriday, isFriday, format } from "date-fns";

export function getCurrentWeekLabel() {
  const today = new Date();
  const friday = isFriday(today) ? today : nextFriday(today);
  return `${getYear(friday)}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
}

export function weekLabelToDate(label) {
  const [year, weekPart] = label.split("-W");
  const week = parseInt(weekPart);
  const jan4 = new Date(parseInt(year), 0, 4);
  const startOfWeek1 = new Date(jan4);
  startOfWeek1.setDate(jan4.getDate() - ((jan4.getDay() + 6) % 7));
  const result = new Date(startOfWeek1);
  result.setDate(startOfWeek1.getDate() + (week - 1) * 7 + 4);
  return result;
}

export function formatWeekFull(label) {
  try { return format(weekLabelToDate(label), "MMMM do, yyyy"); }
  catch { const [year, week] = label.split("-W"); return `Week ${week}, ${year}`; }
}

// Bucket records into meeting weeks by the upcoming Friday from their date.
// Weekend records roll into the following week so nothing is left out.
export function groupByWeek(records, dateField = "created_date") {
  const buckets = new Map();
  records.forEach(r => {
    const d = new Date(r[dateField]);
    if (isNaN(d.getTime())) return;
    const day = d.getDay();
    const friday = new Date(d);
    friday.setDate(d.getDate() + ((5 - day + 7) % 7));
    const weekLabel = `${friday.getFullYear()}-W${String(getISOWeek(friday)).padStart(2, "0")}`;
    if (!buckets.has(weekLabel)) buckets.set(weekLabel, []);
    buckets.get(weekLabel).push(r);
  });
  return [...buckets.entries()].sort((a, b) => b[0].localeCompare(a[0]));
}