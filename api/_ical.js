// ============================================================
// Zajednička iCal sinkronizacija (Booking.com, Airbnb) — dijele je
//   api/sync-ical.js  (gumb u dashboardu, korisnikov token → RLS)
//   api/sync-all.js   (automatski, poslužiteljski ključ, svi objekti)
//   api/keepalive.js  (dnevni Vercel Cron — i sinkronizira ako smije)
//
// Datoteka počinje s „_” pa je Vercel ne objavljuje kao rutu.
// Namjerno bez ijedne npm ovisnosti; iCal se parsira ručno.
//
// Tri stvari koje je lako pokvariti (vidi CLAUDE.md):
//  1. DTEND je EKSKLUZIVAN — boravak 12.–19. = noći 12…18.
//  2. Brisanje je samo po izvoru (source=eq.ical_booking) — ručni dani i
//     dani rezervacija moraju preživjeti.
//  3. URL upisuje korisnik → safeUrl() odbija lokalne i privatne adrese.
// Novo: dan koji je već zauzet iz drugog izvora (ručno, rezervacija, drugi
// kalendar) iCal ne prepisuje — inače bi ga sljedeća sinkronizacija obrisala.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';

const FEED_TIMEOUT_MS = 10000;
const MAX_FEED_BYTES = 2 * 1024 * 1024;
const MAX_NIGHTS_PER_EVENT = 400;

// ---------- iCal parsiranje ----------

// RFC 5545: redak duži od 75 okteta lomi se i nastavlja razmakom ili tabom.
function unfold(text) {
  return text.replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
}

// DTSTART;VALUE=DATE:20260712  ->  2026-07-12
// DTSTART:20260712T140000Z     ->  2026-07-12
function toDate(value) {
  const m = /^(\d{4})(\d{2})(\d{2})/.exec(String(value).trim());
  return m ? m[1] + '-' + m[2] + '-' + m[3] : null;
}

function parseIcal(text) {
  const events = [];
  const lines = unfold(text).split(/\r?\n/);
  let ev = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line === 'BEGIN:VEVENT') { ev = {}; continue; }
    if (line === 'END:VEVENT') { if (ev) events.push(ev); ev = null; continue; }
    if (!ev) continue;
    const i = line.indexOf(':');
    if (i < 0) continue;
    const name = line.slice(0, i).split(';')[0].toUpperCase();
    const value = line.slice(i + 1);
    if (name === 'DTSTART') ev.start = toDate(value);
    else if (name === 'DTEND') ev.end = toDate(value);
    else if (name === 'STATUS') ev.status = value.trim().toUpperCase();
    else if (name === 'SUMMARY') ev.summary = value.trim();
  }
  return events.filter(e => e.start && e.status !== 'CANCELLED');
}

// DTEND je EKSKLUZIVAN: boravak 12.–19. znači noći 12…18, a 19. je slobodan
// za sljedećeg gosta. Najčešći izvor „fantomski zauzetog” dana.
function nightsBetween(start, end) {
  const out = [];
  const d = new Date(start + 'T00:00:00Z');
  if (isNaN(d.getTime())) return out;
  const e = end ? new Date(end + 'T00:00:00Z') : null;
  if (!e || isNaN(e.getTime()) || e <= d) return [start];
  let guard = 0;
  while (d < e && guard++ < MAX_NIGHTS_PER_EVENT) {
    out.push(d.toISOString().slice(0, 10));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

// ---------- dohvat feeda ----------

// Korisnik upisuje URL sam, pa ruta ne smije postati proxy prema internoj
// mreži. Nije potpuna SSRF zaštita (ne pokriva DNS rebinding).
function safeUrl(input) {
  let u;
  try { u = new URL(String(input).trim()); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  const h = u.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (h === 'localhost' || h === '::1' || h === '0.0.0.0') return null;
  if (h.endsWith('.local') || h.endsWith('.internal') || h.endsWith('.localhost')) return null;
  if (/^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h)) return null;
  if (/^169\.254\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h)) return null;
  if (/^f[cd][0-9a-f]{2}:/i.test(h) || /^fe80:/i.test(h)) return null;
  return u.toString();
}

async function fetchFeed(url) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), FEED_TIMEOUT_MS);
  try {
    const r = await fetch(url, {
      signal: ctl.signal,
      redirect: 'follow',
      headers: { 'User-Agent': 'Odmoria-iCal-Sync/1.0', Accept: 'text/calendar,text/plain,*/*' }
    });
    if (!r.ok) throw new Error('feed je vratio HTTP ' + r.status);
    const text = await r.text();
    if (text.length > MAX_FEED_BYTES) throw new Error('feed je prevelik');
    if (text.indexOf('BEGIN:VCALENDAR') < 0) throw new Error('odgovor nije iCal kalendar');
    return text;
  } finally {
    clearTimeout(timer);
  }
}

