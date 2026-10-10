/* Lumière Analytics · service worker
   - HTML: jaringan dulu (update dari GitHub langsung terpakai), cadangan dari cache saat offline
   - file statis sendiri (ikon, manifest): cache dulu lalu diperbarui di belakang layar
   - permintaan ke luar (Binance, API forex, Worker, AI): tidak disentuh sama sekali */
const VER = 'lumiere-v1';
const SHELL = ['./', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(VER)
      .then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== VER).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const isPage = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isPage) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then(r => {
          if (r && r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put('index.html', cp)); }
          return r;
        })
        .catch(() => caches.match('index.html').then(r => r || caches.match('./')))
    );
    return;
  }

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(r => {
        if (r && r.ok) { const cp = r.clone(); caches.open(VER).then(c => c.put(req, cp)); }
        return r;
      }).catch(() => hit);
      return hit || net;
    })
  );
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow('./');
    })
  );
});
