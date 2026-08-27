/* ==========================================================================
   GeoShield Admin — full CMS logic
   ========================================================================== */

const DEFAULT_SERVICES=[
["01","Historical Erosion Assessment","Map and compare documented or observable erosion and landslide changes across selected time periods."],
["02","Landslide Inventory Mapping","Create a structured spatial inventory of known or observed landslide locations."],
["03","Susceptibility Assessment","Analyze relevant terrain and environmental factors to classify areas with differing susceptibility."],
["04","Site-Specific Assessment","Focused GIS assessment for a property, project area, road corridor, or community."],
["05","Erosion Monitoring","Periodic change review and updated mapping for clients who need continuing observation."],
["06","Custom GIS Analysis","Custom QGIS mapping workflows and cartographic outputs based on project requirements."]
];
const DEFAULT_NEWS=[
["GIS INSIGHT","Why historical erosion mapping matters","Comparing past and recent imagery can help document changes in terrain and exposed areas."],
["SERVICE UPDATE","Now accepting site-specific assessments","Submit your project location and requirements through our online request form."],
["MAPPING NOTE","Understanding susceptibility maps","Susceptibility identifies relative conditions associated with greater potential; it is not an exact timing prediction."]
];
const DEFAULT_PROJECTS=[
{category:"LANDSLIDE ASSESSMENT",title:"Mountain Slope Susceptibility Map",desc:"Multi-factor terrain assessment prepared for planning and further field investigation.",image:"",grad:"p1"},
{category:"HISTORICAL ANALYSIS",title:"Erosion Change Mapping",desc:"Comparison of selected imagery dates to document changes in exposed and eroded areas.",image:"",grad:"p2"},
{category:"COMMUNITY MAPPING",title:"Barangay Hazard Map",desc:"Clear cartographic output showing relevant terrain and hazard-related layers.",image:"",grad:"p3"}
];
const DEFAULT_CONTACT={phone:"+63 9XX XXX XXXX",email:"info@geoshield.ph",area:"Philippines"};

function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function get(){try{return JSON.parse(localStorage.getItem("geoSettings")||"{}")}catch(e){return{}}}
function save(g){
  try{
    localStorage.setItem("geoSettings",JSON.stringify(g));
    return true;
  }catch(e){
    console.error("Storage error:",e);
    const msg=(e&&e.name==="QuotaExceededError")
      ?"Browser storage is full. Remove some old homepage/project photos and try again."
      :"Could not save changes: "+(e.message||"Unknown storage error");
    throw new Error(msg);
  }
}
/* ---------------------------- service requests data layer ----------------------------
   Requests are stored on the server (data/requests.json via /api/requests) so they are
   visible from ANY device — phone, tablet, or desktop — not just the browser that
   happened to submit or last view them. localStorage is kept only as an offline cache
   so the list still shows something if the network/API is briefly unavailable. */
let __requestsCache=null;
function requestsEndpoint(){
  const configured=get().requestsEndpoint?.trim();
  if(configured)return configured;
  if(location.hostname.includes("netlify"))return "/.netlify/functions/requests";
  return "/api/requests";
}
function requestsAdminKey(){return sessionStorage.getItem("geoChatAdminKey")||"";}
function req(){
  if(__requestsCache)return __requestsCache;
  try{return JSON.parse(localStorage.getItem("geoRequests")||"[]")}catch(e){return[]}
}
function cacheRequests(list){
  __requestsCache=list;
  try{localStorage.setItem("geoRequests",JSON.stringify(list));}catch(e){}
}
async function loadRequestsFromServer(){
  const statusEl=document.getElementById("reqSyncStatus");
  try{
    const r=await fetch(requestsEndpoint(),{headers:{"X-Chat-Admin-Key":requestsAdminKey()}});
    const data=await r.json();
    if(!r.ok||!data.ok)throw new Error(data.error||"Could not load requests from the server.");
    cacheRequests(data.requests||[]);
    if(statusEl)statusEl.textContent="";
    overview();requests();
  }catch(e){
    console.error("Loading requests from server failed, showing local cache instead:",e);
    if(statusEl)statusEl.textContent="⚠ Could not load requests from the server — showing this device's local copy only, which may be incomplete or outdated. This usually means the CHAT_ADMIN_KEY environment variable is not set on the server, or it does not match the owner password. Ask whoever deployed the site to check this.";
  }
}
async function syncRequestUpdate(id,fields){
  try{
    const r=await fetch(requestsEndpoint(),{method:"POST",headers:{"Content-Type":"application/json","X-Chat-Admin-Key":requestsAdminKey()},body:JSON.stringify(Object.assign({action:"update",id},fields))});
    const data=await r.json();
    if(!r.ok||!data.ok)throw new Error(data.error||"Could not save this change to the server.");
  }catch(e){
    console.error("Server update failed; change is only saved locally on this device:",e);
  }
}
async function syncRequestDelete(id){
  try{
    await fetch(requestsEndpoint(),{method:"POST",headers:{"Content-Type":"application/json","X-Chat-Admin-Key":requestsAdminKey()},body:JSON.stringify({action:"delete",id})});
  }catch(e){
    console.error("Server delete failed; removal is only saved locally on this device:",e);
  }
}

function fileToDataURL(file,options={}){
  return new Promise((resolve,reject)=>{
    if(!file)return reject(new Error("No file selected."));
    if(!file.type||!file.type.startsWith("image/"))return reject(new Error("Please select an image file."));
    const maxBytes=options.maxBytes||12*1024*1024;
    if(file.size>maxBytes)return reject(new Error("That image is too large. Please choose an image under 12 MB."));
    const reader=new FileReader();
    reader.onerror=()=>reject(new Error("Could not read the selected file."));
    reader.onload=()=>{
      const img=new Image();
      img.onerror=()=>reject(new Error("The selected image could not be decoded."));
      img.onload=()=>{
        const maxWidth=options.maxWidth||1600;
        const maxHeight=options.maxHeight||1000;
        const scale=Math.min(1,maxWidth/img.naturalWidth,maxHeight/img.naturalHeight);
        const canvas=document.createElement("canvas");
        canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
        canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
        const ctx=canvas.getContext("2d",{alpha:true});
        if(!ctx)return reject(new Error("Your browser does not support image processing."));
        ctx.drawImage(img,0,0,canvas.width,canvas.height);
        const type=options.logo?"image/png":"image/jpeg";
        const quality=options.logo?undefined:0.78;
        const data=canvas.toDataURL(type,quality);
        if(data.length>3.8*1024*1024) return reject(new Error("The image is still too large after compression. Please use a smaller image."));
        resolve(data);
      };
      img.src=reader.result;
    };
    reader.readAsDataURL(file);
  });
}
function storageUsage(){
  let total=0;
  for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);total+=(localStorage.getItem(k)||"").length;}
  return Math.round(total/1024);
}