// ---------- Supabase REST ----------
// `kljuc` je korisnikov access token (RLS) ili poslužiteljski ključ (sync-all).
function rest(path, kljuc, opts) {
  opts = opts || {};
  const posluzitelj = kljuc === process.env.SUPABASE_SERVICE_ROLE_KEY && !!kljuc;
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    body: opts.body,
    headers: Object.assign({
      apikey: posluzitelj ? kljuc : SUPABASE_ANON,
      Authorization: 'Bearer ' + kljuc,
      'Content-Type': 'application/json'
    }, opts.headers || {})
  });
}

// ---------- promjene na platformi (otkazano / novo) ----------
// Uzastopne noći → jedan raspon [od, do) (do = dan odlaska). Bez tablice
// kalendar_promjene upis tiho ne uspije — sinkronizacija radi kao prije.
function rasponi(noci) {
  const out = [];
  for (const d of [...noci].sort()) {
    const z = out[out.length - 1];
    if (z && z.do_ === d) z.do_ = sljedeci(d); else out.push({ od: d, do_: sljedeci(d) });
  }
  return out;
}
function sljedeci(d) { const x = new Date(d + 'T12:00:00Z'); x.setUTCDate(x.getUTCDate() + 1); return x.toISOString().slice(0, 10); }
async function zabiljeziPromjene(propertyId, izvor, stari, novi, kljuc) {
  if (!stari.length) return;
  const danas = new Date().toISOString().slice(0, 10);
  const nS = new Set(novi), sS = new Set(stari);
  const otkazano = rasponi(stari.filter(d => d >= danas && !nS.has(d)));
  const novo = rasponi(novi.filter(d => d >= danas && !sS.has(d)));
  const redovi = otkazano.map(r => ({ property_id: propertyId, izvor, vrsta: 'otkazano', od: r.od, do_: r.do_ }))
    .concat(novo.map(r => ({ property_id: propertyId, izvor, vrsta: 'novo', od: r.od, do_: r.do_ })));
  if (!redovi.length) return;
  try { await rest('kalendar_promjene', kljuc, { method: 'POST', body: JSON.stringify(redovi.slice(0, 50)), headers: { Prefer: 'return=minimal' } }); } catch (e) {}
}

// ---------- moguća dvostruka rezervacija (sql/add-ical-sukobi.sql) ----------
// Airbnbov izvoz uz prave rezervacije („Reserved”) nosi i blokirane dane
// („Airbnb (Not available)”) — među njima i datume koje je uvezao od nas.
// Takvi dani zatvaraju kalendar, ali nisu prodani, pa nisu sukob.
// Booking sve piše kao „CLOSED - Not available”, pa se tu ne razlikuje.
function stvarnaRezervacija(izvor, ev) {
  if (izvor !== 'ical_airbnb') return true;
  return !/not available|unavailable|blocked|nedostupno/i.test(ev.summary || '');
}

