/** GeoShield service-requests API.
 * Node mode stores requests in data/requests.json.
 * For serverless hosting, use a real database adapter before production.
 * Required for admin access: CHAT_ADMIN_KEY (same key used by the Customer Service admin panel).
 */
const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'requests.json');
const memory = global.__GEOSHIELD_REQUESTS__ || (global.__GEOSHIELD_REQUESTS__ = new Map());

function clean(v,max=2000){ return String(v ?? '').trim().slice(0,max); }
function emailOk(v){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }
function load(){
  try{
    if(fs.existsSync(DATA_FILE)){
      const arr=JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
      if(Array.isArray(arr)) arr.forEach(x=>memory.set(x.id,x));
    }
  }catch(e){ console.error('Requests storage load failed',e); }
}
function persist(){
  try{
    fs.mkdirSync(DATA_DIR,{recursive:true});
    fs.writeFileSync(DATA_FILE,JSON.stringify([...memory.values()],null,2));
  }catch(e){ console.error('Requests storage write failed',e); }
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
function isAdmin(req){ return !!process.env.CHAT_ADMIN_KEY && clean(req.headers['x-chat-admin-key'],300)===process.env.CHAT_ADMIN_KEY; }

const ALLOWED_FIELDS=['name','organization','email','phone','clientType','region','province','city','barangay','streetAddress','zip','area','latitude','longitude','service','deadline','purpose','message','privacyAcknowledgment','address','coordinates'];

module.exports = async function handler(req,res){
  cors(res,req.headers.origin);
  if(req.method==='OPTIONS') return res.end();

  if(req.method==='GET'){
    if(!isAdmin(req)) return json(res,403,{ok:false,error:'Admin access required to view requests.'});
    const list=[...memory.values()].sort((a,b)=>String(b.id).localeCompare(String(a.id)));
    return json(res,200,{ok:true,requests:list});
  }

  if(req.method!=='POST') return json(res,405,{ok:false,error:'Method not allowed'});
  const b=body(req), action=clean(b.action,40);

  if(action==='create'){
    const email=clean(b.email,320).toLowerCase(), name=clean(b.name,160);
    if(!name||!emailOk(email)) return json(res,400,{ok:false,error:'Name and a valid email are required.'});
    const d={id:'REQ-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),status:'New',date:new Date().toLocaleString(),createdAt:new Date().toISOString()};
    for(const f of ALLOWED_FIELDS) d[f]=clean(b[f],4000);
    d.name=name; d.email=email;
    memory.set(d.id,d); persist();
    return json(res,201,{ok:true,request:d});
  }

  if(!isAdmin(req)) return json(res,403,{ok:false,error:'Admin access required.'});

  if(action==='update'){
    const id=clean(b.id,100);
    const existing=memory.get(id);
    if(!existing) return json(res,404,{ok:false,error:'Request not found.'});
    if(typeof b.status==='string') existing.status=clean(b.status,60);
    if(typeof b.remarks==='string') existing.remarks=clean(b.remarks,4000);
    if(typeof b.completionDate==='string') existing.completionDate=clean(b.completionDate,60);
    memory.set(id,existing); persist();
    return json(res,200,{ok:true,request:existing});
  }

  if(action==='delete'){
    const id=clean(b.id,100);
    memory.delete(id); persist();
    return json(res,200,{ok:true});
  }

  return json(res,400,{ok:false,error:'Unknown requests action.'});
};
