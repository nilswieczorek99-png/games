/* Knobelkiste – Offline-Speicher. Bei Änderungen VERSION hochzählen. */
var VERSION = 'knobelkiste-v3';
var FILES = [
  './', 'index.html', 'styles.css', 'manifest.webmanifest',
  'js/core.js', 'js/app.js', 'js/home.js', 'js/doomsday.js', 'js/sudoku.js', 'js/crossword.js', 'js/riddles.js', 'js/hangman.js', 'js/brands.js',
  'data/words.js', 'data/riddles.js', 'data/brands.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(FILES); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then(function (hit) {
      var net = fetch(e.request).then(function (res) {
        if (res && res.ok && new URL(e.request.url).origin === location.origin) {
          var copy = res.clone();
          caches.open(VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });
      return hit || net;
    })
  );
});
