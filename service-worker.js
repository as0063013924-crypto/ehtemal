/* ============================================================
   Service Worker برای «احتمال‌چی»
   هدف: کش‌کردن تمام فایل‌های لازم برای اجرای کاملا آفلاین
   ============================================================ */

const CACHE_NAME = 'ehtemalchi-cache-v1';

// فقط فایل‌هایی که واقعا در پروژه وجود دارند کش می‌شوند
const CORE_ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // به‌صورت جداگانه اضافه می‌کنیم تا اگر فایلی موجود نبود کل نصب متوقف نشود
      return Promise.all(
        CORE_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('عدم امکان کش کردن:', asset, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// استراتژی: ابتدا کش، در صورت نبود، شبکه؛ و در صورت موفقیت شبکه، کش به‌روزرسانی می‌شود
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // درخواست‌های blob: (مثل manifest پویا) را دست‌نخورده رها کن
  if (event.request.url.startsWith('blob:') || event.request.url.startsWith('data:')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const networkFetch = fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // آفلاین و بدون کش: برای صفحات ناوبری، خود index.html را برگردان
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          return cachedResponse;
        });

      return cachedResponse || networkFetch;
    })
  );
});
