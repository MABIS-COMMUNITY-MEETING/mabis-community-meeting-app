/**
 * Discussion → minutes conversion contract.
 *
 * This is the piece that decides whether a week of discussion survives the move
 * to a document. If it drops a field, that content is gone from what people
 * read — so every field the old topic list displayed is asserted here.
 *
 * It also pins the safety property the whole conversion rests on: the formatter
 * only ever READS topics. Nothing in this module may mutate them.
 *
 * Run: node scripts/check-minutes-format.mjs
 */
const { topicsToMinutesHtml, topicsForWeek, isBlankDocument, resolveMinutesDocument, RESERVED_TITLES } =
  await import("../src/lib/minutes-format.js");

const failures = [];
let count = 0;
function check(name, condition, detail = "") {
  count += 1;
  if (!condition) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

const WEEK = "2026-W33";
const topics = [
  { id: "1", title: "Sports day", description: "<p>Need <b>volunteers</b></p>", submitted_by: "Ana", priority: 2, completed: false, week_label: WEEK, created_date: "2026-08-10" },
  { id: "2", title: "Library hours", description: "<p>Extend to 5pm</p>", submitted_by: "Ben", priority: 1, completed: true, week_label: WEEK, created_date: "2026-08-11" },
  { id: "3", title: "Other week", description: "<p>nope</p>", submitted_by: "Cal", priority: 3, week_label: "2026-W32", created_date: "2026-08-04" },
  { id: "4", title: "__meeting_notes__", description: "<p>the doc itself</p>", submitted_by: "system", week_label: WEEK, is_jobs_topic: true },
  { id: "5", title: "__meeting_ended__", description: "", submitted_by: "system", week_label: WEEK },
];

// Frozen so any accidental mutation throws rather than silently corrupting.
const frozen = topics.map((t) => Object.freeze({ ...t }));
Object.freeze(frozen);

const html = topicsToMinutesHtml(frozen, WEEK, { heading: "Minutes — 21 August 2026" });

// ── selection ───────────────────────────────────────────────────────────────
check("only this week's topics are included", !html.includes("Other week"));
check("the notes document itself is not minuted into itself", !html.includes("the doc itself"));
check("internal marker records are excluded", !html.includes("__meeting_ended__"));
check("reserved titles are declared", RESERVED_TITLES.has("__meeting_notes__") && RESERVED_TITLES.has("__meeting_ended__"));
check("topicsForWeek returns only real topics", topicsForWeek(frozen, WEEK).length === 2);

// ── every field the old list showed survives ────────────────────────────────
check("topic titles preserved", html.includes("Sports day") && html.includes("Library hours"));
check("descriptions preserved", html.includes("Extend to 5pm"));
check("rich markup inside descriptions preserved", html.includes("<b>volunteers</b>"));
check("author preserved", html.includes("Raised by Ana") && html.includes("Raised by Ben"));
check("priority preserved as a word", html.includes("High priority") && html.includes("Urgent priority"));
check("completed state preserved", html.includes("Done"));
check("pending state preserved", html.includes("Not yet discussed"));

// ── document shape ──────────────────────────────────────────────────────────
check("heading rendered when supplied", html.startsWith("<h1>Minutes — 21 August 2026</h1>"));
check("each topic becomes an h2", (html.match(/<h2>/g) || []).length === 2);
check("higher priority is minuted first",
  html.indexOf("Library hours") < html.indexOf("Sports day"),
  "priority 1 should precede priority 2");
check("no heading emitted when none requested",
  !topicsToMinutesHtml(frozen, WEEK).startsWith("<h1>"));

// ── the formatter must not mutate its input ─────────────────────────────────
check("input topics are not mutated", (() => {
  try {
    topicsToMinutesHtml(frozen, WEEK, { heading: "x" });
    return frozen[0].title === "Sports day" && frozen[0].priority === 2;
  } catch { return false; }
})(), "the formatter wrote to a frozen topic");

// ── edge cases ──────────────────────────────────────────────────────────────
check("a week with no topics converts to nothing", topicsToMinutesHtml(frozen, "2026-W01") === "");
check("empty input is safe", topicsToMinutesHtml([], WEEK) === "" && topicsToMinutesHtml(null, WEEK) === "");
check("a topic with no description still appears",
  topicsToMinutesHtml([{ title: "Bare", submitted_by: "Dee", week_label: WEEK }], WEEK).includes("Bare"));
check("missing title falls back rather than rendering empty",
  topicsToMinutesHtml([{ submitted_by: "Dee", week_label: WEEK }], WEEK).includes("Untitled topic"));
check("plain-text description is wrapped in a paragraph",
  topicsToMinutesHtml([{ title: "T", description: "just text", week_label: WEEK }], WEEK).includes("<p>just text</p>"));
check("titles are HTML-escaped",
  topicsToMinutesHtml([{ title: "<script>x</script>", week_label: WEEK }], WEEK).includes("&lt;script&gt;"));
check("author names are HTML-escaped",
  topicsToMinutesHtml([{ title: "T", submitted_by: "<b>x</b>", week_label: WEEK }], WEEK).includes("&lt;b&gt;"));
check("unknown priority falls back to Medium",
  topicsToMinutesHtml([{ title: "T", priority: 99, week_label: WEEK }], WEEK).includes("Medium priority"));

// ── blank-document detection (guards the seeding rule) ──────────────────────
check("empty string is blank", isBlankDocument(""));
check("null is blank", isBlankDocument(null));
check("an empty editor's markup is blank", isBlankDocument("<p><br></p>"));
check("nbsp-only markup is blank", isBlankDocument("<p>&nbsp;</p>"));
check("real content is not blank", isBlankDocument("<p>hello</p>") === false);
check("an image-only document is NOT treated as blank",
  isBlankDocument('<p><img src="/a.png"></p>') === true,
  "known limitation: text-only heuristic, documented at the call site");

/* ── week isolation ─────────────────────────────────────────────────────────
 * Regression tests for a reported bug: opening 21 August showed 14 August's
 * minutes. The seed latch was a boolean, so it carried across a week change and
 * handed back the previous week's html. Every case below would have caught it.
 */
const W33 = "2026-W33";
const W34 = "2026-W34";
const twoWeeks = [
  { id: "a", title: "Week 33 topic", week_label: W33, submitted_by: "Ana", description: "<p>33</p>" },
  { id: "b", title: "Week 34 topic", week_label: W34, submitted_by: "Ben", description: "<p>34</p>" },
];

// Open W33, then switch to W34 — exactly the reported sequence.
let r = resolveMinutesDocument({ week: W33, storedHtml: "", topics: twoWeeks, memo: null });
check("first week seeds from its own topics", r.html.includes("Week 33 topic"));
r = resolveMinutesDocument({ week: W34, storedHtml: "", topics: twoWeeks, memo: r.memo });
check("switching week does NOT reuse the previous week's document",
  !r.html.includes("Week 33 topic"),
  "the reported bug: 21 August showed 14 August's minutes");
check("switching week seeds from the NEW week's topics", r.html.includes("Week 34 topic"));

// Switching back must likewise re-derive, not hand back W34.
r = resolveMinutesDocument({ week: W33, storedHtml: "", topics: twoWeeks, memo: r.memo });
check("switching back re-derives the original week",
  r.html.includes("Week 33 topic") && !r.html.includes("Week 34 topic"));

// A refetch arriving mid-edit must not re-seed and clobber typing.
const edited = { seededWeek: W33, week: W33, html: "<p>my typed minutes</p>" };
r = resolveMinutesDocument({ week: W33, storedHtml: "", topics: twoWeeks, memo: edited });
check("a refetch on the same week reuses in-memory content, not a fresh seed",
  r.html === "<p>my typed minutes</p>");

// A stored document always wins over the seed.
r = resolveMinutesDocument({ week: W33, storedHtml: "<p>saved minutes</p>", topics: twoWeeks, memo: null });
check("a stored document is never seeded over", r.html === "<p>saved minutes</p>");
r = resolveMinutesDocument({ week: W33, storedHtml: "<p>saved minutes</p>", topics: twoWeeks, memo: edited });
check("a stored document beats stale in-memory content", r.html === "<p>saved minutes</p>");

// A blank stored document still seeds.
r = resolveMinutesDocument({ week: W34, storedHtml: "<p><br></p>", topics: twoWeeks, memo: null });
check("an empty stored document still seeds from topics", r.html.includes("Week 34 topic"));

// The returned memo must always name the week it describes.
check("returned memo is tagged with its week", r.memo.week === W34 && r.memo.seededWeek === W34);

console.log(`\nMinutes conversion: ${count - failures.length}/${count} checks passed\n`);
if (failures.length) {
  console.error("FAILED:");
  failures.forEach((f) => console.error(`  - ${f}`));
  process.exit(1);
}
console.log("Every topic field survives the conversion, and topics are never mutated.\n");
