import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';

function line(char = '─', n = 62) { return char.repeat(n); }

function fmtDate(d) {
  if (!d) return '';
  try { return new Date(d).toISOString().slice(0, 10); } catch { return String(d); }
}

function stripHtml(s) {
  return String(s || '').replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function wrap(text, width = 62, indent = '  ') {
  const words = stripHtml(text).split(' ');
  const out = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > width) { out.push(indent + cur.trim()); cur = w; }
    else cur += ' ' + w;
  }
  if (cur.trim()) out.push(indent + cur.trim());
  return out.join('\n');
}

export default async function (req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    const key = url.searchParams.get('key') || req.headers.get('x-mabis-key');
    let body = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    const providedKey = key || (body as any).key;

    if (providedKey !== secrets.get('MABIS_TEXT_KEY')) {
      return new Response('403 — invalid or missing key\n', {
        status: 403,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    const [announcements, news, topics, assignments, lunches, members, calendar] = await Promise.all([
      sr.entities.Announcement.list('-created_date', 10),
      sr.entities.NewsItem.list('-created_date', 5),
      sr.entities.DiscussionTopic.list('-created_date', 30),
      sr.entities.JobAssignment.list('-created_date', 60),
      sr.entities.LunchMenu.list('-created_date', 1),
      sr.entities.Member.list('name', 200),
      sr.entities.CalendarEvent.list('date', 30),
    ]);

    const out = [];
    out.push(line('═'));
    out.push('  MABIS SECONDARY — COMMUNITY MEETING');
    out.push('  ' + new Date().toISOString().replace('T', ' ').slice(0, 16) + ' UTC');
    out.push(line('═'));
    out.push('');

    out.push('ANNOUNCEMENTS');
    out.push(line());
    if (!announcements.length) out.push('  (none)');
    for (const a of announcements) {
      out.push(`  ${a.pinned ? '[PIN] ' : ''}${a.title}  — ${a.author_name || '?'} (${fmtDate(a.created_date)})`);
      if (a.body) out.push(wrap(a.body, 60, '      '));
    }
    out.push('');

    out.push('NEWS');
    out.push(line());
    if (!news.length) out.push('  (none)');
    for (const n of news) {
      out.push(`  ${n.title} — ${n.author_name || '?'} (${fmtDate(n.created_date)})`);
      if (n.body) out.push(wrap(n.body, 60, '      '));
    }
    out.push('');

    const openTopics = topics.filter((t) => !t.archived);
    out.push('DISCUSSION TOPICS');
    out.push(line());
    if (!openTopics.length) out.push('  (none)');
    for (const t of openTopics) {
      out.push(`  [${t.completed ? 'x' : ' '}] ${t.title} — ${t.submitted_by || '?'}${t.week_label ? ' (' + t.week_label + ')' : ''}`);
      if (t.description) out.push(wrap(t.description, 60, '      '));
    }
    out.push('');

    out.push('JOBS');
    out.push(line());
    if (!assignments.length) out.push('  (none)');
    const byWeek = {};
    for (const a of assignments) (byWeek[a.week_label] = byWeek[a.week_label] || []).push(a);
    for (const week of Object.keys(byWeek).sort().reverse().slice(0, 2)) {
      out.push(`  ${week}`);
      for (const a of byWeek[week]) {
        const done = (a.days_completed || []).length;
        const notDone = (a.not_done_days || []).length;
        out.push(`    ${a.job_title.padEnd(26)} ${String(a.assigned_to_name || '?').padEnd(18)} done:${done} missed:${notDone}`);
      }
    }
    out.push('');

    const lunch = lunches[0];
    out.push('LUNCH MENU' + (lunch ? ' — ' + lunch.week_label : ''));
    out.push(line());
    if (!lunch) out.push('  (none)');
    else {
      for (const d of ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']) {
        out.push(`  ${d.slice(0, 3).toUpperCase()}  snack: ${lunch[d + '_snack'] || '-'}`);
        out.push(`       lunch: ${lunch[d + '_lunch'] || '-'}`);
      }
    }
    out.push('');

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = calendar.filter((e) => e.date >= today).slice(0, 10);
    out.push('UPCOMING EVENTS');
    out.push(line());
    if (!upcoming.length) out.push('  (none)');
    for (const e of upcoming) out.push(`  ${e.date}  ${e.time ? e.time + '  ' : ''}${e.title} [${e.type || 'event'}]`);
    out.push('');

    out.push(`MEMBERS (${members.length})`);
    out.push(line());
    const groups = {};
    for (const m of members) (groups[m.role || 'student'] = groups[m.role || 'student'] || []).push(m.name);
    for (const role of Object.keys(groups).sort()) {
      out.push(`  ${role.toUpperCase()} (${groups[role].length})`);
      out.push(wrap(groups[role].join(', '), 58, '    '));
    }
    out.push('');
    out.push(line('═'));

    return new Response(out.join('\n') + '\n', {
      status: 200,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error) {
    return new Response('error: ' + error.message + '\n', {
      status: 500,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}