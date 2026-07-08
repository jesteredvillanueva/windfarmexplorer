/* ACEN Wind Explorer service worker — offline support for the PWA.
   Bump CACHE whenever you ship a new index.html so devices fetch the update. */
const CACHE = 'acen-wind-explorer-v42';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  // Fonts are now embedded in index.html — no font CDN handling needed.

  // App files: serve from cache first, fall back to network.
  // For page navigations, fall back to the cached app shell when offline.
  e.respondWith(
    caches.match(req).then((hit) =>
      hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : undefined))
    )
  );
});
