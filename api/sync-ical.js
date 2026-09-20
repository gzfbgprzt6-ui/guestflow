// ============================================================
// /api/sync-ical — povlači zauzete termine s Booking.com-a i Airbnb-a
//
// Dashboard ("Sinkroniziraj odmah") ovo zove otkad postoji iCal UI,
// ali endpoint dosad nije postojao — vraćao je 404.
//
// Sigurnost: funkcija NEMA service role ključ. Radi s korisnikovim
// access tokenom, pa RLS i dalje odlučuje što smije pročitati i
// upisati — korisnik može sinkronizirati samo vlastiti objekt.
//
// Namjerno bez ijedne npm ovisnosti (projekt nema build korak):
// Supabase se zove izravno preko REST API-ja, iCal se parsira ručno.
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

// U iCal-u je DTEND EKSKLUZIVAN: boravak 12.–19. znači noći 12…18,
// a 19. je slobodan za sljedećeg gosta. Ovo je najčešći izvor
// "fantomski zauzetog" dana kod ručno pisanih sinkronizacija.
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

// Korisnik upisuje URL sam, pa ruta ne smije postati proxy prema
// internoj mreži. Ovo nije potpuna SSRF zaštita (ne pokriva DNS
// rebinding), ali odbija očite slučajeve.
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

function rest(path, token, opts) {
  opts = opts || {};
  return fetch(SUPABASE_URL + '/rest/v1/' + path, {
    method: opts.method || 'GET',
    body: opts.body,
    headers: Object.assign({
      apikey: SUPABASE_ANON,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    }, opts.headers || {})
  });
}

// ---------- handler ----------

module.exports = async (req, res) => {
  const propertyId = (req.query && req.query.property_id) || '';
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!propertyId) { res.status(400).json({ error: 'Nedostaje property_id.' }); return; }
  if (!token) { res.status(401).json({ error: 'Niste prijavljeni.' }); return; }

  try {
    // 1. Objekt — RLS pušta samo vlasniku, pa je ovo ujedno provjera prava.
    const pr = await rest(
      'properties?id=eq.' + encodeURIComponent(propertyId) +
      '&select=id,ical_booking_url,ical_airbnb_url', token
    );
    if (!pr.ok) { res.status(pr.status).json({ error: 'Supabase: ' + await pr.text() }); return; }

    const rows = await pr.json();
    const prop = rows && rows[0];
    if (!prop) { res.status(404).json({ error: 'Objekt nije pronađen ili nije vaš.' }); return; }

    const feeds = [
      { source: 'ical_booking', url: prop.ical_booking_url, label: 'Booking.com' },
      { source: 'ical_airbnb', url: prop.ical_airbnb_url, label: 'Airbnb' }
    ].filter(f => f.url && String(f.url).trim());

    if (!feeds.length) {
      res.status(400).json({ error: 'Nije upisan nijedan iCal URL.' });
      return;
    }

    const results = [];

    for (const feed of feeds) {
      const url = safeUrl(feed.url);
      if (!url) {
        results.push({ source: feed.source, label: feed.label, dates: 0, error: 'URL nije valjan.' });
        continue;
      }

      let dates;
      try {
        const events = parseIcal(await fetchFeed(url));
        const set = new Set();
        for (const ev of events) for (const d of nightsBetween(ev.start, ev.end)) set.add(d);
        dates = Array.from(set).sort();
      } catch (e) {
        results.push({ source: feed.source, label: feed.label, dates: 0, error: String(e && e.message || e) });
        continue;
      }

      // Obriši SAMO retke iz ovog feeda. Ručno blokirani dani
      // (source='manual') i dani vezani uz rezervacije ostaju netaknuti.
      const del = await rest(
        'availability?property_id=eq.' + encodeURIComponent(propertyId) +
        '&source=eq.' + feed.source, token, { method: 'DELETE' }
      );
      if (!del.ok) {
        results.push({ source: feed.source, label: feed.label, dates: 0, error: 'Brisanje starih termina nije uspjelo.' });
        continue;
      }

      if (dates.length) {
        const payload = dates.map(d => ({
          property_id: propertyId, date: d, is_booked: true, source: feed.source
        }));
        const ins = await rest('availability', token, {
          method: 'POST',
          body: JSON.stringify(payload),
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }
        });
        if (!ins.ok) {
          results.push({ source: feed.source, label: feed.label, dates: 0, error: 'Upis termina nije uspio: ' + await ins.text() });
          continue;
        }
      }

      results.push({ source: feed.source, label: feed.label, dates: dates.length });
    }

    const syncedAt = new Date().toISOString();
    await rest('properties?id=eq.' + encodeURIComponent(propertyId), token, {
      method: 'PATCH',
      body: JSON.stringify({ ical_last_sync: syncedAt }),
      headers: { Prefer: 'return=minimal' }
    });

    const failed = results.filter(r => r.error);
    res.status(200).json({
      ok: failed.length === 0,
      results,
      ical_last_sync: syncedAt,
      error: failed.length ? failed.map(r => r.label + ': ' + r.error).join(' · ') : undefined
    });
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};

// izvezeno radi testiranja
module.exports.parseIcal = parseIcal;
module.exports.nightsBetween = nightsBetween;
module.exports.safeUrl = safeUrl;
