// One-line labels for the terminal client's list output, per entity.
const s = (v) => String(v ?? '').replace(/\s+/g, ' ').trim();

const LABELS = {
  Announcement: (a) => (a.pinned ? '[PIN] ' : '') + s(a.title) + '  — ' + s(a.author_name),
  NewsItem: (n) => s(n.title) + '  — ' + s(n.author_name),
  DiscussionTopic: (t) => (t.completed ? '[x] ' : '[ ] ') + s(t.title) + '  — ' + s(t.submitted_by),
  JobAssignment: (j) =>
    s(j.job_title) + '  — ' + s(j.assigned_to_name) +
    '  done:' + ((j.days_completed || []).map((d) => d.slice(0, 3)).join(',') || '-') +
    '  missed:' + ((j.not_done_days || []).map((d) => d.slice(0, 3)).join(',') || '-'),
  CalendarEvent: (e) => s(e.date) + '  ' + s(e.title) + '  [' + s(e.type || 'event') + ']',
  Member: (m) => s(m.name) + '  (' + s(m.role || 'student') + ')  ' + s(m.email),
  MissingItem: (i) => s(i.item_name) + '  ' + s(i.colors) + ' — ' + s(i.reported_by_name),
  LunchMenu: (l) => s(l.week_label),
  Birthday: (b) => s(b.date) + '  ' + s(b.name),
  CleaningEntry: (c) => s(c.name) + '  — ' + s(c.reason),
};

export function labelFor(entity, item) {
  const fn = LABELS[entity];
  return fn ? fn(item) : s(item.title || item.name || item.id);
}