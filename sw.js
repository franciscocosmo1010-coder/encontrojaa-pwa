self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open('ej-v1').then((cache) => cache.addAll([
      './', './index.html', './styles.css', './app.js', './manifest.webmanifest',
      './assets/icons/icon-192.png', './assets/icons/icon-256.png',
      './assets/icons/icon-384.png', './assets/icons/icon-512.png'
    ]))
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((resp) => resp || fetch(e.request))
  );
});