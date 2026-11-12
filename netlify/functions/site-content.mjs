import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';
const cookieName = '124_admin_session';
function signedIn(req) {
  const secret = process.env.SESSION_SECRET; if (!secret) return false;
  const token = (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token) return false;
  const [payload, signature] = token.split('.'); if (!payload || !signature) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export default async (req) => {
  const store = getStore('124-site-content');
  if (req.method === 'GET') {
    const content = await store.get('published-content', { type: 'json' });
    return new Response(JSON.stringify({ content: content || null }), { headers });
  }
  if (req.method === 'POST') {
    if (!signedIn(req)) return new Response(JSON.stringify({ error: 'Please log in as admin first.' }), { status: 401, headers });
    let body; try { body = await req.json(); } catch { return new Response(JSON.stringify({ error: 'Invalid JSON.' }), { status: 400, headers }); }
    if (!body.content || !Array.isArray(body.content.text) || !Array.isArray(body.content.images)) return new Response(JSON.stringify({ error: 'Invalid content format.' }), { status: 400, headers });
    await store.setJSON('published-content', body.content);
    return new Response(JSON.stringify({ ok: true }), { headers });
  }
  return new Response('Method not allowed', { status: 405 });
};
