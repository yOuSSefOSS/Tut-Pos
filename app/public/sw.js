const CACHE_NAME = 'tut-cafe-pwa-v1';

self.addEventListener('install', (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll([
        '/'
      ]);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (e) => {
  // Simple network-first strategy for a local POS system to ensure freshness
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
