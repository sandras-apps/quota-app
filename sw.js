/* Service worker: fa funzionare Quota anche offline.
   Quando modifichi i file dell'app, aumenta il numero di VERSION così i telefoni scaricano la nuova versione. */
const VERSION = 'quota-v4';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/symbol.svg', 'icons/symbol-light.svg', 'icons/favicon.svg', 'icons/favicon.png',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // pagina: prima la rete (per avere sempre l'ultima versione), poi la cache se sei offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then((r) => { const copy = r.clone(); caches.open(VERSION).then((c) => c.put('index.html', copy)); return r; }).catch(() => caches.match('index.html')));
    return;
  }
  // file dell'app e font: prima la cache, poi la rete
  if (url.origin === location.origin || url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com')) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => {
      if (r.ok || r.type === 'opaque') { const copy = r.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
      return r;
    })));
  }
});
