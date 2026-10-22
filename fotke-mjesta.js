// Odmoria — fotografije preporuka (plaže, restorani…) s Wikimedia Commonsa.
// Besplatno, bez ključa, iz preglednika domaćina (API dopušta CORS s origin=*).
// Redom: oznake iz OpenStreetMapa (wikimedia_commons, wikidata → P18, image na
// Commons) → fotografije snimljene na tom mjestu (geosearch; plaže do 300 m,
// ostalo do 60 m, da ne dođe slika susjedne ulice). Uz svaku sliku ide autor i
// licenca (CC BY / BY-SA traže navođenje) — sprema se u local_places.foto_izvor.
// Domaćin u dashboardu vidi sliku i može je ukloniti.

const COMMONS = 'https://commons.wikimedia.org/w/api.php'
const WIKIDATA = 'https://www.wikidata.org/w/api.php'
const SIRINA = 640
const ROK = 8000

async function dohvati(url, f = fetch) {
  const c = new AbortController(), t = setTimeout(() => c.abort(), ROK)
  try { const r = await f(url, { signal: c.signal }); return r.ok ? await r.json() : null }
  catch { return null }
  finally { clearTimeout(t) }
}
const bezHtml = s => String(s || '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim()
const IP = 'url|extmetadata|mime|size'

// iz odgovora imageinfo → {url, izvor, stranica} (samo fotografije, bez karata i grbova)
function izInfo(stranica) {
  const ii = stranica && stranica.imageinfo && stranica.imageinfo[0]
  if (!ii || !/^image\/(jpeg|png|webp)$/.test(ii.mime || '')) return null
  if (/\b(map|karta|logo|grb|coat[_ ]of[_ ]arms|flag|zastava|plan)\b/i.test(stranica.title || '')) return null
  if (ii.width && ii.width < 400) return null
  const m = ii.extmetadata || {}
  const autor = bezHtml(m.Artist && m.Artist.value).slice(0, 80)
  const lic = bezHtml(m.LicenseShortName && m.LicenseShortName.value).slice(0, 40)
  if (!/^(cc|public domain|pd)/i.test(lic)) return null   // samo slobodne licence
  return { url: ii.thumburl || ii.url, izvor: [autor, lic, 'Wikimedia Commons'].filter(Boolean).join(' · '), stranica: ii.descriptionurl || '' }
}

async function datoteka(ime, f) {
  const naslov = /^file:/i.test(ime) ? ime : 'File:' + ime
  const d = await dohvati(`${COMMONS}?action=query&format=json&origin=*&prop=imageinfo&iiprop=${IP}&iiurlwidth=${SIRINA}&titles=${encodeURIComponent(naslov)}`, f)
  const p = d && d.query && d.query.pages
  return p ? izInfo(Object.values(p)[0]) : null
}

async function wikidata(id, f) {
  if (!/^Q\d+$/.test(id || '')) return null
  const d = await dohvati(`${WIKIDATA}?action=wbgetclaims&format=json&origin=*&property=P18&entity=${id}`, f)
  const ime = d && d.claims && d.claims.P18 && d.claims.P18[0] && d.claims.P18[0].mainsnak && d.claims.P18[0].mainsnak.datavalue && d.claims.P18[0].mainsnak.datavalue.value
  return ime ? datoteka(ime, f) : null
}

export async function blizu(lat, lon, radius, f) {
  if (!Number.isFinite(+lat) || !Number.isFinite(+lon)) return null
  const d = await dohvati(`${COMMONS}?action=query&format=json&origin=*&generator=geosearch&ggscoord=${+lat}|${+lon}&ggsradius=${radius}&ggsnamespace=6&ggslimit=10&prop=imageinfo&iiprop=${IP}&iiurlwidth=${SIRINA}`, f)
  const p = d && d.query && d.query.pages
  if (!p) return null
  // najbliža po redu geosearcha (index), vodoravne imaju prednost
  const sve = Object.values(p).sort((a, b) => (a.index || 0) - (b.index || 0))
  const ok = sve.map(x => ({ x, i: izInfo(x) })).filter(y => y.i)
  const vod = ok.find(y => { const ii = y.x.imageinfo[0]; return ii.width >= ii.height })
  return (vod || ok[0] || {}).i || null
}

// mjesto: {lat, lon, vrsta ('plaza'…), osm: {wikimedia_commons, wikidata, image}}
export async function fotoZa(mjesto, f = fetch) {
  const o = mjesto.osm || {}
  let r = null
  if (o.wikimedia_commons && /^file:/i.test(o.wikimedia_commons)) r = await datoteka(o.wikimedia_commons, f)
  if (!r && o.wikidata) r = await wikidata(String(o.wikidata).split(';')[0].trim(), f)
  if (!r && o.image) { const m = String(o.image).match(/commons\.wikimedia\.org\/wiki\/(File:[^?#]+)/i); if (m) r = await datoteka(decodeURIComponent(m[1]), f) }
  if (!r) r = await blizu(mjesto.lat, mjesto.lon, mjesto.vrsta === 'plaza' ? 300 : 60, f)
  return r
}

// koordinate iz maps_query „lat,lon” (tako ih upisuje prijedlog mjesta)
export function koordinate(q) {
  const m = String(q || '').match(/^\s*(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)\s*$/)
  return m ? { lat: +m[1], lon: +m[2] } : null
}
