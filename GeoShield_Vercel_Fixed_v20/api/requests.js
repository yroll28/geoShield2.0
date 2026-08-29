/** GeoShield service-requests API.
 * Storage: Vercel KV / Upstash Redis when configured (works correctly across
 * serverless invocations); falls back to a local data/requests.json file for
 * plain Node hosting (e.g. `node server.js`). See api/_store.js for details.
 * Required for admin access: CHAT_ADMIN_KEY (same key used by the Customer Service admin panel).
 */
const store = require('./_store.js');
const requests = store.dataset('geoshield:requests', 'requests.json', []);

function clean(v,max=2000){ return String(v ?? '').trim().slice(0,max); }
function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

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
function isAdmin(req){ return !!process.env.CHAT_ADMIN_KEY && clean(req.headers['x-chat-admin-key'],300)===process.env.CHAT_ADMIN_KEY; }

const ALLOWED_FIELDS=['name','organization','email','phone','clientType','region','province','city','barangay','streetAddress','zip','area','latitude','longitude','service','deadline','purpose','message','privacyAcknowledgment','address','coordinates'];

module.exports = async function handler(req,res){
  cors(res,req.headers.origin);
  if(req.method==='OPTIONS') return res.end();

  if(req.method==='GET'){
    if(!isAdmin(req)) return json(res,403,{ok:false,error:'Admin access required to view requests.'});
    const list=(await requests.read()).slice().sort((a,b)=>String(b.id).localeCompare(String(a.id)));
    return json(res,200,{ok:true,requests:list,storage:store.kvConfigured()?'kv':'local-file'});
  }

  if(req.method!=='POST') return json(res,405,{ok:false,error:'Method not allowed'});
  const b=body(req), action=clean(b.action,40);

  if(action==='create'){
    const email=clean(b.email,320).toLowerCase(), name=clean(b.name,160);
    if(!name||!emailOk(email)) return json(res,400,{ok:false,error:'Name and a valid email are required.'});
    const d={id:'REQ-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),status:'New',date:new Date().toLocaleString(),createdAt:new Date().toISOString()};
    for(const f of ALLOWED_FIELDS) d[f]=clean(b[f],4000);
    d.name=name; d.email=email;
    const list=await requests.read();
    list.unshift(d);
    const saved=await requests.write(list);
    if(!saved) return json(res,500,{ok:false,error:'Could not save the request to storage.'});
    return json(res,201,{ok:true,request:d});
  }

  if(!isAdmin(req)) return json(res,403,{ok:false,error:'Admin access required.'});

  if(action==='update'){
    const id=clean(b.id,100);
    const list=await requests.read();
    const existing=list.find(x=>x.id===id);
    if(!existing) return json(res,404,{ok:false,error:'Request not found.'});
    if(typeof b.status==='string') existing.status=clean(b.status,60);
    if(typeof b.remarks==='string') existing.remarks=clean(b.remarks,4000);
    if(typeof b.completionDate==='string') existing.completionDate=clean(b.completionDate,60);
    if(typeof b.completionEmailStatus==='string') existing.completionEmailStatus=clean(b.completionEmailStatus,60);
    if(typeof b.completionEmailError==='string') existing.completionEmailError=clean(b.completionEmailError,300);
    if(typeof b.completionEmailSentAt==='string') existing.completionEmailSentAt=clean(b.completionEmailSentAt,60);
    if(typeof b.completionEmailOpenedAt==='string') existing.completionEmailOpenedAt=clean(b.completionEmailOpenedAt,60);
    const saved=await requests.write(list);
    if(!saved) return json(res,500,{ok:false,error:'Could not save the update to storage.'});
    return json(res,200,{ok:true,request:existing});
  }

  if(action==='delete'){
    const id=clean(b.id,100);
    const list=(await requests.read()).filter(x=>x.id!==id);
    const saved=await requests.write(list);
    if(!saved) return json(res,500,{ok:false,error:'Could not save the deletion to storage.'});
    return json(res,200,{ok:true});
  }

  return json(res,400,{ok:false,error:'Unknown requests action.'});
};
