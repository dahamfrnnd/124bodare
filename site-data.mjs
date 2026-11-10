import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual } from 'node:crypto';
const cookieName = '124_admin_session';
const headers = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
function signedIn(req) {
  const secret = process.env.SESSION_SECRET; if (!secret) return false;
  const token = (req.headers.get('cookie') || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='))?.slice(cookieName.length + 1);
  if (!token) return false; const [payload, signature] = token.split('.'); if (!payload || !signature) return false;
  const expected = createHmac('sha256', secret).update(payload).digest('base64url');
  const a = Buffer.from(signature), b = Buffer.from(expected); if (a.length !== b.length || !timingSafeEqual(a,b)) return false;
  try { return JSON.parse(Buffer.from(payload,'base64url').toString()).exp > Date.now(); } catch { return false; }
}
const reply=(data,status=200)=>new Response(JSON.stringify(data),{status,headers});
export default async req => {
 const store=getStore('124-site-state');
 if(req.method==='GET'){const state=await store.get('shared-state',{type:'json'});return reply({state:state||null});}
 if(req.method!=='POST')return reply({error:'Method not allowed.'},405);
 if(!signedIn(req))return reply({error:'Admin login required.'},401);
 let body;try{body=await req.json()}catch{return reply({error:'Invalid JSON.'},400)}
 const s=body.state;
 if(!s||!Array.isArray(s.statuses)||!Array.isArray(s.stock)||!Array.isArray(s.borrowed)||!Array.isArray(s.gallery)||!s.exam)return reply({error:'Invalid site data.'},400);
 if(s.stock.length>30||s.borrowed.length>500||s.gallery.length>300)return reply({error:'Too many items.'},413);
 await store.setJSON('shared-state',s);return reply({ok:true});
};
