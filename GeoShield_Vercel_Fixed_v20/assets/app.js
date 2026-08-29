/* ==========================================================================
   GeoShield Mapping Services — front-end app
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

function settings(){try{return JSON.parse(localStorage.getItem("geoSettings")||"{}")}catch(e){return{}}}
function escapeHTML(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]))}
function telHref(phone){return "tel:"+String(phone||"").replace(/[^\d+]/g,"")}

/* ---------------------------- animated numbers ---------------------------- */
function animateNumber(el,target,duration=900){
  if(!el)return;
  const value=Number(target);
  if(!Number.isFinite(value))return;
  if(el._counterFrame)cancelAnimationFrame(el._counterFrame);
  const start=Number(el.dataset.counterValue||0);
  const startTime=performance.now();
  const ease=t=>1-Math.pow(1-t,3);
  const decimals=Number.isInteger(value)?0:2;
  const step=now=>{
    const progress=Math.min(1,(now-startTime)/duration);
    const current=start+(value-start)*ease(progress);
    el.textContent=decimals?current.toFixed(decimals):String(Math.round(current)).padStart(String(target).length,'0');
    el.dataset.counterValue=String(current);
    if(progress<1)el._counterFrame=requestAnimationFrame(step);
    else{el.dataset.counterValue=String(value);el.textContent=Number.isInteger(value)?String(value).padStart(String(target).length,'0'):String(value);}
  };
  el._counterFrame=requestAnimationFrame(step);
}

function animateVisibleNumbers(root=document){
  root.querySelectorAll('[data-animate-number]').forEach(el=>{
    if(el.dataset.counterBound==='1')return;
    el.dataset.counterBound='1';
    const target=el.dataset.animateNumber;
    const run=()=>{animateNumber(el,target);};
    if('IntersectionObserver' in window){
      const io=new IntersectionObserver(entries=>{
        if(entries.some(x=>x.isIntersecting)){run();io.disconnect();}
      },{threshold:.25});
      io.observe(el);
    }else run();
  });
}

/* ---------------------------- render page ---------------------------- */
function render(){
  const s=settings();
  const name=s.name||"GeoShield Mapping Services";
  document.querySelectorAll("#brandName,#footerName").forEach(x=>x.textContent=name);
  document.title=name;

  if(s.logo){
    const img=document.getElementById("logoImg");
    img.src=s.logo;img.hidden=false;
    document.getElementById("logoLetter").hidden=true;
  }

  const headlineEl=document.getElementById("heroHeadline");
  if(headlineEl)headlineEl.innerHTML=escapeHTML(s.heroHeadline||"Mapping the past.\nAssessing the present.\nUnderstanding potential.").replace(/\n/g,"<br>");
  const subEl=document.getElementById("heroSub");
  if(subEl)subEl.textContent=s.heroSub||"Specialized geospatial services for landslide and soil erosion assessment using QGIS-based analysis and spatial data.";

  document.getElementById("aboutText").textContent=s.aboutText||"GeoShield Mapping Services focuses on landslide and soil erosion mapping, historical change analysis, susceptibility assessment, and monitoring. Our goal is to transform spatial data into clear, useful information for planning and decision-making.";

  const contact=Object.assign({},DEFAULT_CONTACT,s.contact||{});
  const phoneEls=["utilPhone","contactPhone"];
  phoneEls.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.href=telHref(contact.phone);const sp=el.querySelector("span");if(sp)sp.textContent=contact.phone;else el.textContent=contact.phone;});
  const emailEls=["utilEmail","contactEmail"];
  emailEls.forEach(id=>{const el=document.getElementById(id);if(!el)return;el.href="mailto:"+contact.email;const sp=el.querySelector("span");if(sp)sp.textContent=contact.email;else el.textContent=contact.email;});
  const areaEl=document.getElementById("contactArea");if(areaEl)areaEl.textContent=contact.area;

  const services=(s.services&&s.services.length?s.services:DEFAULT_SERVICES);
  document.getElementById("serviceGrid").innerHTML=services.map(x=>
    `<article class="service"><div class="num" data-animate-number="${escapeHTML(String(x[0]).replace(/[^0-9]/g,""))}">0</div><h3>${escapeHTML(x[1])}</h3><p>${escapeHTML(x[2])}</p><a href="#request" class="request-trigger" data-service="${escapeHTML(x[1])}">REQUEST THIS SERVICE →</a></article>`
  ).join("");
  animateVisibleNumbers(document.getElementById("serviceGrid"));

  const news=(s.news&&s.news.length?s.news:DEFAULT_NEWS);
  renderNews(news);

  const projects=(s.projects&&s.projects.length?s.projects:DEFAULT_PROJECTS);
  document.getElementById("projectGrid").innerHTML=projects.map(p=>{
    const bg=p.image?`style="background-image:url('${p.image}')"`:"";
    const gradClass=p.image?"":(" "+(p.grad||"p1"));
    return `<article><div class="project-img${gradClass}" ${bg}></div><div class="project-body"><small>${escapeHTML(p.category||"")}</small><h3>${escapeHTML(p.title||"")}</h3><p>${escapeHTML(p.desc||"")}</p></div></article>`;
  }).join("");

  document.getElementById("year").textContent=new Date().getFullYear();
  animateVisibleNumbers(document.querySelector(".quick"));

  buildHero(s.heroSlides);
}


