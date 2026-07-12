/* Service Worker — cache do app-shell (arquivos locais). Requisições de
   rede (Firebase, CDNs) sempre passam direto para a rede: os dados
   offline reais são tratados pela persistência do Firestore, não aqui. */

const CACHE_NAME = 'indicadores-vt-v1';
const APP_SHELL = [
  './',
  './index.html',
  './css/styles.css',
  './js/data.js',
  './js/sync.js',
  './js/utils.js',
  './js/charts.js',
  './js/auth.js',
  './js/alerts.js',
  './js/views/ranking.js',
  './js/views/dashboard.js',
  './js/views/technicians.js',
  './js/views/production.js',
  './js/views/consultivo.js',
  './js/views/shifts.js',
  './js/views/vacations.js',
  './js/views/reports.js',
  './js/views/admin.js',
  './js/app.js',
  './manifest.json',
  './assets/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;
  if(url.includes('firestore') || url.includes('firebase') || url.includes('googleapis') || url.includes('gstatic') || url.includes('cdn')) return;
  if(e.request.method !== 'GET') return;

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone)).catch(() => {});
      return res;
    }).catch(() => cached))
  );
});
