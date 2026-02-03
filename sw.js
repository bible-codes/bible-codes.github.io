const CACHE_NAME = 'bible-analysis-suite-v5.1';

// Assets to cache for offline use
const urlsToCache = [
  // Core pages
  './',
  './index.html',
  './bible-codes.html',
  './text-search.html',
  './gematria.html',
  './acronym.html',
  './tsirufim.html',
  './matrix-view.html',
  './book-view.html',
  './test-db.html',
  './test-roots.html',

  // Stylesheets
  './styles.css',
  './css/mobile-optimized.css',

  // PWA assets
  './manifest.json',
  './img/favicon.png',
  './icons/icon-192x192.png',
  './icons/icon-512x512.png',
  './icons/apple-touch-icon.png',

  // Core data
  './data/torahNoSpaces.txt',
  './data/precomputed-terms.json',

  // Torah character database - Koren Edition (Rips et al., 1994)
  // 304,805 letters with proper final forms
  './data/genesis-chars.json.gz',
  './data/exodus-chars.json.gz',
  './data/leviticus-chars.json.gz',
  './data/numbers-chars.json.gz',
  './data/deuteronomy-chars.json.gz',

  // Core JavaScript
  './js/test.js',
  './js/load-torah.js',
  './js/search-algorithms.js',
  './js/mobile-nav.js',
  './js/i18n.js',
  './js/pwa-install.js',

  // Database modules
  './db/schema.js',
  './db/loader.js',
  './db/query.js',
  './db/dictionary-schema.js',
  './db/dictionary-loader.js',

  // Search engines
  './engines/search.js',
  './engines/gematria.js',
  './engines/acronym.js',
  './engines/els.worker.js',
  './engines/roots.js',
  './engines/root-integration.js',
  './engines/matrix.js',
  './engines/letter-analysis.js',

  // Tsirufim modules
  './engines/tsirufim/permutations.js',
  './engines/tsirufim/embeddings.js',
  './engines/tsirufim/scoring.js',
  './engines/tsirufim/clustering.js',
  './engines/tsirufim/visualization.js',

  // Integration modules
  './integrations/text-search-root-integration.js',
  './integrations/gematria-root-integration.js',
  './integrations/acronym-root-integration.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v5.1...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell and content');
        // Cache assets individually to handle failures gracefully
        return Promise.allSettled(
          urlsToCache.map(url =>
            cache.add(url).catch(err => {
              console.warn(`Service Worker: Failed to cache ${url}:`, err.message);
              return null;
            })
          )
        );
      })
      .then((results) => {
        const cached = results.filter(r => r.status === 'fulfilled').length;
        console.log(`Service Worker: Cached ${cached}/${urlsToCache.length} resources`);
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Caching failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating v5.1...');

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
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Cache hit - return the cached response
        if (response) {
          return response;
        }

        // Clone the request to ensure it's safe to use
        const fetchRequest = event.request.clone();

        // Not in cache - fetch from network
        return fetch(fetchRequest)
          .then((response) => {
            // Check if we received a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            // Clone the response to ensure it's safe to use
            const responseToCache = response.clone();

            // Cache the fetched response for future
            caches.open(CACHE_NAME)
              .then((cache) => {
                cache.put(event.request, responseToCache);
              });

            return response;
          })
          .catch(error => {
            console.error('Service Worker: Fetch failed:', error);

            // For HTML files, return index.html as fallback
            if (event.request.url.indexOf('.html') > -1) {
              return caches.match('./index.html');
            }

            // For other resources, let the error propagate
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

// Function to handle sync of pending searches
function syncPendingSearches() {
  return Promise.resolve();
}
