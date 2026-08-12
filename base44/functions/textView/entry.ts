import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';
import { secrets } from 'base44:runtime';
import { buildBoardText } from '../../shared/board.js';

export default async function (req: Request): Promise<Response> {
  try {
    const url = new URL(req.url);
    let body: any = {};
    if (req.method === 'POST') { try { body = await req.json(); } catch { body = {}; } }
    const providedKey = url.searchParams.get('key') || req.headers.get('x-mabis-key') || body.key;

    if (providedKey !== secrets.get('MABIS_TEXT_KEY')) {
      return new Response('403 — invalid or missing key\n', {
        status: 403, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
    }

    const base44 = createClientFromRequest(req);
    const text = await buildBoardText(base44.asServiceRole);
    return new Response(text, { status: 200, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  } catch (error) {
    return new Response('error: ' + error.message + '\n', {
      status: 500, headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  }
}