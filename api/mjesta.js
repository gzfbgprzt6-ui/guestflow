// ============================================================
// /api/mjesta — „Predloži mjesta u blizini” preko NAŠEG poslužitelja
//
//   GET /api/mjesta?q=<adresa ili mjesto>&mjesto=<mjesto objekta>
//   Authorization: Bearer <token prijavljenog domaćina>
//   → { ok, centar:{lat,lon,naziv}, elementi:[{lat,lon,tags}], izvor, razlozi }
//
// Zašto poslužitelj: iz preglednika domaćina javni OpenStreetMap servisi
// (Nominatim, Overpass) znaju ne odgovoriti ili privremeno blokirati — oni
// traže da se aplikacija predstavi (User-Agent) i najviše 1 zahtjev u sekundi
// prema Nominatimu, a preglednik User-Agent ne smije postaviti. Ovdje se
// predstavljamo i poštujemo razmak. Odabir najbližih (odaberi()) ostaje u
// pregledniku (mjesta-osm.js) — ruta vraća sirove elemente.
//
// Samo za prijavljenog domaćina (provjera tokena u Supabaseu), da ruta ne
// bude javni posrednik prema OSM-u. Rok cijelog tijeka ~24 s
// (vercel.json maxDuration 30). Bez npm ovisnosti (CommonJS).
// varijante() i upitOverpass() su kopija iz mjesta-osm.js (ESM se ovdje ne
// može uvesti) — mijenjaju se zajedno.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';
const UA = 'Odmoria/1.0 (vodic za goste; https://odmoria.com; podrska@odmoria.com)';
const NOMINATIM = 'https://nominatim.openstreetmap.org/search';
const PHOTON = 'https://photon.komoot.io/api/';
const OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter'];
const NOMINATIM_VRSTE = ['beach', 'restaurant', 'cafe', 'supermarket', 'pharmacy'];
const DRZAVA = /^(hrvatska|croatia|kroatien|croazia|chorwacja|chorvatsko|republika hrvatska)$/i;

const cekaj = ms => new Promise(r => setTimeout(r, ms));

function varijante(upit, mjesto = '') {
  const dijelovi = String(upit || '').split(',').map(x => x.trim()).filter(Boolean);
  const out = [dijelovi.join(', ')];
  // „Krušaka ul. 1a” → „Krušaka ulica 1a” (OSM piše puni naziv)
  if (dijelovi.length && /\bul\.(?=\s|$)/i.test(dijelovi[0])) out.push([dijelovi[0].replace(/\bul\.(?=\s|$)/i, 'ulica'), ...dijelovi.slice(1)].join(', '));
  if (dijelovi.length) out.push(dijelovi.map((x, i) => i === 0 ? x.replace(/\s+(\d+[a-z]?|bb)$/i, '') : x).join(', '));
  for (let i = 1; i < dijelovi.length; i++) out.push(dijelovi.slice(i).join(', '));
  if (mjesto) out.push(mjesto);
  return [...new Set(out.filter(x => x && x.length >= 2 && !DRZAVA.test(x)))];
}

function upitOverpass(lat, lon, r = 2500) {
  const o = `(around:${Math.round(r)},${(+lat).toFixed(6)},${(+lon).toFixed(6)})`;
  return `[out:json][timeout:14];(` +
    `nwr${o}["natural"="beach"]["name"];` +
    `nwr${o}["leisure"="beach_resort"]["name"];` +
    `nwr${o}["amenity"~"^(restaurant|cafe|bar|ice_cream|pharmacy)$"]["name"];` +
    `nwr${o}["shop"~"^(supermarket|convenience|bakery)$"]["name"];` +
    `);out center tags 300;`;
}

async function sRokom(url, opts, ms) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(url, { ...opts, signal: c.signal, headers: { 'User-Agent': UA, Accept: 'application/json', ...(opts && opts.headers) } }); }
  finally { clearTimeout(t); }
}
const razlog = e => (e && e.name === 'AbortError') ? 'istek' : (e && e.message) || 'mreža';

// Photon (komoot) je „neizrazit”: podnosi tipfeler i skraćenice, ali zna
// pogoditi isto ime u drugom mjestu. Zato njegov rezultat vrijedi samo ako
// sadrži zadnji dio upita (mjesto) — „…, Zagreb” mora pasti u Zagreb.
const bez = x => String(x || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/gi, 'd').toLowerCase().trim();
function photonOdgovara(q, p) {
  if (['country', 'state', 'county'].includes(p.type)) return false;
  const dijelovi = String(q).split(',').map(x => x.trim()).filter(Boolean);
  if (dijelovi.length < 2) return true;
  const mjesto = bez(dijelovi[dijelovi.length - 1]);
  const gdje = [p.name, p.city, p.town, p.village, p.district, p.locality, p.county, p.state, p.postcode].map(bez);
  return gdje.some(x => x && (x === mjesto || x.includes(mjesto) || mjesto.includes(x) && x.length > 3));
}

