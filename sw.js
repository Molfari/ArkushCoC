const CACHE_NAME = 'coc-sheet-v3'; // Оновлена версія кешу
const urlsToCache = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/main.js',
  '/js/data/skillsData.js',
  '/js/utils/calculations.js',
  '/assets/coc-logo.png',
  '/assets/android-chrome-192x192.png',
  '/assets/android-chrome-512x512.png',
  '/assets/apple-touch-icon.png',
  '/assets/favicon.ico',
  '/assets/favicon-16x16.png',
  '/assets/favicon-32x32.png',
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Special+Elite&family=Marck+Script&family=Cinzel:wght@700&display=swap'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
