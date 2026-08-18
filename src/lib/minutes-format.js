/*
 * Discussion topics → a minutes document.
 *
 * The Discussion section used to be a list of DiscussionTopic records. It is
 * now a per-week document, so each week's existing topics are rendered into
 * that week's document as formatted content.
 *
 * IMPORTANT — this module never writes, deletes or mutates a topic. It reads
 * them and returns HTML. The DiscussionTopic records stay exactly as they are
 * in the database, which is what keeps History (which still reads them) working
 * and what makes this conversion reversible: delete the generated document and
 * the original data is untouched.
 *
 * Framework-agnostic, so the React and Solid builds share one implementation
 * and cannot format the same week differently.
 */

const PRIORITY_LABELS = { 1: "Urgent", 2: "High", 3: "Medium", 4: "Low", 5: "Minor" };

/* Titles the app uses as internal markers rather than real topics. */
export const RESERVED_TITLES = new Set(["__meeting_notes__", "__meeting_ended__"]);

const escapeHtml = (value) => String(value ?? "")
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");

/**
 * A topic's description is already rich HTML written in this app's own editor,
 * so it is passed through rather than escaped. It is bounded to a paragraph if
 * it arrived as bare text, so the output is always well-formed blocks.
 */
function descriptionBlocks(html) {
  const value = String(html ?? "").trim();
  if (!value) return "";
  // Bare text (no tags at all) would otherwise be emitted inline and merge with
  // the next heading.
  return /<[a-z][\s\S]*>/i.test(value) ? value : `<p>${escapeHtml(value)}</p>`;
}

/** The topics belonging to one week, in the order they should be minuted. */
export function topicsForWeek(topics, weekLabel) {
  return (topics || [])
    .filter((t) => t && t.week_label === weekLabel && !RESERVED_TITLES.has(t.title))
    // Highest priority first, then oldest first — the order a meeting would
    // realistically work through them.
    .sort((a, b) => {
      const pa = Number(a.priority) || 3;
      const pb = Number(b.priority) || 3;
      if (pa !== pb) return pa - pb;
      return String(a.created_date || "").localeCompare(String(b.created_date || ""));
    });
}

/**
 * Render a week's topics as the starting content for its minutes document.
 * Returns "" when the week has no topics, so callers can tell "nothing to
 * convert" from "converted to an empty document".
 */
export function topicsToMinutesHtml(topics, weekLabel, { heading } = {}) {
  const items = topicsForWeek(topics, weekLabel);
  if (items.length === 0) return "";

  const parts = [];
  if (heading) parts.push(`<h1>${escapeHtml(heading)}</h1>`);

  for (const topic of items) {
    parts.push(`<h2>${escapeHtml(topic.title || "Untitled topic")}</h2>`);

    // One attribution line carrying everything the list used to show as chips,
    // so no field is lost in the conversion.
    const meta = [];
    if (topic.submitted_by) meta.push(`Raised by ${escapeHtml(topic.submitted_by)}`);
    // Anything outside 1-5 (including a value the schema never produced but a
    // stray import might) reads as Medium rather than dropping the field.
    const priority = PRIORITY_LABELS[Number(topic.priority)] || PRIORITY_LABELS[3];
    meta.push(`${priority} priority`);
    meta.push(topic.completed ? "Done" : "Not yet discussed");
    parts.push(`<p><em>${meta.join(" · ")}</em></p>`);

    const body = descriptionBlocks(topic.description);
    if (body) parts.push(body);
  }

  return parts.join("");
}

/**
 * Decide what a week's editor should open with.
 *
 * Extracted from the component because getting this wrong is invisible until
 * someone opens a week and reads the wrong week's minutes — which is exactly
 * what happened. Pure, so it can be tested without a renderer.
 *
 * `memo` is caller-owned state from the previous call: `{ seededWeek, week,
 * html }`, or null on first use. The returned `memo` must be stored back.
 *
 * The rules, in order:
 *   1. A stored document with real content always wins. Never seed over it.
 *   2. If this exact week has already been resolved, reuse it — a background
 *      refetch must not re-derive the seed mid-edit.
 *   3. Otherwise derive the seed from this week's topics.
 *
 * Rule 2 must compare the WEEK, not a boolean. A boolean latch carries across a
 * week change and hands back the previous week's html.
 */
export function resolveMinutesDocument({ week, storedHtml, topics, heading, memo }) {
  if (!isBlankDocument(storedHtml)) {
    return { html: storedHtml, memo: { seededWeek: week, week, html: storedHtml } };
  }
  if (memo && memo.seededWeek === week && memo.week === week) {
    return { html: memo.html, memo };
  }
  const seed = topicsToMinutesHtml(topics, week, { heading });
  return { html: seed, memo: { seededWeek: week, week, html: seed } };
}

/**
 * True when a stored document has no real content — an empty editor still
 * serialises to markup like "<p><br></p>", which must not count as written.
 */
export function isBlankDocument(html) {
  if (!html) return true;
  return !String(html)
    .replace(/<br\s*\/?>/gi, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/<[^>]*>/g, "")
    .trim();
}

/**
 * Every week's written minutes, keyed by week label.
 *
 * The document lives in the DiscussionTopic row titled `__meeting_notes__`.
 * Blank documents are omitted, so callers can treat "has an entry" as "this
 * week was actually written up" rather than re-testing emptiness.
 */
export function minutesByWeek(topics) {
  const byWeek = new Map();
  for (const t of topics || []) {
    if (!t || t.title !== "__meeting_notes__" || !t.week_label) continue;
    if (isBlankDocument(t.description)) continue;
    byWeek.set(t.week_label, t.description);
  }
  return byWeek;
}

/**
 * Compare two week labels, newest first.
 *
 * Not a string comparison. `"YYYY-Www"` only sorts correctly as text while
 * every label is zero-padded, and a single record written as `2026-W9` instead
 * of `2026-W09` sorted above `2026-W33` — putting an early-March meeting at the
 * top of History. Comparing the parsed numbers cannot drift that way.
 */
export function compareWeeksDesc(a, b) {
  const parse = (label) => {
    const [year, week] = String(label ?? "").split("-W");
    return [parseInt(year, 10) || 0, parseInt(week, 10) || 0];
  };
  const [ay, aw] = parse(a);
  const [by, bw] = parse(b);
  return by - ay || bw - aw;
}

/**
 * The weeks History should list, newest first.
 *
 * A week qualifies when it has written minutes OR an archived topic. The
 * archived-topic rule alone is what History used to use, and it made sense when
 * a meeting WAS its topic list; since Discussion became a document, a week can
 * be fully minuted with nothing archived, and those weeks were being dropped
 * from History entirely.
 *
 * `currentWeek` is excluded when given: it is still being written and it is
 * already on Home.
 */
export function historyWeeks(topics, { currentWeek } = {}) {
  const weeks = new Set(minutesByWeek(topics).keys());
  for (const t of topics || []) {
    if (!t || !t.week_label) continue;
    if (t.archived && !RESERVED_TITLES.has(t.title)) weeks.add(t.week_label);
  }
  weeks.delete(currentWeek);
  return [...weeks].sort(compareWeeksDesc);
}
