const CACHE_NAME = 'gf-portal-v2';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon.png',
  './icon-192.png',
  './icon-512.png',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore-compat.js',
  'https://html2canvas.hertzen.com/dist/html2canvas.min.js'
];

// Install Event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets');
      return cache.addAll(ASSETS).catch(err => {
        console.warn('[SW] Pre-caching asset failed:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event (Network-First, falling back to cache if offline)
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;

  const url = event.request.url;
  
  // Only handle local app domain and specific CDNs
  const isTargetOrigin = url.startsWith(self.location.origin) || url.includes('gstatic.com') || url.includes('html2canvas');
  if (!isTargetOrigin) return;

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If response is valid, update the cache and return it
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        // Network failed, fall back to cache
        console.log('[SW] Offline fallback for:', url);
        return caches.match(event.request);
      })
  );
});
