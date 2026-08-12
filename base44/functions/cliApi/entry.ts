import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { buildBoardText } from '../../shared/board.js';
import { resolveActor, checkWrite, isMeetingGated } from '../../shared/perms.js';
import { labelFor } from '../../shared/cliLabels.js';

const plain = (s: string, status = 200) =>
  new Response(s.endsWith('\n') ? s : s + '\n', {
    status, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });

// Entities the terminal client is allowed to read/write.
const ALLOWED = [
  'Announcement', 'NewsItem', 'DiscussionTopic', 'JobAssignment',
  'CalendarEvent', 'Member', 'LunchMenu', 'MissingItem', 'Birthday', 'CleaningEntry',
];

// Permission model lives in shared/perms.js so it mirrors the site exactly.

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
    // the shell client asks for plain text so it never has to parse JSON
    const wantText = (body.format || url.searchParams.get('format')) === 'text';
    const fail = (msg: string, status: number) =>
      wantText ? plain('ERR: ' + msg, status) : Response.json({ error: msg }, { status });

    if (key !== secrets.get('MABIS_TEXT_KEY')) {
      return fail('invalid or missing key', 403);
    }

    const action = body.action || url.searchParams.get('action') || 'board';
    const entity = body.entity || url.searchParams.get('entity');
    const base44 = createClientFromRequest(req);
    const sr = base44.asServiceRole;

    if (action === 'board') {
      const text = await buildBoardText(sr);
      return wantText ? plain(text) : Response.json({ text });
    }

    if (!entity || !ALLOWED.includes(entity)) {
      return fail('unknown or not-allowed entity: ' + entity, 400);
    }
    const store = sr.entities[entity];
    const isWrite = ['create', 'update', 'delete'].includes(action);

    if (isWrite) {
      const actor = await resolveActor(sr, body.email);
      const denied = checkWrite(actor, entity, action, body.data);
      if (denied) return fail(denied, 403);
      if (isMeetingGated(entity) && !(await meetingIsOn(sr))) {
        return fail('meeting mode is off — ' + entity + ' changes are only allowed during a meeting', 403);
      }
    }

    if (action === 'list') {
      let items = await store.list(body.sort || '-created_date', body.limit || 100);
      if (entity === 'DiscussionTopic') items = items.filter((t: any) => !t.archived);
      if (entity === 'JobAssignment') {
        const latest = items.map((j: any) => j.week_label || '').sort().reverse()[0];
        items = items.filter((j: any) => (j.week_label || '') === latest);
      }
      if (!wantText) return Response.json({ items });
      // "id<TAB>label" per line — trivially parseable in shell
      return plain(items.map((it: any) => it.id + '\t' + labelFor(entity, it)).join('\n'));
    }
    if (action === 'create') {
      const created = await store.create(body.data || {});
      return wantText ? plain('OK ' + created.id) : Response.json({ item: created });
    }
    if (action === 'update') {
      if (!body.id) return fail('id required', 400);
      let data = body.data || {};
      // marking a job day: the server recomputes the arrays so the client
      // never has to send them back
      if (entity === 'JobAssignment' && body.mark_day) {
        const cur = await store.get(body.id);
        const day = body.mark_day;
        const done = (cur.days_completed || []).filter((d: string) => d !== day);
        const miss = (cur.not_done_days || []).filter((d: string) => d !== day);
        if (body.mark_status === 'y') done.push(day);
        if (body.mark_status === 'n') miss.push(day);
        data = { days_completed: done, not_done_days: miss, not_done: miss.length > 0 };
      }
      if (body.toggle) {
        const cur = await store.get(body.id);
        data = { ...data, [body.toggle]: !cur[body.toggle] };
      }
      const updated = await store.update(body.id, data);
      return wantText ? plain('OK ' + body.id) : Response.json({ item: updated });
    }
    if (action === 'delete') {
      if (!body.id) return fail('id required', 400);
      await store.delete(body.id);
      return wantText ? plain('OK') : Response.json({ ok: true });
    }

    return fail('unknown action: ' + action, 400);
  } catch (error) {
    return plain('ERR: ' + error.message, 500);
  }
}