// Service worker: caches the app shell and static files so the portal opens offline.
// API calls (/api/*) are never cached.
const CACHE = 'sojp-v1';
const SHELL = ['/', '/dashboard', '/library', '/manifest.webmanifest', '/justice-logo.png', '/icon-192.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;
  // Static build files and images: cache first.
  if (url.pathname.startsWith('/_next/static/') || /\.(png|jpg|jpeg|svg|webp|woff2?|pdf|mp4|docx)$/.test(url.pathname)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); } return res; })));
    return;
  }
  // Pages: network first, fall back to the cached page or the dashboard shell when offline.
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; })
      .catch(() => caches.match(req).then(hit => hit || caches.match(url.pathname.startsWith('/dashboard') ? '/dashboard' : '/'))));
  }
});
