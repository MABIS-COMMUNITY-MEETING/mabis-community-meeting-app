import { getCurrentWeekLabel, weekLabelToDate } from "../src/lib/jobsRotation.js";
import { resolveMeetingDate } from "../src/lib/meeting-date.js";
import { format } from "date-fns";

const f = (d) => format(d, "EEEE, d MMMM yyyy");
const today = new Date(2026, 8, 18); // 18 Sep 2026

console.log("today                 :", f(today));
console.log("current week label    :", getCurrentWeekLabel(today));
console.log("weekLabelToDate(label):", f(weekLabelToDate(getCurrentWeekLabel(today))));
console.log("resolveMeetingDate('') :", f(resolveMeetingDate("", today)));
console.log();

const shot = new Date(2026, 7, 25);
console.log("screenshot showed     :", f(shot), "-> week", getCurrentWeekLabel(shot));
console.log("would it be accepted? :", getCurrentWeekLabel(shot) === getCurrentWeekLabel(today));
console.log("resolveMeetingDate('2026-08-25'):", f(resolveMeetingDate("2026-08-25", today)));
console.log();

console.log("=== round-trip over 400 days of 2026 ===");
let bad = 0;
for (let i = 0; i < 400; i++) {
  const d = new Date(2026, 0, 1 + i);
  const label = getCurrentWeekLabel(d);
  const back = weekLabelToDate(label);
  const relabel = getCurrentWeekLabel(back);
  if (relabel !== label || format(back, "EEEE") !== "Friday") {
    if (bad++ < 8) {
      console.log("  MISMATCH", format(d, "yyyy-MM-dd EEE"), label, "->", format(back, "yyyy-MM-dd EEE"), relabel);
    }
  }
}
console.log(bad === 0 ? "  clean" : `  ${bad} mismatches`);
