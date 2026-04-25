/// <reference lib="webworker" />

// ---------------------------------------------------------------------------
// Lumina Marketplace — Service Worker
// ---------------------------------------------------------------------------
// Strategy: Network-first for pages/API, cache-first for static assets.
// Provides offline fallback page when network is unavailable.
// ---------------------------------------------------------------------------

const CACHE_VERSION = 'lumina-v1';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`;

const PRECACHE_URLS = [
  '/',
  '/offline',
  '/manifest.json',
];

const STATIC_EXTENSIONS = /\.(js|css|png|jpg|jpeg|svg|webp|avif|woff2?|ico)$/;

// ---------------------------------------------------------------------------
// Install — precache shell
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting()),
  );
});

// ---------------------------------------------------------------------------
// Activate — clean old caches
// ---------------------------------------------------------------------------
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
          .map((key) => caches.delete(key)),
      ),
    ).then(() => self.clients.claim()),
  );
});

// ---------------------------------------------------------------------------
// Fetch — routing strategies
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and cross-origin
  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;

  // API calls — network only (no caching)
  if (url.pathname.startsWith('/api/')) return;

  // Static assets — cache first
  if (STATIC_EXTENSIONS.test(url.pathname) || url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Pages — network first with offline fallback
  event.respondWith(networkFirstWithFallback(request));
});

// ---------------------------------------------------------------------------
// Strategies
// ---------------------------------------------------------------------------

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408 });
  }
}

async function networkFirstWithFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(RUNTIME_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;

    // Offline fallback page
    const fallback = await caches.match('/offline');
    if (fallback) return fallback;

    return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain' } });
  }
}
