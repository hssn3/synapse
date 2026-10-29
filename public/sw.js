'use strict';
// Service Worker حداقلی PWA
// فقط پوسته و استاتیک را کش می‌کند؛ API هرگز کش نمی‌شود.
const CACHE = 'hosp-v32';  // با هر انتشار استاتیک bump کنید تا پوسته به‌روز شود
const SHELL = ['/', '/index.html', '/manifest.json', '/css/app.css', '/css/ui-polish.css', '/css/mobile-system.css', '/css/mobile-stack.css', '/js/ui-polish.js'];
const NETWORK_FIRST = [/^\/$/, /^\/index\.html$/, /^\/catalog\.html$/];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(SHELL).catch((err) => console.warn('[SW] precache partial fail:', err)))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// پیام از اپ: هنگام خروج کاربر، پوسته‌ی کش‌شده را پاک کن (دستگاه مشترک).
// چرا: کش فقط پوسته/استاتیک است و API هرگز کش نمی‌شود؛ ولی تمیزکاری صریح
// در logout مانع هر نشتِ احتمالی به کاربر بعدی روی دستگاه مشترک می‌شود.
self.addEventListener('message', (e) => {
  if (e && e.data && e.data.type === 'CLEAR_SHELL') {
    e.waitUntil(
      caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    );
  }
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.pathname.startsWith('/api/')) return; // API همیشه شبکه

  // پوسته: Network-First با کش fallback
  if (NETWORK_FIRST.some((rx) => rx.test(url.pathname))) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(e.request).then((hit) => hit || caches.match('/index.html')))
    );
    return;
  }

  // فایل‌های استاتیک: Cache-First
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((res) => {
      const copy = res.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return res;
    }).catch(() => {
      if (e.request.destination === 'document') return caches.match('/index.html');
      return new Response('یافت نشد', { status: 404, statusText: 'Not Found', headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }))
  );
});