/* ---------------------------- public editable GIS map ---------------------------- */
let publicGISMap=null,publicGISMarkers=[];
const DEFAULT_PUBLIC_GIS={
  title:"SAMPLE GIS MAP",center:[12.8797,121.7740],zoom:6,
  markers:[
    {name:"High susceptibility area",category:"High susceptibility",lat:10.3157,lng:123.8854,color:"#d92d20"},
    {name:"Moderate susceptibility area",category:"Moderate susceptibility",lat:10.7202,lng:122.5621,color:"#d9a514"},
    {name:"Sample erosion site",category:"Erosion site",lat:11.2447,lng:125.0039,color:"#6b46c1"}
  ]
};
function publicGISData(){
  const s=settings(),d=s.gisMap||{};
  return {
    title:d.title||DEFAULT_PUBLIC_GIS.title,
    center:Array.isArray(d.center)&&d.center.length===2?d.center:DEFAULT_PUBLIC_GIS.center,
    zoom:Number(d.zoom)||DEFAULT_PUBLIC_GIS.zoom,
    markers:Array.isArray(d.markers)?d.markers:DEFAULT_PUBLIC_GIS.markers
  };
}
function publicGISIcon(color){
  const c=/^#[0-9a-f]{6}$/i.test(color||"")?color:"#d92d20";
  return L.divIcon({className:"gis-custom-marker",html:`<span style="display:block;width:18px;height:18px;background:${c};border:3px solid #fff;border-radius:50%;box-shadow:0 2px 8px #0007"></span>`,iconSize:[18,18],iconAnchor:[9,9]});
}
function initPublicGISMap(){
  const el=document.getElementById("publicGISMap");
  if(!el||!window.L)return;
  const d=publicGISData();
  if(!publicGISMap){
    publicGISMap=L.map(el,{center:d.center,zoom:d.zoom,scrollWheelZoom:true});
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"&copy; OpenStreetMap contributors"}).addTo(publicGISMap);
  }else publicGISMap.setView(d.center,d.zoom);
  publicGISMarkers.forEach(m=>m.remove());publicGISMarkers=[];
  d.markers.forEach(m=>{
    if(!Number.isFinite(Number(m.lat))||!Number.isFinite(Number(m.lng)))return;
    const marker=L.marker([Number(m.lat),Number(m.lng)],{icon:publicGISIcon(m.color)}).addTo(publicGISMap);
    marker.bindPopup(`<b>${escapeHTML(m.name||"GIS Marker")}</b><br>${escapeHTML(m.category||"Custom layer")}<br><small>${Number(m.lat).toFixed(6)}, ${Number(m.lng).toFixed(6)}</small>`);
    publicGISMarkers.push(marker);
  });
  const heading=document.getElementById("publicMapHeading");if(heading)heading.textContent=d.title||DEFAULT_PUBLIC_GIS.title;
  const legend=document.getElementById("publicGISLegend");
  const legendBody=document.getElementById("gisLegendBody");
  const legendToggle=document.getElementById("gisLegendToggle");
  if(legend && legendBody){
    const seen=[];
    d.markers.forEach(m=>{
      const name=(m.category||"Custom layer").trim()||"Custom layer";
      const color=/^#[0-9a-f]{6}$/i.test(m.color||"")?m.color:"#6b7280";
      const key=name.toLowerCase()+"|"+color;
      if(!seen.some(x=>x.key===key))seen.push({key,name,color});
    });
    legendBody.innerHTML=seen.length
      ? seen.map(x=>`<label title="${escapeHTML(x.name)}"><i class="dot" style="background:${x.color}"></i><span>${escapeHTML(x.name)}</span></label>`).join("")
      : `<span class="gis-legend-empty">No mapped layers</span>`;
    if(legendToggle && !legendToggle.dataset.bound){
      legendToggle.dataset.bound="1";
      legendToggle.addEventListener("click",()=>{
        const collapsed=legend.classList.toggle("gis-legend-collapsed");
        legendToggle.setAttribute("aria-expanded",String(!collapsed));
        legendToggle.querySelector("span").textContent=collapsed?"⌄":"⌃";
      });
    }
  }
  setTimeout(()=>publicGISMap.invalidateSize(),100);
}
/* ---------------------------- news pagination ---------------------------- */
let newsPageIndex=0;
const NEWS_PER_PAGE=3;
let newsItems=[];

