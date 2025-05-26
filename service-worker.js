const CACHE_NAME = 'goldcalcpro-v2'; // تغییر نام کش برای اطمینان از به روزرسانی
const urlsToCache = [
    './index.html',
    './manifest.json',
    './icon-192x192.png',
    './icon-512x512.png',
    'https://fonts.googleapis.com/css2?family=Vazirmatn:wght@400;700&display=swap', // فونت Vazirmatn
    // 'https://api.tgju.org/v1/widget/v2' // این اسکریپت خارجی است و در حالت آفلاین کار نمی‌کند، بهتر است کش نشود مگر اینکه راه حل جایگزین داشته باشید
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache.filter(url => url.startsWith('./'))); // فقط فایل‌های محلی را کش کنید
            })
            .then(() => self.skipWaiting())
            .catch(error => {
                console.error('Failed to cache files during install:', error);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // اگر در کش پیدا شد، آن را برگردانید
                if (response) {
                    return response;
                }
                // در غیر این صورت، از شبکه درخواست کنید
                return fetch(event.request).then(
                    response => {
                        // اگر درخواست شبکه موفق بود و پاسخ معتبر بود، آن را در کش ذخیره کنید
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        let responseToCache = response.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        return response;
                    }
                ).catch(() => {
                    // اگر شبکه در دسترس نبود، می‌توانید یک صفحه آفلاین را برگردانید
                    // برای این مثال، فرض می‌کنیم که index.html صفحه آفلاین ماست
                    return caches.match('./index.html');
                });
            })
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
        .then(() => self.clients.claim())
    );
});
