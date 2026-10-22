const CACHE = 'clearpath-v3';
const FILES = [
  './',
  './index.html',
  './overview.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force the new version to activate immediately
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(FILES))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        keys.map(key => {
          if (key !== CACHE) return caches.delete(key); // Clear old caches
        })
      )
    ).then(() => self.clients.claim()) // Claim all active tabs immediately
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then(networkResponse => {
        if (networkResponse && networkResponse.status === 200) {
          const copy = networkResponse.clone();
          caches.open(CACHE).then(cache => cache.put(event.request, copy));
        }
        return networkResponse;
      })
      .catch(() => caches.match(event.request)) // Fallback to cache if offline
  );
});
