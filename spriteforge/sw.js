/* Service worker: cache only local SpriteForge code.
   Never cache external model weights, network API calls or user prompts. */
const CACHE="spriteforge-offline-v3";
const BASE=new URL("./",self.location.href).pathname;
const PRELOAD=["./","./index.html","./local-generator.js","./illustrator-v2.js","./manifest.json","./icon.svg","./sw.js"];
self.addEventListener("install",event=>{
 event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(PRELOAD)).then(()=>self.skipWaiting()));
});
self.addEventListener("activate",event=>{
 event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith("spriteforge-offline-")&&n!==CACHE).map(n=>caches.delete(n)))).then(()=>self.clients.claim()));
});
self.addEventListener("fetch",event=>{
 const req=event.request;
 if(req.method!=="GET")return;
 const url=new URL(req.url);
 if(url.origin!==self.location.origin||!url.pathname.startsWith(BASE))return;
 if(url.pathname.startsWith(BASE+"webgpu/"))return;
 event.respondWith(caches.match(req,{ignoreSearch:true}).then(cached=>{
   if(cached)return cached;
   return fetch(req).then(resp=>{
     if(resp.ok){const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}
     return resp;
   }).catch(()=>caches.match("./index.html"));
 }));
});
