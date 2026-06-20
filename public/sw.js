const CACHE = 'tourneypool-v1'
const PRECACHE = ['/tourneypool/', '/tourneypool/index.html']

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))))
  self.clients.claim()
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    fetch(e.request).then(r => {
      if (r.ok && r.status !== 206 && e.request.url.startsWith(self.location.origin)) {
        const clone = r.clone()
        caches.open(CACHE).then(c => c.put(e.request, clone))
      }
      return r
    }).catch(() => caches.match(e.request))
  )
})

self.addEventListener('push', e => {
  const data = e.data ? e.data.json() : {}
  e.waitUntil(
    self.registration.showNotification(data.title || '⚽ FamilyPool', {
      body: data.body || 'New result!',
      icon: '/tourneypool/icon-192.png',
      badge: '/tourneypool/icon-192.png',
      data: { url: '/tourneypool/predictions' }
    })
  )
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  e.waitUntil(clients.openWindow(e.notification.data?.url || '/tourneypool/'))
})
