const CACHE_NAME = 'bible-analysis-suite-v2.0';

// Assets to cache for offline use
const urlsToCache = [
  './',
  './index.html',
  './bible-codes.html',
  './styles.css',
  './manifest.json',
  './img/favicon.png',
  './data/torahNoSpaces.txt',
  './data/precomputed-terms.json',
  './js/test.js',
  './js/load-torah.js',
  './js/search-algorithms.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell and content');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: All content is cached');
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Caching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  const cacheWhitelist = [CACHE_NAME];
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Now ready to handle fetches!');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve from cache, fall back to network
self.addEventListener('fetch', (event) => {
  console.log('Service Worker: Fetch event for', event.request.url);
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the cached response
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }
        
        // Clone the request to ensure it's safe to use
        const fetchRequest = event.request.clone();
        
        // Not in cache - fetch from network
        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              console.log('Service Worker: Network fetch successful, but not cacheable');
              return response;
            }
            
            // Clone the response to ensure it's safe to use
            const responseToCache = response.clone();
            
            // Cache the fetched response
            caches.open(CACHE_NAME)
              .then((cache) => {
                console.log('Service Worker: Caching new resource:', event.request.url);
                cache.put(event.request, responseToCache);
              });
            
            return response;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed:', error);
            
            // For specific file types like HTML files, you might want to return a custom offline page
            // This is a simple implementation - enhance as needed
            if (event.request.url.indexOf('.html') > -1) {
              return caches.match('./index.html');
            }
            
            // For other resources, just let the error propagate
            throw error;
          });
      })
  );
});

// Background sync for searches when offline
self.addEventListener('sync', (event) => {
  if (event.tag === 'search-sync') {
    console.log('Service Worker: Syncing pending searches');
    event.waitUntil(syncPendingSearches());
  }
});

// Function to handle sync of pending searches - to be implemented in future
function syncPendingSearches() {
  // This would handle any pending searches that were attempted while offline
  // For now, just return a resolved promise
  return Promise.resolve();
}
