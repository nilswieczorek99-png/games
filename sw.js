/* Altlast aufräumen: Hier lag früher die Knobelkiste direkt im Hauptordner.
   Dieser Service Worker löscht den alten Offline-Speicher und meldet sich ab. */
self.addEventListener('install', function () { self.skipWaiting(); });
self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k.indexOf('knobelkiste-flat') === 0; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.registration.unregister(); })
  );
});