function renderNews(items){
  newsItems=Array.isArray(items)?items:[];
  const maxPage=Math.max(0,Math.ceil(newsItems.length/NEWS_PER_PAGE)-1);
  newsPageIndex=Math.min(Math.max(0,newsPageIndex),maxPage);

  const start=newsPageIndex*NEWS_PER_PAGE;
  const visible=newsItems.slice(start,start+NEWS_PER_PAGE);
  const grid=document.getElementById("newsGrid");
  if(!grid)return;

  grid.innerHTML=visible.map(n=>
    `<article class="news"><small>${escapeHTML(n[0])}</small><h3>${escapeHTML(n[1])}</h3><p>${escapeHTML(n[2])}</p></article>`
  ).join("");

  const controls=document.getElementById("newsControls");
  const prev=document.getElementById("newsPrev");
  const next=document.getElementById("newsNext");
  const page=document.getElementById("newsPage");
  if(!controls||!prev||!next||!page)return;

  const pageCount=Math.ceil(newsItems.length/NEWS_PER_PAGE);
  controls.hidden=pageCount<=1;
  prev.disabled=newsPageIndex===0;
  next.disabled=newsPageIndex>=pageCount-1;
  page.textContent=pageCount>1?`Page ${newsPageIndex+1} of ${pageCount}`:"";
}

function changeNewsPage(direction){
  const pageCount=Math.ceil(newsItems.length/NEWS_PER_PAGE);
  if(pageCount<=1)return;
  newsPageIndex=Math.min(Math.max(newsPageIndex+direction,0),pageCount-1);
  renderNews(newsItems);
}

document.addEventListener("click",e=>{
  if(e.target.closest("#newsPrev")){changeNewsPage(-1);return;}
  if(e.target.closest("#newsNext")){changeNewsPage(1);return;}
});