/* ---------------------------- auth ---------------------------- */
const OWNER_USERNAME = "owner";
const OWNER_PASSWORD = "GS-Owner-Only-2026!";

function login(){
  const username=document.getElementById("u").value.trim();
  const password=document.getElementById("p").value;
  if(username===OWNER_USERNAME&&password===OWNER_PASSWORD){
    sessionStorage.setItem("geoAdmin","1");
    // Reuse the owner password as the server admin key for the requests API,
    // so requests load from the shared server on any device (phone, tablet, desktop)
    // without a separate key entry. Server deployment must set CHAT_ADMIN_KEY to this
    // same value (see README).
    sessionStorage.setItem("geoChatAdminKey",password);
    document.getElementById("err").textContent="";
    load();
  }else{
    document.getElementById("err").textContent="Access denied. This portal is for the site owner only.";
  }
}
function logout(){sessionStorage.removeItem("geoAdmin");location.reload();}
function load(){
  document.getElementById("login").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  renderAll();
  loadRequestsFromServer();
}

/* ---------------------------- tabs ---------------------------- */
function tab(id,btn){
  document.querySelectorAll("main>section").forEach(x=>x.classList.add("hidden"));
  document.getElementById(id).classList.remove("hidden");
  document.querySelectorAll("aside button").forEach(x=>x.classList.remove("active"));
  if(btn)btn.classList.add("active");
  if(id==="requests")loadRequestsFromServer();
  if(id==="chat")refreshAdminChats();
  if(id==="media")media();
  if(id==="services")services();
  if(id==="projects")projects();
  if(id==="gismap")setTimeout(initGISMap,50);
  if(id==="news")news();
  if(id==="locations")initLocations();
  if(id==="settings")settingsForm();
}
window.tab=tab;

function renderAll(){overview();requests();media();services();projects();news();settingsForm();}

/* ---------------------------- dashboard ---------------------------- */
function animateAdminStat(el,target,duration=900){
  if(!el)return;
  const value=Number(target)||0;
  if(el._counterFrame)cancelAnimationFrame(el._counterFrame);
  const start=Number(el.dataset.counterValue||0);
  const startTime=performance.now();
  const ease=t=>1-Math.pow(1-t,3);
  const step=now=>{
    const progress=Math.min(1,(now-startTime)/duration);
    const current=Math.round(start+(value-start)*ease(progress));
    el.textContent=String(current);
    el.dataset.counterValue=String(current);
    if(progress<1)el._counterFrame=requestAnimationFrame(step);
    else{
      el.textContent=String(value);
      el.dataset.counterValue=String(value);
      el.classList.remove("counter-pop");
      void el.offsetWidth;
      el.classList.add("counter-pop");
    }
  };
  el._counterFrame=requestAnimationFrame(step);
}

function overview(){
  const r=req();
  animateAdminStat(document.getElementById("total"),r.length);
  animateAdminStat(document.getElementById("new"),r.filter(x=>x.status==="New").length);
  animateAdminStat(document.getElementById("prog"),r.filter(x=>x.status==="In Progress").length);
  animateAdminStat(document.getElementById("done"),r.filter(x=>x.status==="Completed").length);
}

