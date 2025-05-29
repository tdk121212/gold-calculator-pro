const CACHE_NAME = 'goldcalcpro-v3'; // تغییر نام کش برای اطمینان از به روزرسانی جدید
const OFFLINE_URL = './offline.html'; // صفحه آفلاین

// لیست تمام فایل‌هایی که باید کش شوند
const urlsToCache = [
    './', // این مسیر برای کش کردن index.html در ریشه پروژه است
    './index.html',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap', // فونت Vazirmatn
    // اگر فایل CSS یا JS دیگری دارید، اینجا اضافه کنید:
    // './style.css',
    // './script.js'
];

self.addEventListener('install', event => {
    console.log('[Service Worker] Installing...');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[Service Worker] Caching all app content');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('[Service Worker] Installation failed:', error);
            })
    );
});

self.addEventListener('activate', event => {
    console.log('[Service Worker] Activating...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[Service Worker] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
        .then(() => self.clients.claim())
        .catch(error => {
            console.error('[Service Worker] Activation failed:', error);
        })
    );
});

self.addEventListener('fetch', event => {
    // برای درخواست‌های خارجی (مانند ویجت‌های tgju.org)، فقط سعی کنید از شبکه بگیرید
    // اگر آفلاین باشید، این درخواست‌ها شکست می‌خورند و این طبیعی است.
    if (event.request.url.startsWith('https://api.tgju.org')) {
        event.respondWith(
            fetch(event.request).catch(error => {
                console.warn('[Service Worker] Failed to fetch external resource:', event.request.url, error);
                // می‌توانید در اینجا یک پاسخ خالی یا یک Placeholder برگردانید
                return new Response(null, { status: 503, statusText: 'Service Unavailable (Offline)' });
            })
        );
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // اگر در کش پیدا شد، آن را برگردانید
                if (response) {
                    console.log('[Service Worker] Serving from cache:', event.request.url);
                    return response;
                }

                // اگر در کش پیدا نشد، از شبکه درخواست کنید
                console.log('[Service Worker] Fetching from network:', event.request.url);
                return fetch(event.request).then(
                    networkResponse => {
                        // اگر پاسخ شبکه معتبر بود، آن را در کش ذخیره کنید
                        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                            let responseToCache = networkResponse.clone();
                            caches.open(CACHE_NAME)
                                .then(cache => {
                                    cache.put(event.request, responseToCache);
                                });
                        }
                        return networkResponse;
                    }
                ).catch(error => {
                    // اگر شبکه در دسترس نبود و در کش هم پیدا نشد، صفحه آفلاین را برگردانید
                    console.error('[Service Worker] Fetch failed, serving offline page:', event.request.url, error);
                    return caches.match(OFFLINE_URL);
                });
            })
    );
});