/* ---------------------------- hero slideshow ---------------------------- */
let heroIndex=0,heroTimer=null,heroSlideCount=0;
function buildHero(customSlides){
  const wrap=document.getElementById("heroSlides");
  const dotsWrap=document.getElementById("heroDots");
  let slidesHTML="",dotsHTML="";
  const useCustom=Array.isArray(customSlides)&&customSlides.length>0;
  const gradClasses=["grad-a","grad-b","grad-c"];

  if(useCustom){
    heroSlideCount=customSlides.length;
    customSlides.forEach((sl,i)=>{
      slidesHTML+=`<div class="hero-slide${i===0?" active":""}" style="background-image:url('${sl.src}')"></div>`;
      dotsHTML+=`<button type="button" data-i="${i}" class="${i===0?"active":""}" aria-label="Slide ${i+1}"></button>`;
    });
  }else{
    heroSlideCount=gradClasses.length;
    gradClasses.forEach((c,i)=>{
      slidesHTML+=`<div class="hero-slide ${c}${i===0?" active":""}"></div>`;
      dotsHTML+=`<button type="button" data-i="${i}" class="${i===0?"active":""}" aria-label="Slide ${i+1}"></button>`;
    });
  }
  // Preload custom banner images so the first transition does not flash or resize.
  if(useCustom){
    customSlides.forEach(sl=>{
      if(sl && sl.src){ const img=new Image(); img.decoding="async"; img.src=sl.src; }
    });
  }
  wrap.innerHTML=slidesHTML;
  dotsWrap.innerHTML=dotsHTML;
  heroIndex=0;

  dotsWrap.querySelectorAll("button").forEach(b=>b.addEventListener("click",()=>{goHero(+b.dataset.i);restartHeroTimer();}));

  const heroSection=document.getElementById("home");
  // Keep the hero slideshow running continuously, including while hovered.

  restartHeroTimer();
}
function goHero(i){
  const slides=document.querySelectorAll(".hero-slide");
  const dots=document.querySelectorAll(".hero-dots button");
  if(!slides.length)return;
  heroIndex=(i+slides.length)%slides.length;
  slides.forEach((s,idx)=>s.classList.toggle("active",idx===heroIndex));
  dots.forEach((d,idx)=>d.classList.toggle("active",idx===heroIndex));
}
function heroNext(){goHero(heroIndex+1);restartHeroTimer();}
function heroPrev(){goHero(heroIndex-1);restartHeroTimer();}
function stopHeroTimer(){if(heroTimer){clearInterval(heroTimer);heroTimer=null;}}
function restartHeroTimer(){
  stopHeroTimer();
  if(heroSlideCount>1){heroTimer=setInterval(()=>goHero(heroIndex+1),3000);}
}
window.heroNext=heroNext;
window.heroPrev=heroPrev;

/* ---------------------------- mobile menu ---------------------------- */
const navEl=document.getElementById("nav");
const scrimEl=document.querySelector(".navScrim");
const menuBtnEl=document.querySelector(".menuBtn");
function openMenu(){navEl.classList.add("open");scrimEl.classList.add("open");menuBtnEl.setAttribute("aria-expanded","true");document.body.classList.add("modal-open");}
function closeMenu(){navEl.classList.remove("open");scrimEl.classList.remove("open");menuBtnEl.setAttribute("aria-expanded","false");document.body.classList.remove("modal-open");}
function toggleMenu(){navEl.classList.contains("open")?closeMenu():openMenu();}
window.toggleMenu=toggleMenu;
window.closeMenu=closeMenu;
navEl.querySelectorAll("a").forEach(a=>a.addEventListener("click",closeMenu));

/* ---------------------------- request modal ---------------------------- */
const modal=document.getElementById("requestModal");
const serviceSelectEl=document.getElementById("serviceSelect");
function openModal(prefillService){
  modal.classList.add("open");
  modal.setAttribute("aria-hidden","false");
  document.body.classList.add("modal-open");
  if(prefillService){
    Array.from(serviceSelectEl.options).forEach(o=>{if(o.text.trim()===prefillService.trim())serviceSelectEl.value=o.value;});
  }
  setTimeout(()=>{
    initRequestMap();
    if(requestMap)requestMap.invalidateSize();
    document.getElementById("region")?.focus();
  },150);
}
function closeModalFn(){
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden","true");
  document.body.classList.remove("modal-open");
}
document.addEventListener("click",e=>{
  const trigger=e.target.closest(".request-trigger");
  if(trigger){
    e.preventDefault();
    closeMenu();
    openModal(trigger.dataset.service||"");
    return;
  }
  if(e.target.closest("[data-close-modal]")){closeModalFn();}
});
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&modal.classList.contains("open"))closeModalFn();});

/* ---------------------------- PSGC location cascading ---------------------------- */
const PSGC_PRIMARY="https://psgc.cloud/api/v2";
const PSGC_FALLBACK="https://psgc.gitlab.io/api";
const regionEl=document.getElementById("region");
const provinceEl=document.getElementById("province");
const cityEl=document.getElementById("city");
const barangayEl=document.getElementById("barangay");
const zipEl=document.getElementById("zip");
const provinceWrap=document.getElementById("provinceWrap");
const cityWrap=document.getElementById("cityWrap");
const barangayWrap=document.getElementById("barangayWrap");

