const CACHE_NAME = 'ubicame-pulse-v1';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/explore',
  '/manifest.json'
];

// Instalar el Service Worker y cachear el App Shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Cacheando App Shell estático');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => self.skipWaiting())
  );
});

// Activar y limpiar cachés antiguas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[Service Worker] Limpiando caché antigua:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptar peticiones y aplicar estrategias de almacenamiento en caché
self.addEventListener('fetch', (event) => {
  const requestUrl = new URL(event.request.url);

  // Evitar interceptar peticiones que no sean GET (como escrituras a Firestore)
  if (event.request.method !== 'GET') {
    return;
  }

  // Ignorar peticiones de Firebase Auth/Firestore directas por websockets/SDK (estas usan sus propios mecanismos)
  if (requestUrl.hostname.includes('firestore.googleapis.com') || 
      requestUrl.hostname.includes('identitytoolkit.googleapis.com') ||
      requestUrl.hostname.includes('firebaseinstallations.googleapis.com')) {
    return;
  }

  // 1. Estrategia de 'Stale-While-Revalidate' para mapas (OpenStreetMap / Mapbox) y API/recursos dinámicos
  if (requestUrl.hostname.includes('tile.openstreetmap.org') || 
      requestUrl.hostname.includes('basemaps.cartocdn.com') ||
      requestUrl.pathname.includes('/api/')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          const fetchPromise = fetch(event.request).then((networkResponse) => {
            if (networkResponse.status === 200) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          }).catch(() => {
            // Error silencioso en fetch si está offline, se usará la caché
          });
          return cachedResponse || fetchPromise;
        });
      })
    );
    return;
  }

  // 2. Estrategia de 'Cache First' con caída a red para archivos estáticos locales de la app
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Guardar en caché dinámicamente si es un recurso local de la app
        if (networkResponse.status === 200 && 
            (requestUrl.origin === self.location.origin || 
             requestUrl.hostname.includes('fonts.googleapis.com') || 
             requestUrl.hostname.includes('fonts.gstatic.com') ||
             requestUrl.hostname.includes('unpkg.com'))) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      }).catch((err) => {
        // Si no hay red y es index.html o similar, servir del caché
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw err;
      });
    })
  );
});
