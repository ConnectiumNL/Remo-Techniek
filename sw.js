const CACHE = 'docviewer-v1';
const PRECACHE = ['/', '/index.html', '/manifest.json', '/documents.json'];

self.addEventListener('install', e => {
    e.waitUntil(
        caches.open(CACHE).then(cache => cache.addAll(PRECACHE))
    );
    self.skipWaiting();
});

self.addEventListener('activate', e => {
    e.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', e => {
    // Only cache same-origin requests, stream PDFs/images fresh
    const url = new URL(e.request.url);
    if (url.origin !== location.origin) {
        e.respondWith(fetch(e.request));
        return;
    }
    e.respondWith(
        caches.match(e.request).then(cached => cached || fetch(e.request))
    );
});
