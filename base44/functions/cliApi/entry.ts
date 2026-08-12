import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { buildBoardText } from '../../shared/board.js';

// Entities the terminal client is allowed to read/write.
const ALLOWED = [
  'Announcement', 'NewsItem', 'DiscussionTopic', 'JobAssignment',
  'CalendarEvent', 'Member', 'LunchMenu', 'MissingItem', 'Birthday', 'CleaningEntry',
];

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