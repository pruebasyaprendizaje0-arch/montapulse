// Version dinámica de la cache (se actualiza automáticamente o con timestamp)
const CACHE_VERSION = 'ubicame-pulse-v-' + Date.now();
const CACHE_NAME = CACHE_VERSION;

// Solo archivos mínimos estáticos sin HTML para evitar retener index.html obsoleto
const STATIC_ASSETS = [
  '/manifest.json'
];

// 1. INSTALACIÓN: Forzar activación inmediata sin esperar a cerrar pestañas
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
});

// 2. ACTIVACIÓN: Purgar todas las cachés viejas (incluyendo v7 y versiones previas)
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('[SW] Purgando caché obsoleta:', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. INTERCEPTACIÓN DE PETICIONES
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Solo peticiones GET
  if (request.method !== 'GET') return;

  // Ignorar APIs externas, Firebase Auth, Firestore y llamadas /api/
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('identitytoolkit.googleapis.com') ||
    url.hostname.includes('firebaseinstallations.googleapis.com') ||
    url.hostname.includes('fcmregistrations.googleapis.com') ||
    url.pathname.startsWith('/api/')
  ) {
    return;
  }

  // A) NAVEGACIÓN / HTML: ESTRATEGIA NETWORK-FIRST ESTRICTA
  // Nunca sirve HTML desde caché si hay conexión a internet.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Fallback offline solo si la red falla totalmente
          return caches.match(request).then((cached) => cached || caches.match('/index.html'));
        })
    );
    return;
  }

  // B) MAPAS (OpenStreetMap / CARTO): STALE-WHILE-REVALIDATE
  if (
    url.hostname.includes('tile.openstreetmap.org') ||
    url.hostname.includes('basemaps.cartocdn.com')
  ) {
    event.respondWith(
      caches.open(CACHE_NAME).then(async (cache) => {
        const cachedResponse = await cache.match(request);
        const fetchPromise = fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            cache.put(request, networkResponse.clone());
          }
          return networkResponse;
        }).catch(() => null);

        return cachedResponse || fetchPromise;
      })
    );
    return;
  }

  // C) ASSETS CON HASH (JS/CSS en /assets/, Google Fonts, unpkg)
  if (
    url.pathname.includes('/assets/') ||
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('unpkg.com')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) return cachedResponse;

        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        });
      })
    );
  }
});
