// ============================================================================
//  Odmoria — prijedlog mjesta u blizini iz OpenStreetMapa (besplatno)
//  ---------------------------------------------------------------------------
//  Dashboard → Objekt → Vodič → „Predloži mjesta u blizini”.
//  1) Nominatim: adresa/mjesto → koordinate
//  2) Overpass: plaže, restorani, kafići, trgovine i ljekarna u krugu ~2,5 km
//  3) najbliži po vrsti → domaćin odabere → upis u local_places (kao ručni unos)
//
//  Oboje zove PREGLEDNIK domaćina (CORS dopušten), bez naše rute i bez ključa.
//  Pravila korištenja: Nominatim najviše 1 zahtjev u sekundi i bez masovnog
//  korištenja — ovdje je to jedan zahtjev na klik domaćina. Podaci su
//  © OpenStreetMap suradnici (ODbL); natpis stoji u prozoru za odabir.
//  Kategorije su hrvatske i već postoje u rječniku vodiča (jezici.js).
// ============================================================================

const NOMINATIM = 'https://nominatim.openstreetmap.org/search'
// Javni Overpass poslužitelji su često preopterećeni i znaju držati zahtjev
// otvoren bez kraja — zato svaki ima vremensko ograničenje i rezervu.
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter']
const ROK_NOMINATIM = 10000
export const PRIMJER = 'npr. „Vodice, Hrvatska” ili „Put Gaćeleza 5, Vodice”'

// fetch s rokom: kad istekne, zahtjev se prekine (AbortController)
async function sRokom(f, url, opts, ms) {
  const c = typeof AbortController !== 'undefined' ? new AbortController() : null
  const t = c && setTimeout(() => c.abort(), ms)
  try { return await f(url, c ? { ...opts, signal: c.signal } : opts) }
  finally { if (t) clearTimeout(t) }
}

// „Ulica 5, Mjesto, Hrvatska” → redom sve kraći upiti, pa samo mjesto objekta
export function varijante(upit, mjesto = '') {
  const dijelovi = String(upit || '').split(',').map(x => x.trim()).filter(Boolean)
  const out = [dijelovi.join(', ')]
  if (dijelovi.length) out.push(dijelovi.map((x, i) => i === 0 ? x.replace(/\s+(\d+[a-z]?|bb)$/i, '') : x).join(', '))
  for (let i = 1; i < dijelovi.length; i++) out.push(dijelovi.slice(i).join(', '))
  if (mjesto) out.push(mjesto)
  const drzava = /^(hrvatska|croatia|kroatien|croazia|chorwacja|chorvatsko|republika hrvatska)$/i
  return [...new Set(out.filter(x => x && x.length >= 2 && !drzava.test(x)))]
}

// vrsta → kategorija (hrvatski, kao u vodiču), ikona, koliko najviše
export const VRSTE = [
  { k: 'plaza', kategorija: 'Plaže', ikona: '🏖', max: 4, test: t => t.natural === 'beach' || t.leisure === 'beach_resort' },
  { k: 'restoran', kategorija: 'Restorani', ikona: '🍽', max: 4, test: t => t.amenity === 'restaurant' },
  { k: 'kafic', kategorija: 'Kafići', ikona: '☕', max: 3, test: t => ['cafe', 'bar', 'ice_cream'].includes(t.amenity) },
  { k: 'trgovina', kategorija: 'Trgovine', ikona: '🛒', max: 3, test: t => ['supermarket', 'convenience', 'bakery'].includes(t.shop) },
  { k: 'ljekarna', kategorija: 'Ljekarna', ikona: '💊', max: 1, test: t => t.amenity === 'pharmacy' }
]

export function upitOverpass(lat, lon, r = 2500) {
  const o = `(around:${Math.round(r)},${(+lat).toFixed(6)},${(+lon).toFixed(6)})`
  return `[out:json][timeout:14];(` +
    `nwr${o}["natural"="beach"]["name"];` +
    `nwr${o}["leisure"="beach_resort"]["name"];` +
    `nwr${o}["amenity"~"^(restaurant|cafe|bar|ice_cream|pharmacy)$"]["name"];` +
    `nwr${o}["shop"~"^(supermarket|convenience|bakery)$"]["name"];` +
    `);out center tags 300;`
}

