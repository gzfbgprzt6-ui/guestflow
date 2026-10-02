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
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']

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
  return `[out:json][timeout:20];(` +
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
  const r = await f(u, { headers: { Accept: 'application/json' } })
  if (!r.ok) throw new Error('Pretraga mjesta trenutno ne radi (' + r.status + ').')
  const d = await r.json()
  if (!d || !d[0]) return null
  return { lat: +d[0].lat, lon: +d[0].lon, naziv: d[0].display_name || upit }
}

/** Cijeli tijek: upit (adresa ili mjesto) → { centar, mjesta } */
export async function predlozi(upit, mjesto = '', f = fetch) {
  const c = await geokodiraj(upit, f)
  if (!c) return { centar: null, mjesta: [] }
  for (const url of OVERPASS) {
    try {
      const r = await f(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(upitOverpass(c.lat, c.lon)) })
      if (!r.ok) throw new Error('Overpass ' + r.status)
      const d = await r.json()
      return { centar: c, mjesta: odaberi(d.elements, c, mjesto) }
    } catch { /* sljedeći poslužitelj */ }
  }
  throw new Error('Popis mjesta trenutno nije dostupan. Pokušajte za minutu.')
}
