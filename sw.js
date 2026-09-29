// ============================================================================
//  Odmoria — rad vodiča bez interneta (service worker)
//
//  Registrira ga samo h.html, s opsegom /h/ — ostatak stranice (dashboard,
//  naslovnica…) ovaj worker uopće ne vidi.
//  - Stranica vodiča: prvo mreža, a bez mreže zadnja spremljena kopija.
//    U HTML-u nema šifri (dolaze iz baze), pa je kopija bezopasna.
//  - Stilovi, pisma i biblioteka (esm.sh): iz predmemorije, osvježe se u
//    pozadini.
//  - Podaci (Supabase, /api) NIKAD se ne spremaju ovdje — vodič sam čuva
//    zadnje stanje u localStorage (vidi izPredmemorije() u h.html).
//
//  Nova verzija: promijeniti VERZIJA — stara predmemorija se obriše.
// ============================================================================

const VERZIJA = 'odmoria-vodic-2'
const LJUSKA = '/h/__ljuska'

self.addEventListener('install', e => {
  self.skipWaiting()
  e.waitUntil(caches.open(VERZIJA).then(c => c.addAll(['/odmoria.css', '/jezici.js'])).catch(() => {}))
})

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    for (const k of await caches.keys()) if (k !== VERZIJA) await caches.delete(k)
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', e => {
  const r = e.request
  if (r.method !== 'GET') return
  const u = new URL(r.url)
  if (r.mode === 'navigate') return e.respondWith(mrezaPaKopija(r))
  const staticno = (u.origin === self.location.origin && (u.pathname === '/odmoria.css' || u.pathname === '/jezici.js' || u.pathname.startsWith('/assets/')))
    || ['esm.sh', 'fonts.googleapis.com', 'fonts.gstatic.com'].includes(u.hostname)
  if (staticno) return e.respondWith(kopijaPaMreza(r))
  // sve ostalo (Supabase, /api/…) ide ravno na mrežu, bez spremanja
})

async function mrezaPaKopija(r) {
  const c = await caches.open(VERZIJA)
  try {
    const res = await fetch(r)
    if (res.ok) { c.put(r, res.clone()); c.put(LJUSKA, res.clone()) }
    return res
  } catch {
    return (await c.match(r)) || (await c.match(LJUSKA))
      || new Response('<!doctype html><meta charset="utf-8"><p style="font:16px sans-serif;padding:24px">Nema interneta. Otvorite vodič ponovno kad se spojite.</p>',
                      { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } })
  }
}

async function kopijaPaMreza(r) {
  const c = await caches.open(VERZIJA)
  const kopija = await c.match(r)
  const mreza = fetch(r).then(res => {
    if (res.ok || res.type === 'opaque') c.put(r, res.clone())
    return res
  }).catch(() => kopija)
  return kopija || mreza
}
