// Service Worker para Radio Super A1
const CACHE_NAME = 'radio-super-a1-v2';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/player.js',
  '/images/favicon.ico'
];

// Instalación
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(URLS_TO_CACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Estrategia de caché
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Stream: siempre red
  if (url.pathname.includes('stream.zeno.fm')) {
    event.respondWith(fetch(event.request));
    return;
  }
  
  // Assets: caché primero
  event.respondWith(
    caches.match(event.request)
      .then(response => response || fetch(event.request))
  );
});