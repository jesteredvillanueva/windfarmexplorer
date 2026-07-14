/* ACEN Wind Explorer service worker — offline support for the PWA.
   Bump CACHE whenever you ship a new index.html so devices fetch the update. */
const CACHE = 'acen-wind-explorer-v48';
const SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

async function broadcast(msg){
  const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
  clients.forEach((c) => c.postMessage(msg));
}
async function cacheHasShell(){
  const c = await caches.open(CACHE);
  const hit = await c.match('./index.html');
  return !!hit;
}

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Tell any open page the offline copy is genuinely ready (shell confirmed in cache).
    if (await cacheHasShell()) await broadcast({ type: 'CACHE_READY' });
  })());
});

// A reloaded / already-installed page can ask "is the cache ready?" — we re-confirm.
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'CHECK_CACHE') {
    e.waitUntil((async () => {
      if (await cacheHasShell()) {
        if (e.source && e.source.postMessage) e.source.postMessage({ type: 'CACHE_READY' });
        else await broadcast({ type: 'CACHE_READY' });
      }
    })());
  }
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
