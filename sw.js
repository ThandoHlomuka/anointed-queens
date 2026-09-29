/* ANNOINTED QUEENS service worker */
const CACHE = 'aq-v6';

const STABLE_ASSETS = [
  './',
  './index.html',
  './shop.html',
  './custom.html',
  './corporate.html',
  './about.html',
  './shipping-returns.html',
  './faq.html',
  './contact.html',
  './journal.html',
  './style.css',
  './polyfill.js',
  './shares.js',
  './config.js',
  './auth.js',
  './db.js',
  './script.js',
  './manifest.webmanifest',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-512-maskable.png',
  './assets/icons/favicon.png',
  './assets/logo.png',
  './assets/designer/tote-c1.jpg',
  './assets/designer/satchel-v1.jpg',
  './assets/designer/crossbody-c1.jpg',
  './assets/designer/clutch-c2.jpg',
  './assets/designer/mini-c1.jpg',
  './assets/designer/weekender-c1.jpg',
  './assets/designer/leather-c1.jpg',
  './assets/designer/leather-c2.jpg',
  './assets/designer/suede-c1.jpg',
  './assets/designer/boucle-c1.jpg',
  './assets/designer/strap-c1.jpg',
  './assets/designer/chain-c1.jpg',
  './assets/designer/wooden-c1.jpg',
  './assets/designer/longstrap-c1.jpg',
  './assets/designer/crossover-c1.jpg',
  './assets/designer/harness-c1.jpg',
  './assets/designer/cotton-c1.jpg',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700;900&family=Inter:wght@300;400;500;600;700&family=Dancing+Script:wght@600;700&display=swap'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return Promise.allSettled(STABLE_ASSETS.map(function (url) {
        return cache.add(url).catch(function () {});
      }));
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req).then(function (res) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
        return res;
      }).catch(function () {
        return caches.match(req).then(function (m) { return m || caches.match('./index.html'); });
      })
    );
    return;
  }

  event.respondWith(
    fetch(req).then(function (res) {
      if (res && (res.ok || res.type === 'opaque')) {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return caches.match(req); })
  );
});