/* ---------------------------- service requests ---------------------------- */
function requests(){
  overview();
  let r=req();
  const q=(document.getElementById("reqSearch")?.value||"").trim().toLowerCase();
  if(q){
    r=r.filter(x=>[x.name,x.email,x.barangay,x.city,x.service].some(v=>String(v||"").toLowerCase().includes(q)));
  }
  document.getElementById("reqs").innerHTML=r.length?r.map((x,i)=>`
    <article class="request">
      <div class="request-head">
        <div><b>${escapeHTML(x.name)}</b> · ${escapeHTML(x.email)}<br><small>${escapeHTML(x.date)}</small></div>
        <select onchange="setStatus('${escapeHTML(x.id)}',this.value)">
          <option ${x.status==="New"?"selected":""}>New</option>
          <option ${x.status==="In Progress"?"selected":""}>In Progress</option>
          <option ${x.status==="Completed"?"selected":""}>Completed</option>
          <option ${x.status==="Archived"?"selected":""}>Archived</option>
        </select>
      </div>
      <p>
        <b>${escapeHTML(x.service)}</b><br>
        <b>Client:</b> ${escapeHTML(x.name)} · ${escapeHTML(x.clientType||"Not specified")}<br>
        <b>Phone:</b> <a href="tel:${escapeHTML((x.phone||"").replace(/[^\d+]/g,""))}">${escapeHTML(x.phone||"Not specified")}</a> ·
        <b>Email:</b> <a href="mailto:${escapeHTML(x.email)}">${escapeHTML(x.email)}</a><br>
        <b>Address:</b> ${escapeHTML(x.address||x.location||"Not specified")}<br>
        <b>Area:</b> ${escapeHTML(x.area||"Not specified")}<br>
        <b>Coordinates:</b> ${escapeHTML(x.coordinates||"Not pinned")}<br>
        <b>Purpose:</b> ${escapeHTML(x.purpose||"Not specified")}<br>
        ${escapeHTML(x.message||"")}
      </p>
      <div class="request-remarks">
        <label><b>Project / Service Remarks</b>
          <textarea class="remarks-input" rows="3" placeholder="Add completion notes, deliverables, or other remarks…" onchange="saveRemarks('${escapeHTML(x.id)}',this.value)">${escapeHTML(x.remarks||"")}</textarea>
        </label>
        <div class="request-actions">
          ${x.status==="Completed"?`<div class="completion-state"><span>✓ Completed${x.completedAt?` on ${escapeHTML(x.completedAt)}`:""}</span>${x.completionEmailStatus==="sent"?`<small class="email-ok">✓ Automatic email sent${x.completionEmailSentAt?` on ${escapeHTML(x.completionEmailSentAt)}`:""}</small>`:""}${x.completionEmailStatus==="failed"?`<small class="email-fail">⚠ Email failed: ${escapeHTML(x.completionEmailError||"Unknown error")}</small>`:""}</div><button class="secondary-btn" type="button" onclick="emailCompletion('${escapeHTML(x.id)}')">✉ Send / Retry Email</button>`:""}
          <button class="secondary-btn danger" type="button" onclick="removeRequest('${escapeHTML(x.id)}')">✕ Remove</button>
        </div>
      </div>
    </article>`).join(""):"<div class='panel'>No service requests yet.</div>";
}
function completionEmail(item){
  const contact=get().contact||{};
  const business=get().name||"GeoShield Mapping Services";
  const remarks=item.remarks?.trim()||"The requested project/service has been completed and the agreed deliverables are ready for your review.";
  const subject=`Project Completed — ${item.service||"Mapping Service"}`;
  const body=`Dear ${item.name||"Client"},\n\nWe are pleased to inform you that your requested project/service has been completed.\n\nProject/Service: ${item.service||"Mapping Service"}\nReference: ${item.id||"N/A"}\nCompletion date: ${item.completedAt||new Date().toLocaleDateString()}\n\nRemarks:\n${remarks}\n\nThank you for choosing ${business}. If you have any questions or need clarification regarding the completed work, please reply to this email.\n\nBest regards,\n${business}\n${contact.email||""}`;
  const html=`<div style="font-family:Arial,sans-serif;line-height:1.6;color:#20352b;max-width:680px;margin:auto"><p>Dear ${escapeHTML(item.name||"Client")},</p><p>We are pleased to inform you that your requested project/service has been <strong>completed</strong>.</p><table style="border-collapse:collapse;width:100%;margin:18px 0"><tr><td style="padding:8px 0"><strong>Project/Service</strong></td><td>${escapeHTML(item.service||"Mapping Service")}</td></tr><tr><td style="padding:8px 0"><strong>Reference</strong></td><td>${escapeHTML(item.id||"N/A")}</td></tr><tr><td style="padding:8px 0"><strong>Completion date</strong></td><td>${escapeHTML(item.completedAt||new Date().toLocaleDateString())}</td></tr></table><p><strong>Remarks</strong></p><div style="padding:14px 16px;background:#f3f7f4;border-left:4px solid #c99a2e;border-radius:6px;white-space:pre-wrap">${escapeHTML(remarks)}</div><p>Thank you for choosing ${escapeHTML(business)}. If you have any questions or need clarification regarding the completed work, please reply to this email.</p><p>Best regards,<br><strong>${escapeHTML(business)}</strong><br>${escapeHTML(contact.email||"")}</p></div>`;
  return {subject,body,html,replyTo:contact.email||""};
}
function emailEndpoint(){
  const configured=get().emailEndpoint?.trim();
  if(configured)return configured;
  if(location.hostname.includes("netlify"))return "/.netlify/functions/send-completion-email";
  return "/api/send-completion-email";
}
async function sendAutomaticCompletionEmail(id){
  const r=req();
  const item=r.find(x=>x.id===id);
  if(!item||item.status!=="Completed"||!item.email)return {ok:false,error:"Missing customer email or completion status."};
  const mail=completionEmail(item);
  item.completionEmailStatus="sending";
  item.completionEmailError="";
  cacheRequests(r);
  syncRequestUpdate(id,{completionEmailStatus:item.completionEmailStatus,completionEmailError:item.completionEmailError});
  requests();
  try{
    const response=await fetch(emailEndpoint(),{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({to:item.email,subject:mail.subject,text:mail.body,html:mail.html,replyTo:mail.replyTo})
    });
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result.ok)throw new Error(result.error||`Email service returned ${response.status}`);
    const fresh=req();
    const saved=fresh.find(x=>x.id===id);
    if(saved){
      saved.completionEmailStatus="sent";
      saved.completionEmailSentAt=new Date().toLocaleString();
      saved.completionEmailId=result.id||"";
      saved.completionEmailError="";
      cacheRequests(fresh);
      syncRequestUpdate(id,{completionEmailStatus:saved.completionEmailStatus,completionEmailSentAt:saved.completionEmailSentAt,completionEmailError:saved.completionEmailError});
    }
    requests();
    return {ok:true,id:result.id||null};
  }catch(error){
    const fresh=req();
    const saved=fresh.find(x=>x.id===id);
    if(saved){
      saved.completionEmailStatus="failed";
      saved.completionEmailError=String(error.message||error).slice(0,300);
      cacheRequests(fresh);
      syncRequestUpdate(id,{completionEmailStatus:saved.completionEmailStatus,completionEmailError:saved.completionEmailError});
    }
    requests();
    return {ok:false,error:String(error.message||error)};
  }
}
function openGmailCompletion(item){
  const mail=completionEmail(item);
  const gmailUrl=`https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(item.email)}&su=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
  const win=window.open(gmailUrl,"_blank","noopener,noreferrer");
  item.completionEmailOpenedAt=new Date().toLocaleString();
  cacheRequests(req());
  syncRequestUpdate(item.id,{completionEmailOpenedAt:item.completionEmailOpenedAt});
  if(!win){
    const mailto=`mailto:${encodeURIComponent(item.email)}?subject=${encodeURIComponent(mail.subject)}&body=${encodeURIComponent(mail.body)}`;
    window.location.href=mailto;
  }
  requests();
}
async function emailCompletion(id){
  const r=req();
  const item=r.find(x=>x.id===id);
  if(!item)return;
  if(!item.email){alert("This request does not contain a customer email address.");return;}
  if(item.status!=="Completed"){alert("Mark the project/service as Completed first.");return;}
  const result=await sendAutomaticCompletionEmail(id);
  if(result.ok){
    alert(`Completion email sent successfully to ${item.email}.`);
    return;
  }
  const fallback=confirm(`Automatic email sending is not available right now.\n\nReason: ${result.error}\n\nWould you like to open Gmail with the completed message prepared for ${item.email}?`);
  if(fallback)openGmailCompletion(item);
}
function saveRemarks(id,value){
  const r=req();
  const item=r.find(x=>x.id===id);
  if(!item)return;
  item.remarks=String(value||"").trim();
  cacheRequests(r);
  syncRequestUpdate(id,{remarks:item.remarks});
}
async function setStatus(id,v){
  const r=req();
  const item=r.find(x=>x.id===id);
  if(!item)return;
  const wasCompleted=item.status==="Completed";
  item.status=v;
  if(v==="Completed"&&!wasCompleted){
    item.completedAt=new Date().toLocaleString();
    item.remarks=item.remarks||"Project/service completed. Deliverables are ready for client review.";
    item.completionEmailStatus=item.email?"sending":"no-email";
    item.completionEmailError="";
  }
  cacheRequests(r);
  syncRequestUpdate(id,{status:item.status,completionDate:item.completedAt});
  requests();
  if(v==="Completed"&&!wasCompleted&&item.email){
    const result=await sendAutomaticCompletionEmail(id);
    if(!result.ok){
      alert(`The project was marked Completed, but the automatic email could not be sent.\n\n${result.error}\n\nYou can use the Email customer button to retry or open Gmail.`);
    }
  }
}
function removeRequest(id){
  if(!confirm("Remove this request? This cannot be undone."))return;
  const r=req().filter(x=>x.id!==id);
  cacheRequests(r);
  syncRequestDelete(id);
  requests();
}
window.setStatus=setStatus;
window.saveRemarks=saveRemarks;
window.emailCompletion=emailCompletion;
window.sendAutomaticCompletionEmail=sendAutomaticCompletionEmail;
window.removeRequest=removeRequest;

/* ---------------------------- customer service chat ---------------------------- */
function chatEndpoint(){return get().chatEndpoint?.trim()||"/api/chat";}
function adminChatKey(){return sessionStorage.getItem("geoChatAdminKey")||"";}
function connectAdminChat(){
  const key=document.getElementById("chatAdminKey")?.value.trim();
  const status=document.getElementById("chatAdminStatus");
  if(!key){status.textContent="Enter the server-side chat key.";return;}
  sessionStorage.setItem("geoChatAdminKey",key);status.textContent="Connected. Loading conversations…";refreshAdminChats();
}
async function fetchAdminThread(requestId){
  const key=adminChatKey();
  if(!key)throw new Error("Connect to Customer Service Chat first.");
  const r=await fetch(`${chatEndpoint()}?requestId=${encodeURIComponent(requestId)}`,{headers:{"X-Chat-Admin-Key":key}});
  const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Could not load conversation.");return d.thread;
}
async function refreshAdminChats(){
  const list=document.getElementById("adminChatList");if(!list)return;
  if(!adminChatKey()){list.innerHTML='<p class="hint">Connect above to view client conversations.</p>';return;}
  try{
    const r=await fetch(chatEndpoint(),{headers:{"X-Chat-Admin-Key":adminChatKey()}});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Could not load chat threads.");
    const threads=d.threads||[];
    if(!threads.length){list.innerHTML='<p class="hint">No customer conversations yet.</p>';return;}
    list.innerHTML=threads.map(x=>`<div class="admin-chat-row"><div><b>${escapeHTML(x.name||"Client")}</b><small>${escapeHTML(x.requestId)} · ${escapeHTML(x.email)} · ${x.messages?.length||0} message(s)</small></div><button class="secondary-btn" type="button" onclick="openAdminChat('${escapeHTML(x.requestId)}','${escapeHTML(x.name||"Client")}')">OPEN CHAT</button></div>`).join("");
    renderAdminChats();
  }catch(e){list.innerHTML=`<p class="hint">${escapeHTML(e.message||e)}</p>`;}
}
function renderAdminChats(){
  const list=document.getElementById("adminChatList");if(!list)return;
  const q=(document.getElementById("adminChatSearch")?.value||"").toLowerCase().trim();
  list.querySelectorAll(".admin-chat-row").forEach(row=>{row.hidden=q&&!row.textContent.toLowerCase().includes(q);});
}
let activeAdminThread=null;
function renderAdminThread(thread){
  const box=document.getElementById("adminChatMessages");if(!box)return;
  box.innerHTML=(thread.messages||[]).map(m=>`<div class="admin-chat-msg ${m.sender==='admin'?'admin':'client'}"><b>${m.sender==='admin'?'You':'Client'}</b><span>${escapeHTML(m.text)}</span><small>${escapeHTML(new Date(m.createdAt).toLocaleString())}</small></div>`).join("")||'<p class="hint">No messages yet.</p>';
  box.scrollTop=box.scrollHeight;
}
async function openAdminChat(id,name){
  try{
    activeAdminThread=await fetchAdminThread(id);
    document.getElementById("adminChatList").classList.add("hidden");
    document.getElementById("adminChatRoom").classList.remove("hidden");
    document.getElementById("adminChatTitle").textContent=`Chat with ${name}`;
    document.getElementById("adminChatMeta").textContent=`${id} · ${activeAdminThread.email}`;
    document.getElementById("adminChatText").value="";document.getElementById("adminChatRoomStatus").textContent="Conversation loaded.";renderAdminThread(activeAdminThread);
  }catch(e){alert(String(e.message||e));}
}
function closeAdminChat(){activeAdminThread=null;document.getElementById("adminChatRoom").classList.add("hidden");document.getElementById("adminChatList").classList.remove("hidden");}
async function sendAdminChatReply(){
  if(!activeAdminThread)return;const text=document.getElementById("adminChatText").value.trim();if(!text)return;
  const status=document.getElementById("adminChatRoomStatus");status.textContent="Sending…";
  try{
    const r=await fetch(chatEndpoint(),{method:"POST",headers:{"Content-Type":"application/json","X-Chat-Admin-Key":adminChatKey()},body:JSON.stringify({action:"message",requestId:activeAdminThread.requestId,sender:"admin",text})});
    const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Reply could not be sent.");
    activeAdminThread=d.thread;document.getElementById("adminChatText").value="";renderAdminThread(activeAdminThread);status.textContent="Reply sent. Client email notification is attempted when email settings are configured.";
  }catch(e){status.textContent=String(e.message||e);}
}

window.connectAdminChat=connectAdminChat;window.refreshAdminChats=refreshAdminChats;window.renderAdminChats=renderAdminChats;window.openAdminChat=openAdminChat;window.closeAdminChat=closeAdminChat;window.sendAdminChatReply=sendAdminChatReply;

/* ---------------------------- homepage media ---------------------------- */
function media(){
  const g=get();
  const slides=Array.isArray(g.heroSlides)?g.heroSlides:[];
  const grid=document.getElementById("heroGrid");
  grid.innerHTML=slides.length?slides.map((s,i)=>`
    <div class="media-thumb">
      <img src="${escapeHTML(s.src)}" alt="Slide ${i+1}">
      <button type="button" class="thumb-remove" title="Remove image" onclick="removeHeroImage(${i})">✕</button>
    </div>`).join(""):"<p class='hint'>No custom photos yet — the site is showing the default gradient slideshow.</p>";
  const logoPrev=document.getElementById("logoPreview");
  if(g.logo)logoPrev.innerHTML=`<img src="${escapeHTML(g.logo)}" alt="Logo">`;
  else logoPrev.textContent="G";
  const usage=document.getElementById("mediaStorageUsage");
  if(usage)usage.textContent=`Browser media storage used: approximately ${storageUsage()} KB.`;
}
async function addHeroImages(fileList){
  const files=Array.from(fileList||[]);
  if(!files.length)return;
  const status=document.getElementById("mediaUploadStatus");
  const g=get();g.heroSlides=Array.isArray(g.heroSlides)?g.heroSlides:[];
  try{
    for(const f of files){
      const dataUrl=await fileToDataURL(f,{maxWidth:1800,maxHeight:1100,maxBytes:15*1024*1024});
      g.heroSlides.push({src:dataUrl,name:f.name});
    }
    save(g);
    if(status)status.textContent=`${files.length} image${files.length>1?"s":""} uploaded and compressed successfully.`;
  }catch(e){
    if(status)status.textContent=e.message||String(e);
    alert(e.message||String(e));
  }finally{
    const input=document.getElementById("heroUpload");if(input)input.value="";
    media();
  }
}
function removeHeroImage(i){
  const g=get();if(!Array.isArray(g.heroSlides))return;
  g.heroSlides.splice(i,1);
  save(g);media();
}
async function setLogo(file){
  if(!file)return;
  try{
    const dataUrl=await fileToDataURL(file,{maxWidth:800,maxHeight:800,maxBytes:12*1024*1024,logo:true});
    const g=get();g.logo=dataUrl;save(g);
    const input=document.getElementById("logoUpload");if(input)input.value="";
    media();
    alert("Company logo updated. Click SAVE SETTINGS after editing the company name.");
  }catch(e){alert(e.message||String(e));}
}
function removeLogo(){
  const g=get();delete g.logo;save(g);media();
}
window.addHeroImages=addHeroImages;
window.removeHeroImage=removeHeroImage;
window.setLogo=setLogo;
window.removeLogo=removeLogo;

/* ---------------------------- services CRUD ---------------------------- */
function services(){
  const s=get().services&&get().services.length?get().services:DEFAULT_SERVICES;
  document.getElementById("servEdit").innerHTML=s.map((x,i)=>`
    <div class="edit-card">
      <button type="button" class="card-remove" title="Remove" onclick="removeService(${i})">✕</button>
      <input data-i="${i}" data-k="0" value="${escapeHTML(x[0])}" placeholder="No. e.g. 01">
      <input data-i="${i}" data-k="1" value="${escapeHTML(x[1])}" placeholder="Service title">
      <textarea data-i="${i}" data-k="2" placeholder="Service description">${escapeHTML(x[2])}</textarea>
    </div>`).join("");
}
function collectServices(){
  const s=[];
  document.querySelectorAll("#servEdit .edit-card").forEach(card=>{
    const a=["",""," "];
    card.querySelectorAll("[data-k]").forEach(x=>a[+x.dataset.k]=x.value);
    s.push(a);
  });
  return s;
}
function addService(){
  const g=get();
  g.services=(g.services&&g.services.length?g.services:DEFAULT_SERVICES.slice());
  g.services=collectServices();
  g.services.push(["0"+(g.services.length+1),"New Service","Describe this service."]);
  save(g);services();
}
function removeService(i){
  const g=get();
  g.services=collectServices();
  g.services.splice(i,1);
  save(g);services();
}
function saveServices(){
  const g=get();g.services=collectServices();save(g);
  alert("Services saved.");services();
}
window.addService=addService;
window.removeService=removeService;
window.saveServices=saveServices;

/* ---------------------------- projects CRUD ---------------------------- */
function projects(){
  const g=get();
  const list=g.projects&&g.projects.length?g.projects:DEFAULT_PROJECTS;
  document.getElementById("projEdit").innerHTML=list.map((p,i)=>`
    <div class="edit-card project-edit-card">
      <button type="button" class="card-remove" title="Remove" onclick="removeProject(${i})">✕</button>
      <div class="project-thumb-row">
        <div class="project-thumb${p.image?"":" grad-fallback "+(p.grad||"p1")}" id="projThumb${i}">${p.image?`<img src="${p.image}" alt="">`:""}</div>
        <label class="secondary-btn upload-btn small">Upload Photo<input type="file" accept="image/*" hidden onchange="setProjectImage(${i},this.files[0])"></label>
        ${p.image?`<button type="button" class="secondary-btn small" onclick="clearProjectImage(${i})">Remove Photo</button>`:""}
      </div>
      <input data-i="${i}" data-k="category" value="${escapeHTML(p.category||"")}" placeholder="Category e.g. LANDSLIDE ASSESSMENT">
      <input data-i="${i}" data-k="title" value="${escapeHTML(p.title||"")}" placeholder="Project title">
      <textarea data-i="${i}" data-k="desc" placeholder="Project description">${escapeHTML(p.desc||"")}</textarea>
    </div>`).join("");
}
function collectProjects(){
  const g=get();
  const existing=g.projects&&g.projects.length?g.projects:DEFAULT_PROJECTS;
  const out=[];
  document.querySelectorAll("#projEdit .project-edit-card").forEach((card,i)=>{
    const base=existing[i]||{grad:"p"+(((i)%3)+1)};
    const item={category:"",title:"",desc:"",image:base.image||"",grad:base.grad||"p"+(((i)%3)+1)};
    card.querySelectorAll("[data-k]").forEach(x=>item[x.dataset.k]=x.value);
    out.push(item);
  });
  return out;
}
function addProject(){
  const g=get();
  g.projects=collectProjects();
  g.projects.push({category:"NEW CATEGORY",title:"New Project",desc:"Describe this project.",image:"",grad:"p"+((g.projects.length%3)+1)});
  save(g);projects();
}
function removeProject(i){
  const g=get();
  g.projects=collectProjects();
  g.projects.splice(i,1);
  save(g);projects();
}
async function setProjectImage(i,file){
  if(!file)return;
  try{
    const dataUrl=await fileToDataURL(file,{maxWidth:1600,maxHeight:1000,maxBytes:15*1024*1024});
    const g=get();
    g.projects=collectProjects();
    g.projects[i].image=dataUrl;
    save(g);projects();
  }catch(e){console.error(e);}
}
function clearProjectImage(i){
  const g=get();
  g.projects=collectProjects();
  g.projects[i].image="";
  save(g);projects();
}
function saveProjects(){
  const g=get();g.projects=collectProjects();save(g);
  alert("Projects saved.");projects();
}
window.addProject=addProject;
window.removeProject=removeProject;
window.setProjectImage=setProjectImage;
window.clearProjectImage=clearProjectImage;
window.saveProjects=saveProjects;

/* ---------------------------- news CRUD ---------------------------- */
function news(){
  const s=get().news&&get().news.length?get().news:DEFAULT_NEWS;
  document.getElementById("newsEdit").innerHTML=s.map((x,i)=>`
    <div class="edit-card">
      <button type="button" class="card-remove" title="Remove" onclick="removeNews(${i})">✕</button>
      <input data-i="${i}" data-k="0" value="${escapeHTML(x[0])}" placeholder="Tag e.g. GIS INSIGHT">
      <input data-i="${i}" data-k="1" value="${escapeHTML(x[1])}" placeholder="Headline">
      <textarea data-i="${i}" data-k="2" placeholder="Summary">${escapeHTML(x[2])}</textarea>
    </div>`).join("");
}
function collectNews(){
  const s=[];
  document.querySelectorAll("#newsEdit .edit-card").forEach(card=>{
    const a=["","",""];
    card.querySelectorAll("[data-k]").forEach(x=>a[+x.dataset.k]=x.value);
    s.push(a);
  });
  return s;
}
function addNews(){
  const g=get();
  g.news=collectNews();
  g.news.push(["UPDATE","New headline","Short summary of this update."]);
  save(g);news();
}
function removeNews(i){
  const g=get();
  g.news=collectNews();
  g.news.splice(i,1);
  save(g);news();
}
function saveNews(){
  const g=get();g.news=collectNews();save(g);
  alert("Updates saved.");news();
}
window.addNews=addNews;
window.removeNews=removeNews;
window.saveNews=saveNews;

/* ---------------------------- settings ---------------------------- */
function settingsForm(){
  const g=get();
  const c=Object.assign({},DEFAULT_CONTACT,g.contact||{});
  document.getElementById("name").value=g.name||"GeoShield Mapping Services";
  document.getElementById("heroHeadline").value=g.heroHeadline||"Mapping the past.\nAssessing the present.\nUnderstanding potential.";
  document.getElementById("heroSub").value=g.heroSub||"Specialized geospatial services for landslide and soil erosion assessment using QGIS-based analysis and spatial data.";
  document.getElementById("about").value=g.aboutText||"GeoShield Mapping Services focuses on landslide and soil erosion mapping, historical change analysis, susceptibility assessment, and monitoring. Our goal is to transform spatial data into clear, useful information for planning and decision-making.";
  document.getElementById("cPhone").value=c.phone;
  document.getElementById("cEmail").value=c.email;
  document.getElementById("cArea").value=c.area;
  document.getElementById("emailEndpoint").value=g.emailEndpoint||"/api/send-completion-email";
  document.getElementById("chatEndpoint").value=g.chatEndpoint||"/api/chat";
}
function saveSettings(){
  const g=get();
  g.name=document.getElementById("name").value;
  g.heroHeadline=document.getElementById("heroHeadline").value;
  g.heroSub=document.getElementById("heroSub").value;
  g.aboutText=document.getElementById("about").value;
  g.contact={
    phone:document.getElementById("cPhone").value||DEFAULT_CONTACT.phone,
    email:document.getElementById("cEmail").value||DEFAULT_CONTACT.email,
    area:document.getElementById("cArea").value||DEFAULT_CONTACT.area
  };
  g.emailEndpoint=document.getElementById("emailEndpoint").value.trim()||"/api/send-completion-email";
  g.chatEndpoint=document.getElementById("chatEndpoint").value.trim()||"/api/chat";
  save(g);
  document.getElementById("saved").textContent="Website settings saved.";
  setTimeout(()=>{document.getElementById("saved").textContent="";},2500);
}
window.saveSettings=saveSettings;


/* ---------------------------- editable GIS map ---------------------------- */
const DEFAULT_GIS_MAP={
  title:"SAMPLE GIS MAP",
  center:[12.8797,121.7740],
  zoom:6,
  markers:[
    {id:"m1",name:"High susceptibility area",category:"High susceptibility",lat:10.3157,lng:123.8854,color:"#d92d20"},
    {id:"m2",name:"Moderate susceptibility area",category:"Moderate susceptibility",lat:10.7202,lng:122.5621,color:"#d9a514"},
    {id:"m3",name:"Sample erosion site",category:"Erosion site",lat:11.2447,lng:125.0039,color:"#6b46c1"}
  ]
};
let adminGISMap=null;
let adminGISMarkers=[];

function gisData(){
  const g=get();
  return Object.assign({},DEFAULT_GIS_MAP,g.gisMap||{},{
    center:Array.isArray(g.gisMap?.center)&&g.gisMap.center.length===2?g.gisMap.center:DEFAULT_GIS_MAP.center,
    markers:Array.isArray(g.gisMap?.markers)?g.gisMap.markers:DEFAULT_GIS_MAP.markers
  });
}
function gisMarkerIcon(color){
  const safe=/^#[0-9a-f]{6}$/i.test(color||"")?color:"#d92d20";
  return L.divIcon({
    className:"gis-custom-marker",
    html:`<span style="display:block;width:18px;height:18px;background:${safe};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px #0007"></span>`,
    iconSize:[18,18],iconAnchor:[9,9]
  });
}
function initGISMap(){
  const el=document.getElementById("adminGISMap");
  if(!el||!window.L)return;
  const d=gisData();
  if(!adminGISMap){
    adminGISMap=L.map(el,{center:d.center,zoom:d.zoom,scrollWheelZoom:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(adminGISMap);
    adminGISMap.on("click",e=>addGISMarkerAt(e.latlng.lat,e.latlng.lng));
  }
  adminGISMap.setView(d.center,d.zoom);
  renderGISMarkers();
  document.getElementById("gisTitle").value=d.title||"SAMPLE GIS MAP";
  document.getElementById("gisLat").value=Number(d.center[0]).toFixed(6);
  document.getElementById("gisLng").value=Number(d.center[1]).toFixed(6);
  document.getElementById("gisZoom").value=d.zoom||6;
  setTimeout(()=>adminGISMap.invalidateSize(),100);
}
function renderGISMarkers(){
  if(!adminGISMap)return;
  adminGISMarkers.forEach(m=>m.remove());
  adminGISMarkers=[];
  gisData().markers.forEach((m,i)=>{
    const marker=L.marker([m.lat,m.lng],{icon:gisMarkerIcon(m.color),draggable:true}).addTo(adminGISMap);
    marker.bindPopup(`<b>${escapeHTML(m.name)}</b><br>${escapeHTML(m.category)}`);
    marker.on("dragend",()=>{
      const pos=marker.getLatLng();
      const d=gisData();d.markers[i].lat=Number(pos.lat.toFixed(6));d.markers[i].lng=Number(pos.lng.toFixed(6));
      setGISData(d);renderGISMarkerEditor();
    });
    adminGISMarkers.push(marker);
  });
  renderGISMarkerEditor();
}
function setGISData(d){const g=get();g.gisMap=d;save(g);}
function renderGISMarkerEditor(){
  const box=document.getElementById("gisMarkerEdit");if(!box)return;
  const d=gisData();
  box.innerHTML=d.markers.length?d.markers.map((m,i)=>`
    <div class="edit-card gis-marker-card">
      <div class="marker-grid">
        <label>Name<input data-gis="${i}" data-k="name" value="${escapeHTML(m.name)}"></label>
        <label>Category<input data-gis="${i}" data-k="category" value="${escapeHTML(m.category)}"></label>
        <label>Latitude<input data-gis="${i}" data-k="lat" type="number" step="0.000001" value="${m.lat}"></label>
        <label>Longitude<input data-gis="${i}" data-k="lng" type="number" step="0.000001" value="${m.lng}"></label>
      </div>
      <div class="marker-actions">
        <label>Color <input class="color-input" data-gis="${i}" data-k="color" type="color" value="${/^#[0-9a-f]{6}$/i.test(m.color||"")?m.color:"#d92d20"}"></label>
        <button type="button" class="secondary-btn" onclick="focusGISMarker(${i})">Locate</button>
        <button type="button" class="secondary-btn danger" onclick="removeGISMarker(${i})">Remove</button>
      </div>
    </div>`).join(""):"<p class='hint'>No markers. Click the map to add one.</p>";
  box.querySelectorAll("[data-gis]").forEach(input=>{
    input.addEventListener("change",()=>{
      const i=Number(input.dataset.gis),k=input.dataset.k,d=gisData();
      let v=input.value;
      if(["lat","lng"].includes(k))v=Number(v);
      if(k==="color"&&!/^#[0-9a-f]{6}$/i.test(v))return;
      if(!Number.isFinite(v)&&["lat","lng"].includes(k))return;
      d.markers[i][k]=v;setGISData(d);renderGISMarkers();
    });
  });
}
function addGISMarkerAt(lat,lng){
  const d=gisData();
  d.markers.push({id:"m"+Date.now(),name:"New GIS Marker",category:"Custom layer",lat:Number(lat.toFixed(6)),lng:Number(lng.toFixed(6)),color:"#198754"});
  setGISData(d);renderGISMarkers();
  const status=document.getElementById("gisStatus");if(status)status.textContent="Marker added. Edit its details below and save the GIS map.";
}
function removeGISMarker(i){
  const d=gisData();d.markers.splice(i,1);setGISData(d);renderGISMarkers();
}
function focusGISMarker(i){
  const d=gisData(),m=d.markers[i];if(!m||!adminGISMap)return;
  adminGISMap.setView([m.lat,m.lng],Math.max(adminGISMap.getZoom(),12));
  adminGISMarkers[i]?.openPopup();
}
function gisLocateCenter(){
  if(!adminGISMap)return;
  const c=adminGISMap.getCenter();
  document.getElementById("gisLat").value=c.lat.toFixed(6);
  document.getElementById("gisLng").value=c.lng.toFixed(6);
}
function saveGISMap(){
  const lat=Number(document.getElementById("gisLat").value),lng=Number(document.getElementById("gisLng").value);
  const zoom=Number(document.getElementById("gisZoom").value);
  if(!Number.isFinite(lat)||!Number.isFinite(lng)||lat<-90||lat>90||lng<-180||lng>180){alert("Enter valid map coordinates.");return;}
  if(!Number.isFinite(zoom)||zoom<2||zoom>19){alert("Zoom must be between 2 and 19.");return;}
  const d=gisData();d.title=document.getElementById("gisTitle").value.trim()||"SAMPLE GIS MAP";d.center=[lat,lng];d.zoom=zoom;
  try{setGISData(d);adminGISMap?.setView(d.center,d.zoom);renderGISMarkers();document.getElementById("gisStatus").textContent="GIS map saved successfully.";}
  catch(e){alert(e.message||String(e));}
}
function gisReset(){
  if(!confirm("Reset the sample GIS map and remove all custom markers?"))return;
  const g=get();g.gisMap=JSON.parse(JSON.stringify(DEFAULT_GIS_MAP));save(g);initGISMap();
  document.getElementById("gisStatus").textContent="Sample GIS map restored.";
}
window.initGISMap=initGISMap;window.gisLocateCenter=gisLocateCenter;window.saveGISMap=saveGISMap;window.gisReset=gisReset;window.removeGISMarker=removeGISMarker;window.focusGISMarker=focusGISMarker;

/* ---------------------------- PH locations reference (PSGC) ---------------------------- */
const PSGC_PRIMARY="https://psgc.cloud/api/v2";
const PSGC_FALLBACK="https://psgc.gitlab.io/api";
let locInitDone=false;

async function getJSON(url,attempts=1){
  let lastErr;
  for(let i=0;i<=attempts;i++){
    try{
      const res=await fetch(url,{headers:{"Accept":"application/json"}});
      if(!res.ok)throw new Error("HTTP "+res.status);
      const json=await res.json();
      if(Array.isArray(json))return json;
      if(Array.isArray(json?.data))return json.data;
      throw new Error("Unexpected API response");
    }catch(err){
      lastErr=err;
      if(i<attempts)await new Promise(r=>setTimeout(r,450*(i+1)));
    }
  }
  throw lastErr;
}

function locFill(el,items,placeholder){
  el.innerHTML=`<option value="">${placeholder}</option>`;
  (Array.isArray(items)?items:[]).forEach(x=>{
    const o=document.createElement("option");
    o.value=x.code;
    o.textContent=x.name;
    el.appendChild(o);
  });
  el.disabled=false;
}
function locReset(el,placeholder){
  el.innerHTML=`<option value="">${placeholder}</option>`;
  el.disabled=true;
}
function locIsNCR(){
  const el=document.getElementById("locRegion");
  const name=el.options[el.selectedIndex]?.text||"";
  return el.value==="130000000" || /National Capital Region|\bNCR\b/i.test(name);
}

async function getLocationData(path){
  const clean=String(path).replace(/^\/+/,"");
  let primaryError=null;
  try{
    return await getJSON(`${PSGC_PRIMARY}/${clean}`,2);
  }catch(err){primaryError=err;}
  try{
    return await getJSON(`${PSGC_FALLBACK}/${clean.replace(/^api\/v2\//,"")}`,1);
  }catch(fallbackErr){
    const e=new Error(`Location lookup failed. Primary: ${primaryError?.message||"unknown"}; fallback: ${fallbackErr?.message||"unknown"}`);
    throw e;
  }
}

async function initLocations(){
  if(locInitDone)return;
  const status=document.getElementById("locStatus");
  const regionEl=document.getElementById("locRegion");
  locInitDone=true;
  status.textContent="Loading Philippine geographic data…";
  try{
    const data=await getLocationData("regions");
    locFill(regionEl,data,"Select region");
    status.textContent=`Loaded ${data.length} regions. Choose a region to load its provinces and cities/municipalities.`;
  }catch(err){
    console.error(err);
    locInitDone=false;
    locReset(regionEl,"Unable to load regions");
    status.innerHTML=`Could not load the location directory. <button type="button" class="secondary-btn small-retry" onclick="retryLocations()">Retry</button>`;
  }
}
async function retryLocations(){
  locInitDone=false;
  await initLocations();
}
async function locOnRegion(){
  const regionEl=document.getElementById("locRegion");
  const provinceEl=document.getElementById("locProvince");
  const cityEl=document.getElementById("locCity");
  const barangayEl=document.getElementById("locBarangay");
  const status=document.getElementById("locStatus");

  locReset(provinceEl,"Loading provinces…");
  locReset(cityEl,"Select province first");
  locReset(barangayEl,"Select city first");
  if(!regionEl.value)return;

  try{
    if(locIsNCR()){
      const cities=await getLocationData(`regions/${encodeURIComponent(regionEl.value)}/cities-municipalities`);
      locFill(cityEl,cities,"Select city");
      locReset(provinceEl,"Not applicable (NCR)");
      status.textContent=`Loaded ${cities.length} cities/municipalities for ${regionEl.options[regionEl.selectedIndex].text}.`;
    }else{
      const provinces=await getLocationData(`regions/${encodeURIComponent(regionEl.value)}/provinces`);
      locFill(provinceEl,provinces,"Select province");
      status.textContent=`Loaded ${provinces.length} provinces.`;
    }
  }catch(err){
    console.error(err);
    status.innerHTML=`Could not load the next level. <button type="button" class="secondary-btn small-retry" onclick="retryLocations()">Retry</button>`;
    if(locIsNCR())locReset(cityEl,"Could not load cities");
    else locReset(provinceEl,"Could not load provinces");
  }
}
document.getElementById("locProvince")?.addEventListener("change",async function(){
  const regionEl=document.getElementById("locRegion");
  const cityEl=document.getElementById("locCity");
  const barangayEl=document.getElementById("locBarangay");
  const status=document.getElementById("locStatus");

  locReset(cityEl,"Loading cities / municipalities…");
  locReset(barangayEl,"Select city / municipality first");
  if(!this.value)return;

  try{
    const cities=await getLocationData(`regions/${encodeURIComponent(regionEl.value)}/provinces/${encodeURIComponent(this.value)}/cities-municipalities`);
    locFill(cityEl,cities,"Select city / municipality");
    status.textContent=`Loaded ${cities.length} cities/municipalities.`;
  }catch(err){
    console.error(err);
    locReset(cityEl,"Could not load cities / municipalities");
    status.innerHTML=`Could not load cities/municipalities. <button type="button" class="secondary-btn small-retry" onclick="retryLocations()">Retry</button>`;
  }
});
document.getElementById("locCity")?.addEventListener("change",async function(){
  const regionEl=document.getElementById("locRegion");
  const provinceEl=document.getElementById("locProvince");
  const barangayEl=document.getElementById("locBarangay");
  const status=document.getElementById("locStatus");

  locReset(barangayEl,"Loading barangays…");
  if(!this.value)return;

  try{
    let path;
    if(locIsNCR()){
      path=`regions/${encodeURIComponent(regionEl.value)}/cities-municipalities/${encodeURIComponent(this.value)}/barangays`;
    }else{
      path=`regions/${encodeURIComponent(regionEl.value)}/provinces/${encodeURIComponent(provinceEl.value)}/cities-municipalities/${encodeURIComponent(this.value)}/barangays`;
    }
    const barangays=await getLocationData(path);
    locFill(barangayEl,barangays,"Select barangay");
    status.textContent=`Loaded ${barangays.length} barangays.`;
  }catch(err){
    console.error(err);
    locReset(barangayEl,"Could not load barangays");
    status.innerHTML=`Could not load barangays. <button type="button" class="secondary-btn small-retry" onclick="retryLocations()">Retry</button>`;
  }
});
window.locOnRegion=locOnRegion;
window.retryLocations=retryLocations;

/* ---------------------------- boot ---------------------------- */
if(sessionStorage.getItem("geoAdmin")==="1")load();
