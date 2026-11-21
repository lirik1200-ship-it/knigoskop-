// Книгоскопъ: офлайн-кэш для установленной игры.
// Страница и day.json — сначала сеть (чтобы обновления приходили сразу), без сети — из кэша.
// Картинки — из кэша с фоновым обновлением; больших панорам храним не больше 24.
const V = 'k1', SHELL = 'shell-' + V, IMG = 'img-' + V, PANO = 'pano-' + V, FONT = 'font-' + V;
const KEEP = [SHELL, IMG, PANO, FONT];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(['./', 'manifest.webmanifest', 'img/emblem.png', 'img/favicon.png', 'img/icon-192.png'])).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => !KEEP.includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

async function networkFirst(req, key) {
  const c = await caches.open(SHELL);
  try {
    const r = await fetch(req);
    if (r.ok) c.put(key || req, r.clone());
    return r;
  } catch (e) {
    return (await c.match(key || req)) || (await c.match('./')) || Response.error();
  }
}
async function staleWhileRevalidate(req, name, limit) {
  const c = await caches.open(name), hit = await c.match(req);
  const net = fetch(req).then(async r => {
    if (r.ok) {
      await c.put(req, r.clone());
      if (limit) { const ks = await c.keys(); for (let i = 0; i < ks.length - limit; i++) await c.delete(ks[i]); }
    }
    return r;
  }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request; if (req.method !== 'GET') return;
  const u = new URL(req.url);
  if (u.origin === location.origin) {
    if (req.mode === 'navigate') return e.respondWith(networkFirst(req, './'));
    if (u.pathname.endsWith('/day.json')) return e.respondWith(networkFirst(req));
    if (/\/img\/day\//.test(u.pathname)) return;               // ролики для канала игре не нужны
    if (/\/img\/l_/.test(u.pathname)) return e.respondWith(staleWhileRevalidate(req, PANO, 24));
    if (/\/img\//.test(u.pathname)) return e.respondWith(staleWhileRevalidate(req, IMG));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) return e.respondWith(staleWhileRevalidate(req, FONT));
});
