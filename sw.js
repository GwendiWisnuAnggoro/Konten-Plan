self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  clients.claim();
});

// Selalu ambil versi terbaru dari internet agar data/update selalu live
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request));
});
