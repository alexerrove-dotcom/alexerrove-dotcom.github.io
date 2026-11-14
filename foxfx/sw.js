const CACHE = 'foxfx-5.2-jiggle';
const scope = new URL(self.registration.scope);
const assets = ['./', './index.html', './manifest.webmanifest', './icon.svg', './vendor/mp4-muxer.mjs', '/photo-studio/icon.svg', '/photo-studio/studio.css?v=2', '/photo-studio/workspace.js?v=2'];
const appPaths = new Set(assets.map(path => new URL(path, scope).pathname));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(assets)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith('foxfx-') && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== scope.origin || !appPaths.has(url.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (response.ok) await cache.put(event.request, response.clone()).catch(() => {});
      return response;
    } catch (error) {
      const cached = await cache.match(event.request, {ignoreSearch: true});
      if (cached) return cached;
      throw error;
    }
  })());
});