async function getJSON(url,attempts=1,timeoutMs=6000){
  let lastErr;
  for(let i=0;i<=attempts;i++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const res=await fetch(url,{headers:{"Accept":"application/json"},signal:controller.signal});
      clearTimeout(timer);
      if(!res.ok)throw new Error("HTTP "+res.status);
      const json=await res.json();
      if(Array.isArray(json))return json;
      if(Array.isArray(json?.data))return json.data;
      throw new Error("Unexpected API response");
    }catch(err){
      clearTimeout(timer);
      lastErr=err;
      if(i<attempts)await new Promise(r=>setTimeout(r,450*(i+1)));
    }
  }
  throw lastErr;
}
async function getLocationData(path){
  const clean=String(path).replace(/^\/+/,"");
  try{
    return await getJSON(`${PSGC_PRIMARY}/${clean}`,2);
  }catch(primaryErr){
    try{
      return await getJSON(`${PSGC_FALLBACK}/${clean}`,1);
    }catch(fallbackErr){
      const e=new Error(`Location lookup failed: ${fallbackErr?.message||primaryErr?.message||"unknown error"}`);
      e.primary=primaryErr;e.fallback=fallbackErr;
      throw e;
    }
  }
}
function fillSelect(el,items,placeholder){
  el.innerHTML=`<option value="">${placeholder}</option>`;
  (Array.isArray(items)?items:[]).forEach(x=>{
    const o=document.createElement("option");
    o.value=x.code;
    o.textContent=x.name;
    el.appendChild(o);
  });
  el.disabled=false;
}
function resetSelect(el,placeholder){
  el.innerHTML=`<option value="">${placeholder}</option>`;
  el.disabled=true;
}
function selectedName(el){return el.options[el.selectedIndex]?.text||"";}
function selectedCode(el){return el.value;}
function isNCR(){
  const name=selectedName(regionEl);
  return regionEl.value==="130000000" || /National Capital Region|\bNCR\b/i.test(name);
}

function enableManualFallback(selectEl,wrapEl,label){
  selectEl.style.display="none";
  selectEl.disabled=true;
  selectEl.removeAttribute("required");
  if(wrapEl.querySelector(".manual-fallback-input"))return;
  const input=document.createElement("input");
  input.type="text";
  input.name=selectEl.name;
  input.required=true;
  input.placeholder=`Type ${label} manually`;
  input.className="manual-fallback-input";
  const note=document.createElement("span");
  note.className="field-note";
  note.textContent="Auto-lookup unavailable — please type manually.";
  wrapEl.querySelector(".field-wrap").appendChild(input);
  wrapEl.appendChild(note);
}
function isManual(wrapEl){return !!wrapEl.querySelector(".manual-fallback-input");}
function manualValue(wrapEl){return wrapEl.querySelector(".manual-fallback-input")?.value||"";}
function fieldValue(selectEl,wrapEl){return isManual(wrapEl)?manualValue(wrapEl):selectedName(selectEl);}

async function loadRegions(){
  resetSelect(regionEl,"Loading regions…");
  try{
    const data=await getLocationData("regions");
    fillSelect(regionEl,data,"Select region");
  }catch(err){
    console.error("Regions API:",err);
    enableManualFallback(regionEl,regionEl.closest("label"),"region");
    enableManualFallback(provinceEl,provinceWrap,"province");
    enableManualFallback(cityEl,cityWrap,"city / municipality");
    enableManualFallback(barangayEl,barangayWrap,"barangay");
  }
}
regionEl.addEventListener("change",async()=>{
  resetSelect(provinceEl,"Loading provinces…");
  resetSelect(cityEl,"Select province/region first");
  resetSelect(barangayEl,"Select city/municipality first");
  zipEl.value="";
  provinceWrap.style.display="block";
  provinceEl.required=true;
  if(!regionEl.value)return;
  try{
    if(isNCR()){
      provinceWrap.style.display="none";
      provinceEl.required=false;
      const cities=await getLocationData(`regions/${encodeURIComponent(selectedCode(regionEl))}/cities-municipalities`);
      fillSelect(cityEl,cities,"Select city");
    }else{
      const provinces=await getLocationData(`regions/${encodeURIComponent(selectedCode(regionEl))}/provinces`);
      fillSelect(provinceEl,provinces,"Select province");
    }
  }catch(err){
    console.error("Province/city API:",err);
    enableManualFallback(provinceEl,provinceWrap,"province");
    enableManualFallback(cityEl,cityWrap,"city / municipality");
    enableManualFallback(barangayEl,barangayWrap,"barangay");
  }
});
provinceEl.addEventListener("change",async()=>{
  resetSelect(cityEl,"Loading cities / municipalities…");
  resetSelect(barangayEl,"Select city/municipality first");
  zipEl.value="";
  if(!provinceEl.value)return;
  try{
    const r=encodeURIComponent(selectedCode(regionEl));
    const p=encodeURIComponent(selectedCode(provinceEl));
    const cities=await getLocationData(`regions/${r}/provinces/${p}/cities-municipalities`);
    fillSelect(cityEl,cities,"Select city / municipality");
  }catch(err){
    console.error("City API:",err);
    enableManualFallback(cityEl,cityWrap,"city / municipality");
    enableManualFallback(barangayEl,barangayWrap,"barangay");
  }
});
cityEl.addEventListener("change",async()=>{
  resetSelect(barangayEl,"Loading barangays…");
  zipEl.value="";
  if(!cityEl.value)return;
  try{
    const r=encodeURIComponent(selectedCode(regionEl));
    const c=encodeURIComponent(selectedCode(cityEl));
    let path;
    if(isNCR()){
      path=`regions/${r}/cities-municipalities/${c}/barangays`;
    }else{
      const p=encodeURIComponent(selectedCode(provinceEl));
      path=`regions/${r}/provinces/${p}/cities-municipalities/${c}/barangays`;
    }
    const barangays=await getLocationData(path);
    fillSelect(barangayEl,barangays,"Select barangay");
  }catch(err){
    console.error("Barangay API:",err);
    enableManualFallback(barangayEl,barangayWrap,"barangay");
  }
});
loadRegions();

