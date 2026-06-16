const CACHE = 'shevet-achim-v4';
const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for the app HTML (always get the latest when online),
// cache-first for everything else (fonts, library, icons) for speed + offline.
self.addEventListener('fetch', e => {
  const { request } = e;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const isHTML = request.mode === 'navigate' ||
    (request.destination === 'document') ||
    (url.origin === location.origin && url.pathname.replace(/\/$/, '').endsWith('index.html')) ||
    (url.origin === location.origin && (url.pathname === '/' || url.pathname.endsWith('/')));

  if (isHTML) {
    e.respondWith(
      fetch(request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(request, copy));
        return res;
      }).catch(() => caches.match(request).then(h => h || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(request).then(hit => {
      if (hit) return hit;
      return fetch(request).then(res => {
        if (res.ok && (url.origin === location.origin || url.host.includes('gstatic') || url.host.includes('googleapis') || url.host.includes('jsdelivr') || url.host.includes('unpkg') || url.host.includes('cloudflare') || url.host.includes('hebcal') || url.host.includes('sefaria') || url.host.includes('raw.githubusercontent'))) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(request, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
