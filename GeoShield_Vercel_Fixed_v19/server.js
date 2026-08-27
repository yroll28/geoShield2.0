/**
 * Optional simple Node server for hosts that do not provide Vercel/Netlify
 * serverless functions. The frontend is still static; this endpoint proxies
 * the completion email through Resend without exposing the API key.
 */
const http = require("http");
const fs = require("fs");
const path = require("path");
const sendHandler = require("./api/send-completion-email.js");
const chatHandler = require("./api/chat.js");
const requestsHandler = require("./api/requests.js");

const root = __dirname;
const port = Number(process.env.PORT || 3000);

function wireHandler(handler, req, res) {
  if (req.method === "POST") {
    let raw = "";
    req.on("data", chunk => { raw += chunk; if (raw.length > 30000) req.destroy(); });
    req.on("end", () => {
      req.body = raw;
      const out = { statusCode:200, setHeader:(...args)=>res.setHeader(...args), status:code=>{out.statusCode=code;return out;}, json:data=>{res.statusCode=out.statusCode;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data));}, end:value=>{res.statusCode=out.statusCode;res.end(value)} };
      Promise.resolve(handler(req,out)).catch(()=>{if(!res.writableEnded){res.statusCode=500;res.end(JSON.stringify({ok:false,error:"Server error"}));}});
    });
  } else {
    const out={statusCode:200,setHeader:(...args)=>res.setHeader(...args),status:code=>{out.statusCode=code;return out;},json:data=>{res.statusCode=out.statusCode;res.setHeader("Content-Type","application/json; charset=utf-8");res.end(JSON.stringify(data));},end:value=>{res.statusCode=out.statusCode;res.end(value)}};
    Promise.resolve(handler(req,out)).catch(()=>{if(!res.writableEnded){res.statusCode=500;res.end(JSON.stringify({ok:false,error:"Server error"}));}});
  }
}

function serve(req, res) {
  if (req.url.startsWith("/api/chat") && (req.method === "GET" || req.method === "POST" || req.method === "OPTIONS")) {
    wireHandler(chatHandler, req, res);
    return;
  }
  if (req.url.startsWith("/api/requests") && (req.method === "GET" || req.method === "POST" || req.method === "OPTIONS")) {
    wireHandler(requestsHandler, req, res);
    return;
  }
  if (req.url === "/api/send-completion-email" && req.method === "POST") {
    let raw="";
    req.on("data", chunk => { raw += chunk; if(raw.length > 30000) req.destroy(); });
    req.on("end", () => {
      req.body = raw;
      const out = {
      statusCode: 200,
      setHeader: (...args) => res.setHeader(...args),
      status: code => { out.statusCode = code; return out; },
      json: data => { res.statusCode = out.statusCode; res.setHeader("Content-Type", "application/json; charset=utf-8"); res.end(JSON.stringify(data)); },
      end: value => { res.statusCode = out.statusCode; res.end(value); }
    };
    Promise.resolve(sendHandler(req, out)).catch(() => { if (!res.writableEnded) { res.statusCode=500; res.end(JSON.stringify({ok:false,error:"Server error"})); } });
    });
    return;
  }
  if (req.url === "/api/send-completion-email" && req.method === "OPTIONS") {
    const out = { statusCode: 200, setHeader: (...args)=>res.setHeader(...args), status: code=>{out.statusCode=code;return out;}, json:data=>{res.statusCode=out.statusCode;res.setHeader("Content-Type","application/json");res.end(JSON.stringify(data));}, end:()=>{res.statusCode=out.statusCode;res.end();} };
    req.body={}; sendHandler(req,out); return;
  }
  let pathname = decodeURIComponent((req.url || "/").split("?")[0]);
  if(pathname === "/") pathname="/index.html";
  const file = path.join(root, pathname.replace(/^\/+/,""));
  if(!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()){
    res.statusCode=404; res.end("Not found"); return;
  }
  const ext=path.extname(file);
  const types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".json":"application/json",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",".svg":"image/svg+xml",".webp":"image/webp"};
  res.setHeader("Content-Type",types[ext]||"application/octet-stream");
  fs.createReadStream(file).pipe(res);
}

http.createServer(serve).listen(port, () => console.log(`GeoShield running on http://localhost:${port}`));
