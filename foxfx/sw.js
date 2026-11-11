const CACHE="foxfx-app-v4-1";
const APP_FILES=["./","./index.html","./manifest.webmanifest","./icon.svg"];
self.addEventListener("install",event=>{event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(APP_FILES)));self.skipWaiting()});
self.addEventListener("activate",event=>{event.waitUntil(caches.keys().then(names=>Promise.all(names.filter(n=>n.startsWith("foxfx-app-")&&n!==CACHE).map(n=>caches.delete(n)))));self.clients.claim()});
self.addEventListener("fetch",event=>{const u=new URL(event.request.url);if(event.request.method!=="GET"||u.origin!==self.location.origin||!u.pathname.startsWith("/foxfx/"))return;event.respondWith(fetch(event.request).then(response=>{if(response.ok){const clone=response.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(event.request,clone)))}return response}).catch(()=>caches.match(event.request)))});
