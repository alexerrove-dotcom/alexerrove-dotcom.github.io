/* SpriteForge offline-first availability with network-first updates.
 * Everything needed for procedural inference is cached on this device.
 * Neither user prompts nor AI inference are sent to a server.
 */
const CACHE="spriteforge-offline-v11";
const BASE=new URL("./",self.location.href).pathname;
const PRELOAD=["./","./index.html","./local-generator.js","./designer-v3.js","./pose-v4.js","./rig-v4.js","./face-v4.js","./illustrator-v2.js","./illustrator-v3.js","./turnaround-v5.js","./turnaround-v6.js","./manifest.json","./icon.svg","./sw.js"];
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
 event.respondWith(
  fetch(req).then(resp=>{
   if(resp.ok){const copy=resp.clone();caches.open(CACHE).then(cache=>cache.put(req,copy)).catch(()=>{});}
   return resp;
  }).catch(async()=>{
   const cached=await caches.match(req,{ignoreSearch:true});
   if(cached)return cached;
   if(req.mode==="navigate")return await caches.match("./index.html")||Response.error();
   return Response.error();
  })
 );
});
