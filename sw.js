const CACHE = 'remo-v1';
const STATIC = [
    './manifest.json',
    './icons/icon-folder.svg',
    './icons/icon-pdf.svg',
    './icons/icon-image.svg',
    './icons/favicon.ico',
    './icons/favicon-16x16.png',
    './icons/favicon-32x32.png',
    './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
    e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC).catch(() => {})));
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
    const url = new URL(e.request.url);

    // Always fetch HTML fresh from network so updates land immediately
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request)
                .then(r => { caches.open(CACHE).then(c => c.put(e.request, r.clone())); return r; })
                .catch(() => caches.match(e.request))
        );
        return;
    }

    // Cache-first for local static assets (icons, manifest)
    if (url.origin === self.location.origin) {
        e.respondWith(
            caches.match(e.request).then(hit =>
                hit || fetch(e.request).then(r => {
                    caches.open(CACHE).then(c => c.put(e.request, r.clone()));
                    return r;
                })
            )
        );
        return;
    }

    // External (CDN, Graph API, SharePoint) — always network, never cache
});
