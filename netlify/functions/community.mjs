import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
const cookieName = '124_admin_session';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
function signedIn(req) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return false;
  const token = (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token) return false;
  const [payload, signature] = token.split('.');
  if (!payload || !signature) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(signature), b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString()).exp > Date.now(); } catch { return false; }
}
const reply = (data, status = 200) => new Response(JSON.stringify(data), { status, headers });
const clean = (value, max) => String(value ?? '').trim().replace(/[<>]/g, '').slice(0, max);
export default async (req) => {
  const store = getStore('124-community');
  const admin = signedIn(req);
  const guests = await store.get('guests', { type: 'json' }) || [];
  const reviews = await store.get('reviews', { type: 'json' }) || [];
  if (req.method === 'GET') return reply(admin ? { guests, reviews } : { reviews: reviews.filter(x => x.status === 'approved') });
  if (req.method !== 'POST') return reply({ error: 'Method not allowed.' }, 405);
  let body;
  try { body = await req.json(); } catch { return reply({ error: 'Invalid request.' }, 400); }
  if (body.action === 'moderate') {
    if (!admin) return reply({ error: 'Admin login required.' }, 401);
    const list = body.kind === 'guest' ? guests : body.kind === 'review' ? reviews : null;
    if (!list || !['approve', 'delete'].includes(body.operation)) return reply({ error: 'Invalid moderation request.' }, 400);
    const item = list.find(x => x.id === body.id);
    if (!item) return reply({ error: 'Entry not found.' }, 404);
    if (body.operation === 'delete') list.splice(list.indexOf(item), 1);
    else item.status = 'approved';
    await store.setJSON(body.kind === 'guest' ? 'guests' : 'reviews', list);
    return reply({ ok: true, guests, reviews });
  }
  if (body.kind === 'guest') {
    const entry = { id: randomUUID(), name: clean(body.name, 60), room: clean(body.room, 40), purpose: clean(body.purpose, 100), note: clean(body.note, 300), createdAt: new Date().toISOString(), status: 'pending' };
    if (!entry.name || !entry.room || !entry.purpose) return reply({ error: 'Please complete the required fields.' }, 400);
    guests.push(entry);
    await store.setJSON('guests', guests);
    return reply({ ok: true, message: 'Guest check-in submitted for admin review.' }, 201);
  }
  if (body.kind === 'review') {
    const entry = { id: randomUUID(), name: clean(body.name || 'Anonymous', 60), rating: Math.max(1, Math.min(5, Number(body.rating) || 5)), text: clean(body.text, 600), createdAt: new Date().toISOString(), status: 'pending' };
    if (!entry.text) return reply({ error: 'Please write your review.' }, 400);
    reviews.push(entry);
    await store.setJSON('reviews', reviews);
    return reply({ ok: true, message: 'Review submitted. It will appear after admin approval.' }, 201);
  }
  return reply({ error: 'Unknown submission type.' }, 400);
};
