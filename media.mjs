import { getStore } from '@netlify/blobs';
import { createHmac, timingSafeEqual, randomUUID } from 'node:crypto';
const cookieName='124_admin_session';
function signedIn(req){const secret=process.env.SESSION_SECRET;if(!secret)return false;const token=(req.headers.get('cookie')||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(cookieName+'='))?.slice(cookieName.length+1);if(!token)return false;const [payload,sig]=token.split('.');if(!payload||!sig)return false;const exp=createHmac('sha256',secret).update(payload).digest('base64url');const a=Buffer.from(sig),b=Buffer.from(exp);if(a.length!==b.length||!timingSafeEqual(a,b))return false;try{return JSON.parse(Buffer.from(payload,'base64url').toString()).exp>Date.now()}catch{return false}}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
export default async req=>{
 const store=getStore('124-gallery-media');
 if(req.method==='GET'){const id=new URL(req.url).searchParams.get('id');if(!id||!/^[a-f0-9-]{36}$/.test(id))return new Response('Not found',{status:404});const obj=await store.get(id,{type:'arrayBuffer'});if(!obj)return new Response('Not found',{status:404});const meta=await store.getMetadata(id);return new Response(obj,{headers:{'Content-Type':meta?.metadata?.contentType||'image/jpeg','Cache-Control':'public, max-age=31536000, immutable'}})}
 if(req.method!=='POST')return json({error:'Method not allowed.'},405);
 if(!signedIn(req))return json({error:'Admin login required.'},401);
 let body;try{body=await req.json()}catch{return json({error:'Invalid JSON.'},400)}
 const match=String(body.dataUrl||'').match(/^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);if(!match)return json({error:'Unsupported image format.'},400);
 const bytes=Buffer.from(match[2],'base64');if(bytes.length>8*1024*1024)return json({error:'Image must be smaller than 8 MB.'},413);
 const id=randomUUID();await store.set(id,bytes,{metadata:{contentType:match[1]}});return json({ok:true,url:`/.netlify/functions/media?id=${id}`},201);
};
