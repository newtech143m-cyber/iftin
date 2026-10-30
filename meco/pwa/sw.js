/* MECO POWER SUPPLY — service worker: shell-ka waa la keydiyaa, had iyo jeer network-ka ayaa marka hore la isku dayaa (update toos ah) */
const VERSION = 'meco-shell-v3';
const SHELL = ['./', 'index.html', 'manifest.webmanifest', 'icons/icon-192.png', 'icons/icon-512.png', 'icons/favicon.png', 'icons/logo.png', 'icons/badge-96.png'];
const APP = 'MECO POWER SUPPLY';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  if (/\.apk$|^\/api\/|^\/go$/.test(new URL(req.url).pathname)) return;   // APK, API iyo /go (link-ga GAS) — ha keydin
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(VERSION).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(r => r || caches.match('index.html')))
  );
});

function opts(d) {
  return {
    body: d.body || '', icon: 'icons/icon-192.png', badge: 'icons/badge-96.png',
    vibrate: [250, 120, 250, 120, 250], tag: d.tag || ('meco-' + Date.now()), renotify: true,
    silent: false, requireInteraction: false, timestamp: Date.now(), data: { url: d.url || './' }
  };
}
self.addEventListener('message', e => {
  if (e.data && e.data.kp === 'notify') self.registration.showNotification(e.data.title || APP, Object.assign(opts({}), e.data.opt || {}));
});
/* Web Push — ogeysiis pop-up xitaa marka app-ku xiran yahay */
self.addEventListener('push', e => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (x) { d = { title: APP, body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || APP, opts(d)));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
    for (const c of list) { if ('focus' in c) return c.focus(); }
    return self.clients.openWindow(url);
  }));
});
/* Subscription-ku haddii uu dhaco (browser-ku beddelo) — dib u isdiiwaangeli, app-ka ayaa GAS u gudbin doona */
self.addEventListener('pushsubscriptionchange', e => {
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => list.forEach(c => c.postMessage({ kp: 'resub' }))));
});
