const CACHE_NAME = 'bible-codes-v7.9';

// Assets to cache for offline use
const urlsToCache = [
  // Core pages
  './',
  './index.html',
  './bible-codes.html',
  './dashboard.html',
  './text-search.html',
  './gematria.html',
  './acronym.html',
  './tsirufim.html',
  './matrix-view.html',
  './book-view.html',
  './test-db.html',
  './test-roots.html',
  './test-dictionaries.html',

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

  // Dictionary data (offline Hebrew dictionary support)
  './data/dictionaries/unified/hebrew-unified.json.gz',
  './data/dictionaries/unified/inflection-map.json.gz',
  './data/dictionaries/openscriptures-bdb.json.gz',
  './data/dictionaries/strongs-hebrew.json.gz',
  './data/dictionaries/hebrew-wiktionary.json.gz',
  './data/embeddings/hebrew-roots.json.gz',
  './data/dictionaries/wikipedia-fulltext.json.gz',
  './data/dictionaries/names-combined.json.gz',
  './data/dictionaries/names-english.json',

  // ELS Index files (large - loaded on demand)
  './data/els-index/els-index-20-min4.json.gz',
  './data/els-index/els-index-50-min4.json.gz',

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
  './engines/dictionary-service.js',
  './engines/els-index.js',
  './engines/scan.worker.js',
  './engines/wrr.worker.js',

  // Tsirufim modules
  './engines/tsirufim/permutations.js',
  './engines/tsirufim/embeddings.js',
  './engines/tsirufim/scoring.js',
  './engines/tsirufim/clustering.js',
  './engines/tsirufim/visualization.js',

  // Integration modules
  './integrations/text-search-root-integration.js',
  './integrations/gematria-root-integration.js',
  './integrations/acronym-root-integration.js',

  // Three.js (local for offline 3D matrix view)
  './lib/three.module.js',
  './lib/OrbitControls.js'
];

// Install event - cache assets
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing v6.0...');

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
  console.log('Service Worker: Activating v6.0...');

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

// Fetch event - network-first for HTML (auto-update), cache-first for assets (fast offline)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);
  const isHTML = url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  const isLocal = url.origin === self.location.origin;

  if (isHTML) {
    // Network-first for HTML pages: bypass HTTP cache to always get latest from server
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then(r => r || caches.match('./index.html')))
    );
  } else if (isLocal && url.pathname.endsWith('.js')) {
    // JS files: network-first (module imports must be fresh), fall back to cache
    event.respondWith(
      fetch(event.request, { cache: 'no-cache' })
        .then((response) => {
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
          }
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache-first for other assets (images, data, fonts): fast offline
    event.respondWith(
      caches.match(event.request)
        .then((cached) => {
          if (cached) return cached;
          return fetch(event.request.clone())
            .then((response) => {
              if (response && response.status === 200 && isLocal) {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, responseToCache));
              }
              return response;
            })
            .catch(error => {
              console.error('Service Worker: Fetch failed:', error);
              throw error;
            });
        })
    );
  }
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