// → { c: {lat,lon,naziv} | null, odgovor: je li servis uopće odgovorio }
async function nominatim(q, razlozi) {
  try {
    const r = await sRokom(`${NOMINATIM}?format=jsonv2&limit=1&accept-language=hr&q=${encodeURIComponent(q)}`, {}, 7000);
    if (!r.ok) throw new Error('nominatim HTTP ' + r.status);
    const d = await r.json();
    // država, županija ili regija nisu mjesto — oko njihova središta nema smisla tražiti
    if (d && d[0] && !(d[0].place_rank != null && +d[0].place_rank < 12)) return { c: { lat: +d[0].lat, lon: +d[0].lon, naziv: d[0].display_name || q }, odgovor: true };
    return { c: null, odgovor: true };
  } catch (e) { razlozi.push('nominatim ' + razlog(e)); return { c: null, odgovor: false }; }
}
async function photon(q, razlozi) {
  try {
    const r = await sRokom(`${PHOTON}?limit=3&q=${encodeURIComponent(q)}`, {}, 7000);
    if (!r.ok) throw new Error('photon HTTP ' + r.status);
    const f = ((await r.json()).features || []).find(x => x && x.geometry && photonOdgovara(q, x.properties || {}));
    if (!f) return { c: null, odgovor: true };
    const p = f.properties || {};
    return { c: { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0],
      naziv: [p.name, p.street && (p.street + (p.housenumber ? ' ' + p.housenumber : '')), p.city || p.town || p.village, p.country].filter(Boolean).join(', ') || q }, odgovor: true };
  } catch (e) { razlozi.push('photon ' + razlog(e)); return { c: null, odgovor: false }; }
}
// Oba istodobno; Nominatim ima prednost (točniji), Photon pokriva tipfeler,
// skraćenice i Nominatim koji ne odgovara.
async function geokodiraj(q, razlozi) {
  const [n, p] = await Promise.all([nominatim(q, razlozi), photon(q, razlozi)]);
  return { c: n.c || p.c, odgovor: n.odgovor || p.odgovor };
}

async function domacin(req) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tok) return null;
  try {
    const u = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + tok } });
    if (!u.ok) return null;
    const d = await u.json();
    return d && d.id ? d : null;
  } catch { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const posalji = (s, o) => { res.statusCode = s; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(o)); };
  const q = req.query || {};
  const upit = String(q.q || '').slice(0, 200).trim();
  const mjesto = String(q.mjesto || '').slice(0, 100).trim();
  if (upit.length < 2) return posalji(400, { ok: false, error: 'upit' });
  if (!(await domacin(req))) return posalji(401, { ok: false, error: 'prijava' });

  const pocetak = Date.now(), ostalo = () => 24000 - (Date.now() - pocetak);
  const razlozi = [];
  // domaćin je odabrao prijedlog adrese (koordinate stižu s njim) — bez geokodiranja
  const lat = parseFloat(q.lat), lon = parseFloat(q.lon);
  const zadan = Number.isFinite(lat) && Number.isFinite(lon) && Math.abs(lat) <= 90 && Math.abs(lon) <= 180;
  let centar = zadan ? { lat, lon, naziv: upit } : null, prvi = true, odgovor = zadan;
  for (const v of zadan ? [] : varijante(upit, mjesto)) {
    if (!prvi) await cekaj(1100);          // Nominatim: najviše 1 zahtjev u sekundi
    prvi = false;
    const g = await geokodiraj(v, razlozi);
    centar = g.c; odgovor = odgovor || g.odgovor;
    if (centar || ostalo() < 12000) break;
  }
  // nedostupno: nijedan servis nije odgovorio — to nije „adresa ne postoji”
  if (!centar) return posalji(200, { ok: true, centar: null, elementi: [], nedostupno: !odgovor, razlozi });

  for (const url of OVERPASS) {
    if (ostalo() < 9000) break;
    try {
      const r = await sRokom(url, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: 'data=' + encodeURIComponent(upitOverpass(centar.lat, centar.lon)) }, Math.min(9000, ostalo() - 6000));
      if (!r.ok) throw new Error('overpass HTTP ' + r.status);
      const d = await r.json();
      return posalji(200, { ok: true, centar, elementi: d.elements || [], izvor: 'overpass', razlozi });
    } catch (e) { razlozi.push(razlog(e)); }
  }

  // rezerva: Nominatim „posebni izrazi” u okviru ~2,8 km oko objekta
  const dLat = 0.025, dLon = 0.035;
  const box = [centar.lon - dLon, centar.lat + dLat, centar.lon + dLon, centar.lat - dLat].map(x => x.toFixed(5)).join(',');
  const elementi = [];
  let uspjelo = 0;
  for (const vrsta of NOMINATIM_VRSTE) {
    if (ostalo() < 2500) break;
    await cekaj(1100);
    try {
      const r = await sRokom(`${NOMINATIM}?format=jsonv2&limit=15&bounded=1&accept-language=hr&viewbox=${box}&q=${vrsta}`, {}, Math.min(6000, ostalo() - 1000));
      if (!r.ok) throw new Error('nominatim HTTP ' + r.status);
      uspjelo++;
      for (const x of (await r.json()) || []) {
        if (x.name && x.category && x.type) elementi.push({ lat: +x.lat, lon: +x.lon, tags: { name: x.name, [x.category]: x.type } });
      }
    } catch (e) { razlozi.push(razlog(e)); }
  }
  if (uspjelo) return posalji(200, { ok: true, centar, elementi, izvor: 'nominatim', razlozi });
  return posalji(502, { ok: false, error: 'osm', centar, razlozi });
};

module.exports.varijante = varijante;
module.exports.photonOdgovara = photonOdgovara;
