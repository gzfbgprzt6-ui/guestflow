// ============================================================
// Obavijesti na mobitel domaćina (Web Push) — samo dashboard (opseg /dashboard)
// Poruku šalje api/_push.js (šifrirana, aes128gcm); ovdje se samo prikaže
// i na klik otvori pravi dio dashboarda. Ne sprema ništa i ne dira mrežu —
// vodič za goste ima svoj worker (sw.js, opseg /h/).
// ============================================================

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()))

self.addEventListener('push', e => {
  let m = {}
  try { m = e.data ? e.data.json() : {} } catch { m = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(m.title || 'Odmoria', {
    body: m.body || '',
    tag: m.tag || undefined,
    renotify: !!m.tag,
    icon: '/assets/logo/ikona-192.png',
    badge: '/assets/logo/znak-96.png',
    data: { url: m.url || '/dashboard.html' },
  }))
})

self.addEventListener('notificationclick', e => {
  e.notification.close()
  const cilj = new URL((e.notification.data && e.notification.data.url) || '/dashboard.html', self.location.origin).href
  e.waitUntil((async () => {
    const svi = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const otvoren = svi.find(c => new URL(c.url).pathname.startsWith('/dashboard'))
    if (otvoren) { await otvoren.focus(); return otvoren.navigate ? otvoren.navigate(cilj) : null }
    return self.clients.openWindow(cilj)
  })())
})