/* ---------------------------- leaflet request map ---------------------------- */
let requestMap=null,requestMarker=null;
function initRequestMap(){
  if(requestMap)return;
  const mapEl=document.getElementById("requestMap");
  if(!mapEl||!window.L){console.error("Leaflet did not load.");return;}
  requestMap=L.map(mapEl,{center:[12.8797,121.7740],zoom:6,scrollWheelZoom:true});
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{
    maxZoom:19,attribution:"&copy; OpenStreetMap contributors"
  }).addTo(requestMap);
  requestMap.on("click",e=>setMapPin(e.latlng.lat,e.latlng.lng));
  setTimeout(()=>requestMap.invalidateSize(),200);
}
function setMapPin(lat,lng){
  lat=Number(lat);lng=Number(lng);
  if(!Number.isFinite(lat)||!Number.isFinite(lng))return;
  document.getElementById("latitude").value=lat.toFixed(6);
  document.getElementById("longitude").value=lng.toFixed(6);
  if(!requestMarker){
    requestMarker=L.marker([lat,lng],{draggable:true}).addTo(requestMap);
    requestMarker.bindPopup("<b>Project Location</b><br>Drag this pin to adjust.").openPopup();
    requestMarker.on("dragend",()=>{
      const p=requestMarker.getLatLng();
      document.getElementById("latitude").value=p.lat.toFixed(6);
      document.getElementById("longitude").value=p.lng.toFixed(6);
    });
  }else requestMarker.setLatLng([lat,lng]);
  requestMap.setView([lat,lng],16);
}
function clearMapPin(){
  if(requestMarker){requestMap.removeLayer(requestMarker);requestMarker=null;}
  document.getElementById("latitude").value="";
  document.getElementById("longitude").value="";
}
document.getElementById("useLocation")?.addEventListener("click",()=>{
  if(!navigator.geolocation){alert("Geolocation is not supported by this browser.");return;}
  navigator.geolocation.getCurrentPosition(
    p=>setMapPin(p.coords.latitude,p.coords.longitude),
    ()=>alert("Could not access your location. Please allow location permission or click the map manually."),
    {enableHighAccuracy:true,timeout:12000,maximumAge:0}
  );
});
document.getElementById("clearLocation")?.addEventListener("click",clearMapPin);

