/* Service worker: fa funzionare Quota anche offline.
   Strategia: prima la rete (così ogni aggiornamento arriva subito), la copia salvata solo se sei offline.
   Quando modifichi i file dell'app, aumenta il numero di VERSION. */
const VERSION = 'quota-v5';
const SHELL = [
  './', 'index.html', 'style.css', 'app.js', 'manifest.webmanifest',
  'icons/symbol.svg', 'icons/symbol-light.svg', 'icons/favicon.svg', 'icons/favicon.png',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname.endsWith('fonts.googleapis.com') || url.hostname.endsWith('fonts.gstatic.com');
  if (url.origin !== location.origin && !isFont) return;
  if (isFont) {
    // i font non cambiano: prima la copia salvata
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((r) => { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req, c)); return r; })));
    return;
  }
  // file dell'app: prima la rete, poi la copia salvata se sei offline
  e.respondWith(
    fetch(new Request(req, { cache: 'no-cache' })).then((r) => {
      if (r.ok) { const c = r.clone(); caches.open(VERSION).then((x) => x.put(req.mode === 'navigate' ? 'index.html' : req, c)); }
      return r;
    }).catch(() => caches.match(req.mode === 'navigate' ? 'index.html' : req).then((hit) => hit || caches.match(req)))
  );
});
