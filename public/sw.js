// Minimal service worker for PWA install + offline shell fallback.
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('webrtc-shell').then((cache) => cache.addAll(['/index.html'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (
    request.mode === 'navigate' &&
    request.method === 'GET' &&
    request.headers.get('accept')?.includes('text/html')
  ) {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open('webrtc-shell')
        const cached = await cache.match('/index.html')
        return cached ?? Response.error()
      }),
    )
  }
})
