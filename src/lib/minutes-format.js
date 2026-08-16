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
    const priority = PRIORITY_LABELS[Number(topic.priority) || 3];
    if (priority) meta.push(`${priority} priority`);
    meta.push(topic.completed ? "Done" : "Not yet discussed");
    parts.push(`<p><em>${meta.join(" · ")}</em></p>`);

    const body = descriptionBlocks(topic.description);
    if (body) parts.push(body);
  }

  return parts.join("");
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
