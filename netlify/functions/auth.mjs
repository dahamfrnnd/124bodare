import { createHmac, timingSafeEqual } from 'node:crypto';
const cookieName = '124_admin_session';
const secret = () => process.env.SESSION_SECRET;
function sign(value) { return createHmac('sha256', secret()).update(value).digest('base64url'); }
function makeToken() { const payload = Buffer.from(JSON.stringify({ exp: Date.now() + 7 * 24 * 60 * 60 * 1000 })).toString('base64url'); return `${payload}.${sign(payload)}`; }
function validToken(event) {
  const cookie = event.headers.cookie || event.headers.Cookie || '';
  const token = cookie.split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token || !secret()) return false;
  const [payload, signature] = token.split('.'); if (!payload || !signature) return false;
  const expected = sign(payload); const a = Buffer.from(signature); const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
export default async (req) => {
  const method = req.method;
  if (!process.env.ADMIN_PASSWORD || !secret()) return new Response(JSON.stringify({ error: 'Admin environment variables are not configured.' }), { status: 500, headers });
  if (method === 'GET') return new Response(JSON.stringify({ loggedIn: validToken({ headers: Object.fromEntries(req.headers) }) }), { headers });
  if (method === 'POST') {
    let body = {}; try { body = await req.json(); } catch {}
    const supplied = Buffer.from(String(body.password || ''));
    const expected = Buffer.from(process.env.ADMIN_PASSWORD);
    const ok = supplied.length === expected.length && timingSafeEqual(supplied, expected);
    if (!ok) return new Response(JSON.stringify({ error: 'Incorrect admin password.' }), { status: 401, headers });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, 'Set-Cookie': `${cookieName}=${makeToken()}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=604800` } });
  }
  if (method === 'DELETE') return new Response(JSON.stringify({ ok: true }), { headers: { ...headers, 'Set-Cookie': `${cookieName}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0` } });
  return new Response('Method not allowed', { status: 405 });
};
