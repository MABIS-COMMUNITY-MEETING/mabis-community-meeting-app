import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { buildBoardText } from '../../shared/board.js';

// Entities the terminal client is allowed to read/write.
const ALLOWED = [
  'Announcement', 'NewsItem', 'DiscussionTopic', 'JobAssignment',
  'CalendarEvent', 'Member', 'LunchMenu', 'MissingItem', 'Birthday', 'CleaningEntry',
];

// Adding/editing students and running the meeting is only possible while a
// meeting is actually happening.
const MEETING_ONLY = ['Member', 'JobAssignment'];
const SCHOOL_DOMAIN = '@montessoribkk.com';

function isoWeekLabel(d: Date) {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

// Meeting day = Friday, or the date explicitly set for this week's meeting.
async function meetingIsOn(sr: any) {
  const now = new Date();
  if (now.getUTCDay() === 5) return true;
  const today = now.toISOString().slice(0, 10);
  const rows = await sr.entities.Attendance.filter({ week_label: isoWeekLabel(now) });
  return rows.some((r: any) => r.meeting_date === today);
}

export default async function (req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    let body: any = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    const key = url.searchParams.get('key') || req.headers.get('x-mabis-key') || body.key;

    if (key !== secrets.get('MABIS_TEXT_KEY')) {
      return Response.json({ error: 'invalid or missing key' }, { status: 403 });
    }

    const action = body.action || url.searchParams.get('action') || 'board';
    const entity = body.entity || url.searchParams.get('entity');
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    if (action === 'board') {
      const text = await buildBoardText(sr);
      return Response.json({ text });
    }

    if (!entity || !ALLOWED.includes(entity)) {
      return Response.json({ error: 'unknown or not-allowed entity: ' + entity }, { status: 400 });
    }
    const store = sr.entities[entity];
    const isWrite = ['create', 'update', 'delete'].includes(action);

    if (isWrite) {
      const email = String(body.email || '').trim().toLowerCase();
      if (!email.endsWith(SCHOOL_DOMAIN)) {
        return Response.json(
          { error: 'you must sign in with your ' + SCHOOL_DOMAIN + ' account to make changes' },
          { status: 403 },
        );
      }
      if (MEETING_ONLY.includes(entity) && !(await meetingIsOn(sr))) {
        return Response.json(
          { error: 'meeting mode is off — ' + entity + ' changes are only allowed during a meeting' },
          { status: 403 },
        );
      }
    }

    if (action === 'list') {
      const items = await store.list(body.sort || '-created_date', body.limit || 100);
      return Response.json({ items });
    }
    if (action === 'create') {
      const created = await store.create(body.data || {});
      return Response.json({ item: created });
    }
    if (action === 'update') {
      if (!body.id) return Response.json({ error: 'id required' }, { status: 400 });
      const updated = await store.update(body.id, body.data || {});
      return Response.json({ item: updated });
    }
    if (action === 'delete') {
      if (!body.id) return Response.json({ error: 'id required' }, { status: 400 });
      await store.delete(body.id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'unknown action: ' + action }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}