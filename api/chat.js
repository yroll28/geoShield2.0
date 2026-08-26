/** GeoShield customer-service chat API.
 * Node mode stores threads in data/chat-threads.json.
 * For serverless hosting, use a real database/Redis adapter before production.
 * Required for admin access: CHAT_ADMIN_KEY.
 * Optional email notifications: RESEND_API_KEY + MAIL_FROM + CHAT_ADMIN_EMAIL.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'chat-threads.json');
const memory = global.__GEOSHIELD_CHAT__ || (global.__GEOSHIELD_CHAT__ = new Map());

function clean(v,max=2000){ return String(v ?? '').trim().slice(0,max); }
function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function id(){ return crypto.randomBytes(16).toString('hex'); }
function token(){ return crypto.randomBytes(24).toString('hex'); }
function load(){
  try{
    if(fs.existsSync(DATA_FILE)){
      const arr=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
      if(Array.isArray(arr)) arr.forEach(x=>memory.set(x.requestId,x));
    }
  }catch(e){ console.error('Chat storage load failed',e); }
}
function persist(){
  try{
    fs.mkdirSync(DATA_DIR,{recursive:true});
    fs.writeFileSync(DATA_FILE,JSON.stringify([...memory.values()],null,2));
  }catch(e){ console.error('Chat storage write failed',e); }
}
if(memory.size===0) load();

function cors(res,origin){
  const allowed=process.env.ALLOWED_ORIGIN||origin||'*';
  res.setHeader('Access-Control-Allow-Origin',allowed);
  res.setHeader('Access-Control-Allow-Methods','GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers','Content-Type,X-Chat-Admin-Key');
  res.setHeader('Vary','Origin');
}
function json(res,status,data){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(data));}
function body(req){
  if(typeof req.body==='object' && req.body) return req.body;
  try{return JSON.parse(req.body||'{}')}catch{return {}}
}
function isAdmin(req,b){ return !!process.env.CHAT_ADMIN_KEY && clean(req.headers['x-chat-admin-key'],300)===process.env.CHAT_ADMIN_KEY; }
function safeThread(t){
  return {requestId:t.requestId,name:t.name,email:t.email,createdAt:t.createdAt,updatedAt:t.updatedAt,messages:t.messages};
}
async function notify(to,subject,text){
  if(!to || !process.env.RESEND_API_KEY || !process.env.MAIL_FROM) return;
  try{
    await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${process.env.RESEND_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({from:process.env.MAIL_FROM,to:[to],subject,text})});
  }catch(e){console.error('Chat notification failed',e)}
}

module.exports = async function handler(req,res){
  cors(res,req.headers.origin);
  if(req.method==='OPTIONS') return res.end();
  if(req.method==='GET'){
    const q=req.query||Object.fromEntries(new URL(req.url,'http://localhost').searchParams.entries());
    const requestId=clean(q.requestId,100), email=clean(q.email,320).toLowerCase(), t=clean(q.token,100);
    const admin=isAdmin(req,{});
    if(admin && !requestId){
      const threads=[...memory.values()].sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(safeThread);
      return json(res,200,{ok:true,threads});
    }
    const thread=memory.get(requestId);
    if(!thread) return json(res,404,{ok:false,error:'Chat thread not found.'});
    if(!admin && !(email===thread.email && t===thread.token)) return json(res,403,{ok:false,error:'Chat access denied.'});
    return json(res,200,{ok:true,thread:safeThread(thread),token:admin?undefined:thread.token});
  }
  if(req.method!=='POST') return json(res,405,{ok:false,error:'Method not allowed'});
  const b=body(req), action=clean(b.action,40);

  if(action==='create'){
    const requestId=clean(b.requestId,100), email=clean(b.email,320).toLowerCase(), name=clean(b.name,160);
    if(!requestId||!emailOk(email)) return json(res,400,{ok:false,error:'Request reference and valid email are required.'});
    let thread=memory.get(requestId);
    if(thread){
      if(thread.email!==email) return json(res,403,{ok:false,error:'The email does not match this request.'});
      return json(res,200,{ok:true,thread:safeThread(thread),token:thread.token});
    }
    const now=new Date().toISOString();
    thread={requestId,email,name,token:token(),createdAt:now,updatedAt:now,messages:[]};
    memory.set(requestId,thread);persist();
    return json(res,201,{ok:true,thread:safeThread(thread),token:thread.token});
  }

  if(action==='message'){
    const requestId=clean(b.requestId,100), text=clean(b.text,4000), sender=b.sender==='admin'?'admin':'client';
    const thread=memory.get(requestId);
    if(!thread||!text) return json(res,400,{ok:false,error:'Chat thread and message are required.'});
    const admin=isAdmin(req,b);
    if(!admin && !(sender==='client' && clean(b.token,100)===thread.token)) return json(res,403,{ok:false,error:'Chat access denied.'});
    const msg={id:id(),sender,text,createdAt:new Date().toISOString()};
    thread.messages.push(msg);thread.updatedAt=msg.createdAt;persist();
    if(sender==='client' && process.env.CHAT_ADMIN_EMAIL){
      await notify(process.env.CHAT_ADMIN_EMAIL,`New GeoShield customer message — ${requestId}`,`A client sent a new customer-service message for ${requestId}.\n\n${text}\n\nReply through the GeoShield admin Customer Service panel.`);
    }
    if(sender==='admin'){
      await notify(thread.email,`New message from GeoShield Customer Service — ${requestId}`,`Hello ${thread.name||'Client'},\n\nGeoShield Customer Service has sent you a new message regarding request ${requestId}:\n\n${text}\n\nPlease return to the GeoShield website and open Customer Service using your request reference and email to continue the conversation.`);
    }
    return json(res,200,{ok:true,message:msg,thread:safeThread(thread)});
  }
  return json(res,400,{ok:false,error:'Unknown chat action.'});
};