// Sukob = noć koju je platforma prodala, a već je zauzeta:
//  a) izravnom rezervacijom (availability.booking_id) — osim ako je platforma
//     NAKON nastanka te rezervacije povukla naš izvoz: tada je to vjerojatno
//     naš vlastiti datum koji nam vraća („jeka”), a ne nova prodaja;
//  b) drugom platformom — Airbnb „Reserved” i Booking iste noći, i to samo
//     kad Booking ne uvozi naš kalendar (inače ne znamo je li Bookingov dan jeka).
// Samo buduće noći. Upis jednom po rasponu (jedinstveni ključ); bez tablice
// kalendar_sukobi upis tiho ne uspije.
const PLATFORMA = { ical_booking: 'dohvat_booking', ical_airbnb: 'dohvat_airbnb' };
function nadjiSukobe(postojeci, prodano, rezervacije, dohvat, danas) {
  const out = [];
  const poBookingu = {};
  for (const r of postojeci) if (r.booking_id && r.date >= danas) (poBookingu[r.booking_id] = poBookingu[r.booking_id] || []).push(r.date);
  for (const izvor of Object.keys(prodano)) {
    const zadnji = dohvat && dohvat[PLATFORMA[izvor]] ? Date.parse(dohvat[PLATFORMA[izvor]]) : 0;
    for (const bid of Object.keys(poBookingu)) {
      const b = rezervacije[bid];
      if (!b || b.is_active === false) continue;
      if (zadnji && b.created_at && zadnji > Date.parse(b.created_at)) continue;   // jeka
      const noci = poBookingu[bid].filter(d => prodano[izvor].has(d));
      for (const r of rasponi(noci)) out.push({ izvor, s_cim: 'rezervacija', booking_id: bid, od: r.od, do_: r.do_ });
    }
  }
  if (prodano.ical_booking && prodano.ical_airbnb && !(dohvat && dohvat.dohvat_booking)) {
    const noci = [...prodano.ical_airbnb].filter(d => d >= danas && prodano.ical_booking.has(d));
    for (const r of rasponi(noci)) out.push({ izvor: 'ical_airbnb', s_cim: 'ical_booking', booking_id: null, od: r.od, do_: r.do_ });
  }
  return out;
}
async function zabiljeziSukobe(propertyId, postojeci, prodano, kljuc) {
  if (!Object.keys(prodano).length) return;
  const danas = new Date().toISOString().slice(0, 10);
  const ids = [...new Set(postojeci.filter(r => r.booking_id && r.date >= danas).map(r => r.booking_id))];
  const rezervacije = {};
  if (ids.length) {
    const r = await rest('bookings?id=in.(' + ids.map(encodeURIComponent).join(',') + ')&select=id,created_at,is_active', kljuc);
    if (r.ok) for (const b of await r.json()) rezervacije[b.id] = b;
  }
  let dohvat = null;
  const d = await rest('calendar_exports?property_id=eq.' + encodeURIComponent(propertyId) + '&select=dohvat_booking,dohvat_airbnb', kljuc);
  if (d.ok) dohvat = (await d.json())[0] || null;
  const redovi = nadjiSukobe(postojeci, prodano, rezervacije, dohvat, danas).map(x => Object.assign({ property_id: propertyId }, x));
  if (!redovi.length) return;
  await rest('kalendar_sukobi?on_conflict=property_id,izvor,s_cim,od,do_', kljuc, {
    method: 'POST', body: JSON.stringify(redovi.slice(0, 50)), headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' } });
}

// ---------- sinkronizacija jednog objekta ----------
// prop = { id, ical_booking_url, ical_airbnb_url }. Vraća { ok, results, ical_last_sync, error }.
async function syncProperty(prop, kljuc) {
  const propertyId = prop.id;
  const feeds = [
    { source: 'ical_booking', url: prop.ical_booking_url, label: 'Booking.com' },
    { source: 'ical_airbnb', url: prop.ical_airbnb_url, label: 'Airbnb' }
  ].filter(f => f.url && String(f.url).trim());
  if (!feeds.length) return { ok: false, results: [], error: 'Nije upisan nijedan iCal URL.' };

  // dani koje već drži drugi izvor (ručno, rezervacija, drugi kalendar)
  let postojeci = [];
  let ex = await rest('availability?property_id=eq.' + encodeURIComponent(propertyId) + '&select=date,source,booking_id', kljuc);
  if (!ex.ok) ex = await rest('availability?property_id=eq.' + encodeURIComponent(propertyId) + '&select=date,source', kljuc);
  if (ex.ok) postojeci = await ex.json();
  const pocetni = postojeci.slice();
  const prodano = {};   // izvor → noći koje je platforma stvarno prodala (ovaj krug)

  const results = [];
  for (const feed of feeds) {
    const url = safeUrl(feed.url);
    if (!url) { results.push({ source: feed.source, label: feed.label, dates: 0, error: 'URL nije valjan.' }); continue; }

    let dates;
    try {
      const events = parseIcal(await fetchFeed(url));
      const set = new Set(), stvarno = new Set();
      for (const ev of events) for (const d of nightsBetween(ev.start, ev.end)) {
        set.add(d);
        if (stvarnaRezervacija(feed.source, ev)) stvarno.add(d);
      }
      prodano[feed.source] = stvarno;
      const tudji = new Set(postojeci.filter(r => r.source !== feed.source).map(r => r.date));
      dates = Array.from(set).filter(d => !tudji.has(d)).sort();
    } catch (e) {
      results.push({ source: feed.source, label: feed.label, dates: 0, error: String(e && e.message || e) });
      continue;
    }

    // Obriši SAMO retke iz ovog feeda.
    const del = await rest('availability?property_id=eq.' + encodeURIComponent(propertyId) + '&source=eq.' + feed.source,
      kljuc, { method: 'DELETE' });
    if (!del.ok) { results.push({ source: feed.source, label: feed.label, dates: 0, error: 'Brisanje starih termina nije uspjelo.' }); continue; }

    if (dates.length) {
      const ins = await rest('availability', kljuc, {
        method: 'POST',
        body: JSON.stringify(dates.map(d => ({ property_id: propertyId, date: d, is_booked: true, source: feed.source }))),
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
      });
      if (!ins.ok) { results.push({ source: feed.source, label: feed.label, dates: 0, error: 'Upis termina nije uspio: ' + await ins.text() }); continue; }
    }
    // otkazano / novo (sql/add-cleaner-status.sql → kalendar_promjene): samo buduće
    // noći i samo kad je ovaj izvor već prije bio povučen (prvi put sve je „novo”)
    await zabiljeziPromjene(propertyId, feed.source, postojeci.filter(r => r.source === feed.source).map(r => r.date), dates, kljuc);
    // i drugi feed u istom krugu mora znati za ove dane
    postojeci = postojeci.filter(r => r.source !== feed.source).concat(dates.map(d => ({ date: d, source: feed.source })));
    results.push({ source: feed.source, label: feed.label, dates: dates.length });
  }

  try { await zabiljeziSukobe(propertyId, pocetni, prodano, kljuc); } catch (e) {}

  const syncedAt = new Date().toISOString();
  await rest('properties?id=eq.' + encodeURIComponent(propertyId), kljuc, {
    method: 'PATCH', body: JSON.stringify({ ical_last_sync: syncedAt }), headers: { Prefer: 'return=minimal' }
  });
  const failed = results.filter(r => r.error);
  return {
    ok: failed.length === 0, results, ical_last_sync: syncedAt,
    error: failed.length ? failed.map(r => r.label + ': ' + r.error).join(' · ') : undefined
  };
}

// ---------- svi objekti (automatski) ----------
// Najdulje nesinkronizirani prvi; staje prije isteka vremena funkcije.
// Objekt sinkroniziran u zadnjih `razmakMin` minuta preskače se.
async function syncAll({ rokMs = 45000, najvise = 40, razmakMin = 8 } = {}) {
  const kljuc = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!kljuc) return { ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen', obradeno: 0 };
  const pocetak = Date.now();
  const prije = new Date(Date.now() - razmakMin * 60000).toISOString();
  const r = await rest('properties?select=id,ical_booking_url,ical_airbnb_url,ical_last_sync'
    + '&or=(ical_booking_url.not.is.null,ical_airbnb_url.not.is.null)'
    + '&or=(ical_last_sync.is.null,ical_last_sync.lt.' + encodeURIComponent(prije) + ')'
    + '&order=ical_last_sync.asc.nullsfirst&limit=' + najvise, kljuc);
  if (!r.ok) return { ok: false, error: 'Supabase ' + r.status, obradeno: 0 };
  const lista = await r.json();
  let obradeno = 0, greske = 0;
  for (const p of lista) {
    if (Date.now() - pocetak > rokMs) break;
    try { const x = await syncProperty(p, kljuc); obradeno++; if (!x.ok) greske++; }
    catch (e) { obradeno++; greske++; }
  }
  return { ok: true, obradeno, greske, na_redu: lista.length - obradeno };
}

module.exports = { _rasponi: rasponi, _nadjiSukobe: nadjiSukobe, _stvarnaRezervacija: stvarnaRezervacija, parseIcal, nightsBetween, safeUrl, fetchFeed, rest, syncProperty, syncAll, SUPABASE_ANON };
