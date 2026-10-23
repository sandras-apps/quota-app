/* Service worker: fa funzionare Quota anche offline.
   Strategia: prima la rete (così ogni aggiornamento arriva subito). Se sei offline, o la rete
   non risponde entro 3 secondi (es. una tacca di segnale in un negozio), usa la copia salvata.
   Le richieste verso altri siti (es. il conteggio anonimo di GoatCounter) non vengono toccate né salvate.
   Quando modifichi i file dell'app, aumenta il numero di VERSION. */
const VERSION = 'quota-v13';
const SHELL = [
  './', 'index.html', 'style.css', 'i18n.js', 'app.js', 'manifest.webmanifest',
  'fonts/plus-jakarta-sans.woff2', 'fonts/inter.woff2',
  'icons/symbol.svg', 'icons/symbol-light.svg', 'icons/favicon.svg', 'icons/favicon.png',
  'icons/apple-touch-icon.png', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png'
];
const SLOW_MS = 3000;

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
  if (url.origin !== location.origin) return; // altri siti: non toccati
  const key = req.mode === 'navigate' ? 'index.html' : req;

  // i font non cambiano: prima la copia salvata
  if (url.pathname.indexOf('/fonts/') !== -1) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
    return;
  }

  // file dell'app: prima la rete; la copia salvata se sei offline o la rete è troppo lenta
  const fromNet = fetch(req.url, { cache: 'no-cache', credentials: 'same-origin' }).then((r) => {
    if (r.ok) { const c = r.clone(); e.waitUntil(caches.open(VERSION).then((x) => x.put(key, c))); }
    return r;
  });
  const fromCache = () => caches.match(key).then((hit) => hit || caches.match(req));
  e.respondWith(new Promise((resolve) => {
    let done = false;
    const finish = (r) => { if (!done && r) { done = true; resolve(r); } };
    const timer = setTimeout(() => { fromCache().then(finish); }, SLOW_MS);
    fromNet.then((r) => { clearTimeout(timer); finish(r); })
      .catch(() => { clearTimeout(timer); fromCache().then((hit) => { if (hit) finish(hit); else finish(Response.error()); }); });
  }));
});
