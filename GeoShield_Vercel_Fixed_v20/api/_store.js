/** Shared storage helper.
 *
 * Vercel's serverless functions run on a read-only, ephemeral filesystem —
 * writing to a local JSON file (as this project originally did) does NOT
 * reliably persist between one request and the next once deployed to Vercel,
 * because different requests can be served by different, isolated function
 * instances. That is why requests submitted on one device could silently
 * fail to show up in the admin portal on another device/session.
 *
 * This helper uses Vercel KV / Upstash Redis's REST API (a single JSON blob
 * per dataset) when it's configured, which IS shared and durable across every
 * invocation. If no KV is configured (e.g. running locally via `node
 * server.js`), it transparently falls back to an in-memory Map backed by a
 * local JSON file — exactly like before — so local development still works
 * with zero setup.
 *
 * To enable durable storage on Vercel: Vercel dashboard -> your project ->
 * Storage -> Create Database -> Redis (Upstash) -> Connect to this project.
 * That automatically adds the KV_REST_API_URL / KV_REST_API_TOKEN (or
 * UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN) environment variables
 * this file looks for. No code changes needed — just redeploy after connecting.
 */
const fs = require('fs');
const path = require('path');

function kvConfig(){
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url || !token) return null;
  return {url,token};
}
function kvConfigured(){ return !!kvConfig(); }

async function kvCommand(cmd){
  const cfg=kvConfig();
  if(!cfg) return null;
  const res=await fetch(cfg.url,{method:'POST',headers:{Authorization:`Bearer ${cfg.token}`,'Content-Type':'application/json'},body:JSON.stringify(cmd)});
  if(!res.ok) throw new Error('KV request failed: HTTP '+res.status);
  const data=await res.json();
  if(data.error) throw new Error('KV error: '+data.error);
  return data.result;
}

/** Get a JSON value stored under `key`. Returns `fallback` if missing or KV not configured. */
async function kvGetJSON(key,fallback){
  if(!kvConfigured()) return fallback;
  try{
    const result=await kvCommand(['GET',key]);
    if(result==null) return fallback;
    return JSON.parse(result);
  }catch(e){
    console.error(`KV get failed for "${key}", using fallback:`,e);
    return fallback;
  }
}

/** Store a JSON value under `key`. Returns true on success. */
async function kvSetJSON(key,value){
  if(!kvConfigured()) return false;
  try{
    const result=await kvCommand(['SET',key,JSON.stringify(value)]);
    return result==='OK';
  }catch(e){
    console.error(`KV set failed for "${key}":`,e);
    return false;
  }
}

/** Local-file fallback (used only when no KV is configured, e.g. plain Node hosting). */
function fileStore(fileName){
  const DATA_DIR = path.join(__dirname, '..', 'data');
  const DATA_FILE = path.join(DATA_DIR, fileName);
  function readAll(fallback){
    try{
      if(fs.existsSync(DATA_FILE)) return JSON.parse(fs.readFileSync(DATA_FILE,'utf8'));
    }catch(e){ console.error(`Local file read failed for ${fileName}:`,e); }
    return fallback;
  }
  function writeAll(value){
    try{
      fs.mkdirSync(DATA_DIR,{recursive:true});
      fs.writeFileSync(DATA_FILE,JSON.stringify(value,null,2));
      return true;
    }catch(e){ console.error(`Local file write failed for ${fileName}:`,e); return false; }
  }
  return {readAll,writeAll};
}

/** Unified read/write for a single JSON dataset stored under `key` (KV) or `fileName` (local fallback). */
function dataset(key,fileName,fallback){
  const file=fileStore(fileName);
  return {
    kvConfigured,
    async read(){
      if(kvConfigured()) return kvGetJSON(key,fallback);
      return file.readAll(fallback);
    },
    async write(value){
      if(kvConfigured()){
        const ok=await kvSetJSON(key,value);
        if(ok) return true;
        // If the KV write failed for some reason, still try the local file so
        // at least this instance keeps working until the KV issue is fixed.
      }
      return file.writeAll(value);
    }
  };
}

module.exports = { kvConfigured, kvGetJSON, kvSetJSON, dataset };