// udaljenost u metrima (haversine)
export function metara(a, b) {
  const R = 6371000, r = x => x * Math.PI / 180
  const dLat = r(b.lat - a.lat), dLon = r(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

// „5 min pješice” / „6 min autom” — obje rečenice vodič već prevodi (jezici.js)
export function udaljenost(m) {
  // zračna linija → hod ~70 m/min (ulice nisu ravne)
  const hod = Math.max(1, Math.round(m / 70))
  if (hod <= 25) return `${hod} min pješice`
  return `${Math.max(2, Math.round(m / 1000 * 2 + 2))} min autom`
}

/** Overpass JSON → najbliža mjesta po vrsti. */
export function odaberi(elementi, centar, mjesto = '') {
  const vidjeno = new Set(), po = {}
  const lista = (elementi || []).map(e => {
    const t = e.tags || {}
    const lat = e.lat ?? e.center?.lat, lon = e.lon ?? e.center?.lon
    const v = VRSTE.find(x => x.test(t))
    if (!v || !t.name || lat == null || lon == null) return null
    return { v, ime: String(t.name).trim(), m: metara(centar, { lat, lon }) }
  }).filter(Boolean).sort((a, b) => a.m - b.m)
  const out = []
  for (const x of lista) {
    const kljuc = x.v.k + ':' + x.ime.toLowerCase()
    if (vidjeno.has(kljuc)) continue
    vidjeno.add(kljuc)
    po[x.v.k] = (po[x.v.k] || 0) + 1
    if (po[x.v.k] > x.v.max) continue
    out.push({ icon: x.v.ikona, name: x.ime, category: x.v.kategorija, distance: udaljenost(x.m),
      maps_query: mjesto ? `${x.ime}, ${mjesto}` : x.ime, metara: Math.round(x.m), vrsta: x.v.k })
  }
  // redom vrsta (plaže prve), unutar vrste po udaljenosti
  return out.sort((a, b) => VRSTE.findIndex(v => v.k === a.vrsta) - VRSTE.findIndex(v => v.k === b.vrsta) || a.metara - b.metara)
}

export async function geokodiraj(upit, f = fetch) {
  const u = `${NOMINATIM}?format=jsonv2&limit=1&accept-language=hr&q=${encodeURIComponent(upit)}`
  let r
  try { r = await sRokom(f, u, { headers: { Accept: 'application/json' } }, ROK_NOMINATIM) }
  catch { throw new Error('Pretraga adrese se ne javlja. Provjerite internet i pokušajte ponovno.') }
  if (!r.ok) throw new Error('Pretraga adrese trenutno ne radi (' + r.status + '). Pokušajte za minutu.')
  const d = await r.json()
  if (!d || !d[0]) return null
  // država, županija ili regija nisu mjesto — oko njihova središta nema smisla tražiti
  if (d[0].place_rank != null && +d[0].place_rank < 12) return null
  return { lat: +d[0].lat, lon: +d[0].lon, naziv: d[0].display_name || upit, upit }
}

// Rezerva bez Overpassa: Nominatim „posebni izrazi” (restaurant, beach…) u
// okviru oko objekta (viewbox + bounded=1) vraćaju takva mjesta. Nominatim
// dopušta najviše 1 zahtjev u sekundi — zato redom, s razmakom.
export const NOMINATIM_VRSTE = ['beach', 'restaurant', 'cafe', 'supermarket', 'pharmacy']
const cekaj = ms => new Promise(r => setTimeout(r, ms))
export async function izNominatima(c, f = fetch, razmak = 1100) {
  const dLat = 0.025, dLon = 0.035   // ~2,8 km u svim smjerovima
  const box = [c.lon - dLon, c.lat + dLat, c.lon + dLon, c.lat - dLat].map(x => x.toFixed(5)).join(',')
  const elementi = []
  let uspjelo = 0
  for (let i = 0; i < NOMINATIM_VRSTE.length; i++) {
    if (i) await cekaj(razmak)
    const u = `${NOMINATIM}?format=jsonv2&limit=15&bounded=1&accept-language=hr&viewbox=${box}&q=${NOMINATIM_VRSTE[i]}`
    try {
      const r = await sRokom(f, u, { headers: { Accept: 'application/json' } }, ROK_NOMINATIM)
      if (!r.ok) continue
      uspjelo++
      for (const x of (await r.json()) || []) {
        if (!x.name || !x.category || !x.type) continue
        elementi.push({ lat: +x.lat, lon: +x.lon, tags: { name: x.name, [x.category]: x.type } })
      }
    } catch { /* sljedeća vrsta */ }
  }
  if (!uspjelo) throw new Error('nominatim')
  return elementi
}

/** Cijeli tijek: upit (adresa ili mjesto) → { centar, mjesta }.
    napredak(tekst) javlja korak, da domaćin vidi da se nešto događa.
    Prvo Overpass (bolji podaci) s kratkim rokom, pa Nominatim kao rezerva —
    javni Overpass iz preglednika domaćina zna ne odgovoriti nikako. */
export async function predlozi(upit, mjesto = '', f = fetch, napredak = () => {}, opcije = {}) {
  let c = null
  napredak('Tražim adresu…')
  for (const q of varijante(upit, mjesto)) { c = await geokodiraj(q, f); if (c) break }
  if (!c) return { centar: null, mjesta: [] }
  const razlozi = []
  for (let i = 0; i < OVERPASS.length && i < (opcije.overpassa ?? 2); i++) {
    napredak('Tražim plaže, restorane i trgovine u blizini…')
    try {
      const r = await sRokom(f, OVERPASS[i], { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(upitOverpass(c.lat, c.lon)) }, opcije.rok ?? 8000)
      if (!r.ok) throw new Error('HTTP ' + r.status)
      const d = await r.json()
      return { centar: c, mjesta: odaberi(d.elements, c, mjesto), izvor: 'overpass' }
    } catch (e) { razlozi.push(e && e.name === 'AbortError' ? 'istek' : (e && e.message) || 'mreža') }
  }
  napredak('Tražim drugim putem (može potrajati desetak sekundi)…')
  try {
    const el = await izNominatima(c, f, opcije.razmak ?? 1100)
    return { centar: c, mjesta: odaberi(el, c, mjesto), izvor: 'nominatim', razlozi }
  } catch { razlozi.push('nominatim') }
  throw new Error('OpenStreetMap trenutno ne vraća mjesta. Pokušajte za nekoliko minuta — ili dodajte mjesta ručno („+ Dodaj mjesto”). (' + razlozi.join(', ') + ')')
}
