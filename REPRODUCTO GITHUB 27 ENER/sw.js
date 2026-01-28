// ========== CONFIGURACIÓN ==========
// CAMBIO IMPORTANTE: Cambiamos la versión a 'v3' para forzar la actualización en todos los celulares
const CACHE_NAME = 'radio-super-a1-v3';

// Lista de archivos estáticos a guardar (CSS, JS, Imágenes)
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/player.js',
  '/images/favicon.ico',
  '/images/apple-touch-icon.png',
  '/images/social-share.jpg' // Asegúrate de que esta imagen existe en tu carpeta images
];

// ========== INSTALACIÓN ==========
self.addEventListener('install', event => {
  console.log('📥 SW: Instalando nueva versión v3...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 SW: Archivos cacheados');
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => {
        // Activa el nuevo SW inmediatamente
        return self.skipWaiting();
      })
  );
});

// ========== ACTIVACIÓN ==========
self.addEventListener('activate', event => {
  console.log('🚀 SW: Activado y limpiando cachés viejos...');
  
  event.waitUntil(
    caches.keys().then(keys => 
      Promise.all(
        // Busca y borra cualquier caché que NO sea la versión v3
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ SW: Borrando caché viejo:', key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => {
      // Toma el control de todas las páginas abiertas inmediatamente
      return self.clients.claim();
    })
  );
});

// ========== ESTRATEGIA DE RED (FETCH) ==========
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // --- LÓGICA CRÍTICA PARA EL AUDIO EN VIVO ---
  // Verificamos si la petición es hacia el servidor de streaming (Zeno)
  // Usamos .href para revisar la URL completa
  if (url.href.includes('stream.zeno.fm') || url.href.includes('zeno.fm')) {
    console.log('🎵 SW: Detectado stream en vivo -> Pasando a red (SIN caché)');
    
    // IMPORTANTE: Nunca cachear el stream de audio.
    // Siempre ir a la red para obtener la señal en tiempo real.
    event.respondWith(
      fetch(event.request)
        .catch(err => {
            console.error('SW: Error de red en stream', err);
            return new Response('Error de conexión de radio', { status: 503 });
        })
    );
    return; // Terminamos la ejecución aquí para el stream
  }
  
  // --- LÓGICA PARA EL RESTO (HTML, CSS, JS, Imágenes) ---
  // Estrategia: "Cache First" (Revisar caché primero, si no, ir a red)
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Si está en caché, devolverlo (rápido)
        if (response) {
          // Opcional: Actualizar en silencio (Stale While Revalidate) para la próxima visita
          // fetch(event.request).then(response => {
          //   caches.open(CACHE_NAME).then(cache => cache.put(event.request, response));
          // });
          return response;
        }
        
        // Si NO está en caché, descargar de internet
        console.log('🌐 SW: Descargando nuevo:', event.request.url);
        return fetch(event.request).then(response => {
          // Verificar si la respuesta es válida
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          // Clonar la respuesta porque un stream solo se puede consumir una vez
          const responseToCache = response.clone();
          
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseToCache);
            });
          
          return response;
        });
      })
  );
});