/* ---------------------------- form submit ---------------------------- */
document.getElementById("requestForm").addEventListener("submit",e=>{
  e.preventDefault();
  const regionOk=isManual(regionEl.closest("label"))?manualValue(regionEl.closest("label")):regionEl.value;
  const cityOk=isManual(cityWrap)?manualValue(cityWrap):cityEl.value;
  const barangayOk=isManual(barangayWrap)?manualValue(barangayWrap):barangayEl.value;
  if(!regionOk||!cityOk||!barangayOk){
    alert("Please complete Region, City/Municipality, and Barangay.");
    return;
  }
  const fd=new FormData(e.target);
  const d=Object.fromEntries(fd.entries());
  d.region=fieldValue(regionEl,regionEl.closest("label"));
  d.province=provinceWrap.style.display==="none"?"National Capital Region":fieldValue(provinceEl,provinceWrap);
  d.city=fieldValue(cityEl,cityWrap);
  d.barangay=fieldValue(barangayEl,barangayWrap);
  d.address=[d.streetAddress,d.barangay,d.city,d.province,d.region,"Philippines"].filter(Boolean).join(", ");
  d.coordinates=d.latitude&&d.longitude?`${d.latitude}, ${d.longitude}`:"Not pinned";
  d.id="REQ-"+Date.now();d.status="New";d.date=new Date().toLocaleString();
  delete d.referenceFiles;
  // Save to the server first so the request is visible from any device (including the admin's phone/tablet).
  // Local storage is kept only as an offline fallback/cache, never the source of truth.
  fetch(requestsEndpoint(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.assign({action:"create"},d))})
    .then(r=>r.json()).then(resp=>{if(resp?.ok&&resp.request?.id)d.id=resp.request.id;})
    .catch(()=>{})
    .finally(()=>{
      const requests=JSON.parse(localStorage.getItem("geoRequests")||"[]");
      requests.unshift(d);
      localStorage.setItem("geoRequests",JSON.stringify(requests));
    });
  // Create the customer-service thread on the server. If the API is unavailable, the request still remains recorded locally.
  fetch(chatEndpoint(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",requestId:d.id,email:d.email,name:d.name})})
    .then(r=>r.json()).then(chat=>{if(chat?.ok&&chat.token)localStorage.setItem("geoChatAccess",JSON.stringify({requestId:d.id,email:d.email,token:chat.token}));}).catch(()=>{});
  document.getElementById("requestMsg").innerHTML=`Request received. Your reference is <b>${escapeHTML(d.id)}</b>. You can use Customer Service to chat with GeoShield using this reference and the same email.`;
  e.target.reset();
  clearMapPin();
  resetSelect(provinceEl,"Select region first");
  resetSelect(cityEl,"Select province/region first");
  resetSelect(barangayEl,"Select city/municipality first");
  provinceWrap.style.display="block";provinceEl.required=true;
  setTimeout(()=>{closeModalFn();document.getElementById("requestMsg").textContent="";},2200);
});

/* ---------------------------- service requests API ---------------------------- */
function requestsEndpoint(){
  const configured=settings().requestsEndpoint?.trim();
  if(configured)return configured;
  if(location.hostname.includes("netlify"))return "/.netlify/functions/requests";
  return "/api/requests";
}

/* ---------------------------- customer service chat ---------------------------- */
function chatEndpoint(){
  const configured=settings().chatEndpoint?.trim();
  if(configured)return configured;
  if(location.hostname.includes("netlify"))return "/.netlify/functions/chat";
  return "/api/chat";
}
let chatState={requestId:"",email:"",token:"",thread:null};
function chatEls(){return {modal:document.getElementById("chatModal"),access:document.getElementById("chatAccess"),room:document.getElementById("chatRoom"),messages:document.getElementById("chatMessages"),status:document.getElementById("chatStatus"),accessMsg:document.getElementById("chatAccessMsg")};}
function openChat(){const m=chatEls().modal;if(!m)return;m.classList.add("open");m.setAttribute("aria-hidden","false");document.body.classList.add("chat-open");document.getElementById("chatName")?.focus();}
function closeChat(){const m=chatEls().modal;if(!m)return;m.classList.remove("open");m.setAttribute("aria-hidden","true");document.body.classList.remove("chat-open");}
function renderChat(thread){
  const e=chatEls(); if(!e.messages)return;
  e.messages.innerHTML=(thread.messages||[]).map(m=>`<div class="chat-msg ${m.sender==='client'?'client':'admin'}"><div>${escapeHTML(m.text)}</div><small>${m.sender==='client'?'You':'GeoShield Customer Service'} · ${escapeHTML(new Date(m.createdAt).toLocaleString())}</small></div>`).join("") || '<div class="chat-empty">No messages yet. Send a message to start the conversation.</div>';
  e.messages.scrollTop=e.messages.scrollHeight;
}
async function openChatConversation(){
  const name=document.getElementById("chatName")?.value.trim(), email=document.getElementById("chatEmail")?.value.trim().toLowerCase();
  const e=chatEls();
  if(!name||!email){e.accessMsg.textContent="Enter your name and email to start chatting.";return;}
  e.accessMsg.textContent="Opening secure conversation…";
  try{
    const existing=JSON.parse(localStorage.getItem("geoChatAccess")||"null");
    let ref=existing?.email===email?existing.requestId:"",token=existing?.email===email?existing.token:"";
    if(!token){
      ref="CHAT-"+Date.now();
      const r=await fetch(chatEndpoint(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",requestId:ref,email,name})});
      const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||"Could not open the conversation.");
      token=data.token;localStorage.setItem("geoChatAccess",JSON.stringify({requestId:ref,email,token}));
    }
    const r=await fetch(`${chatEndpoint()}?requestId=${encodeURIComponent(ref)}&email=${encodeURIComponent(email)}&token=${encodeURIComponent(token)}`);
    const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||"Could not load the conversation.");
    chatState={requestId:ref,email,token,thread:data.thread};
    e.access.classList.add("hidden");e.room.classList.remove("hidden");document.getElementById("chatRoomRef").textContent="Chatting as "+(name||email);renderChat(data.thread);e.status.textContent="Conversation connected.";
  }catch(err){e.accessMsg.textContent=String(err.message||err);}
}
async function sendChatMessage(ev){
  ev.preventDefault();const text=document.getElementById("chatText")?.value.trim();if(!text||!chatState.token)return;
  const status=document.getElementById("chatStatus");status.textContent="Sending…";
  try{
    const r=await fetch(chatEndpoint(),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"message",requestId:chatState.requestId,token:chatState.token,sender:"client",text})});
    const data=await r.json();if(!r.ok||!data.ok)throw new Error(data.error||"Message could not be sent.");
    document.getElementById("chatText").value="";chatState.thread=data.thread;renderChat(data.thread);status.textContent="Sent.";
  }catch(err){status.textContent=String(err.message||err);}
}
function resetChat(){chatState={requestId:"",email:"",token:"",thread:null};document.getElementById("chatAccess")?.classList.remove("hidden");document.getElementById("chatRoom")?.classList.add("hidden");document.getElementById("chatAccessMsg").textContent="";localStorage.removeItem("geoChatAccess");document.getElementById("chatName").value="";document.getElementById("chatEmail").value="";}
function initChat(){
  document.getElementById("chatFab")?.addEventListener("click",openChat);
  document.querySelectorAll("[data-close-chat]").forEach(x=>x.addEventListener("click",closeChat));
  document.getElementById("chatOpenBtn")?.addEventListener("click",openChatConversation);
  document.getElementById("chatForm")?.addEventListener("submit",sendChatMessage);
  document.getElementById("chatChange")?.addEventListener("click",resetChat);
  setInterval(async()=>{
    if(!chatState.token||!chatState.requestId||!document.getElementById("chatModal")?.classList.contains("open"))return;
    try{const r=await fetch(`${chatEndpoint()}?requestId=${encodeURIComponent(chatState.requestId)}&email=${encodeURIComponent(chatState.email)}&token=${encodeURIComponent(chatState.token)}`);const d=await r.json();if(r.ok&&d.ok){chatState.thread=d.thread;renderChat(d.thread);}}catch(e){}
  },5000);
}

/* ---------------------------- privacy center ---------------------------- */
function initPrivacy(){
  const modal=document.getElementById("privacyModal");
  document.getElementById("privacyLink")?.addEventListener("click",()=>{modal?.classList.add("open");modal?.setAttribute("aria-hidden","false");document.body.classList.add("privacy-open");});
  document.querySelectorAll("[data-close-privacy]").forEach(x=>x.addEventListener("click",()=>{modal?.classList.remove("open");modal?.setAttribute("aria-hidden","true");document.body.classList.remove("privacy-open");}));
  const c=document.getElementById("privacyContact");const s=settings();const contact=Object.assign({},DEFAULT_CONTACT,s.contact||{});if(c)c.textContent=`${s.name||"GeoShield Mapping Services"} · ${contact.email}`;
}
initChat();
initPrivacy();

render();
setTimeout(initPublicGISMap,0);
