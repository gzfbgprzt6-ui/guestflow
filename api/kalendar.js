// ============================================================
// /api/kalendar — iCal IZVOZ zauzetih dana prema Bookingu i Airbnbu
//                 (+ testni kalendar, ?test=1)
//
// Zašto: sinkronizacija je dosad išla samo prema nama. Rezervacija
// dogovorena izravno (upit → „Prihvati”) ili ručno blokiran dan nisu
// zatvarali termin na Bookingu i Airbnbu → isti termin mogao se prodati
// dvaput. Domaćin sada ovu adresu zalijepi u Booking/Airbnb („Uvezi
// kalendar”), a oni je sami čitaju svakih nekoliko sati.
//
// /kalendar/<token>.ics?za=booking|airbnb  (vercel.json → ovdje)
//   - token iz tablice calendar_exports (sql/add-ical-export.sql);
//     dane vraća funkcija kalendar_izvoz() — anonimno, bez ključa servisa.
//   - ?za=booking izostavlja dane koji su DOŠLI s Bookinga (inače bi Booking
//     uvozio vlastite rezervacije natrag i nakon otkaza ostao zaključan).
//     Isto za airbnb. Bez ?za= idu svi dani.
//   - Događaj NE nosi ime gosta ni izvor — samo „Zauzeto”. DTEND je
//     ekskluzivan (dan odlaska ostaje slobodan za sljedećeg gosta).
//
// /api/kalendar?test=1 (i stara adresa /api/test-calendar) — testni feed
// za isprobavanje uvoza bez računa na Bookingu/Airbnbu: datumi od DANAS,
// jedan STATUS:CANCELLED koji se NE smije upisati. Očekivano: 12 noći.
//
// Bez npm ovisnosti (vidi CLAUDE.md). Funkcija broj 11 od 12 (Hobby) —
// test i izvoz namjerno dijele datoteku.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';

function ymd(d) {
  return d.getUTCFullYear() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0');
}
function plusDays(base, n) {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + n);
  return d;
}
const dan = s => new Date(String(s).slice(0, 10) + 'T00:00:00Z');

// Linije dulje od 75 okteta lome se (RFC 5545); kod nas su kratke, ali tekst
// imena objekta dolazi od domaćina.
const tekst = s => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/[\r\n]+/g, ' ');
function preklopi(l) {
  const b = Buffer.from(l, 'utf8');
  if (b.length <= 75) return l;
  const out = []; let cur = '';
  for (const ch of l) {
    if (Buffer.byteLength(cur + ch, 'utf8') > (out.length ? 74 : 75)) { out.push(cur); cur = ''; }
    cur += ch;
  }
  out.push(cur);
  return out.join('\r\n ');
}

function posalji(res, lines, cache) {
  res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
  res.setHeader('Cache-Control', cache);
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  res.status(200).send(lines.map(preklopi).join('\r\n') + '\r\n');
}

// Uzastopni dani → jedan događaj [od, do) — do je dan nakon zadnje noći.
function rasponi(datumi) {
  const d = [...new Set(datumi)].sort();
  const out = [];
  for (const s of d) {
    const x = dan(s);
    const zadnji = out[out.length - 1];
    if (zadnji && zadnji.do.getTime() === x.getTime()) zadnji.do = plusDays(x, 1);
    else out.push({ od: x, do: plusDays(x, 1) });
  }
  return out;
}

function testniKalendar(res) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  // DTEND je u iCal-u ekskluzivan, pa je "7 noći" DTSTART+7.
  const events = [
    { from: 10, nights: 7, summary: 'CLOSED - Not available' },
    { from: 24, nights: 5, summary: 'CLOSED - Not available' },
    { from: 40, nights: 3, summary: 'Otkazano - ne smije se upisati', cancelled: true }
  ];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Odmoria//Testni kalendar//HR', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:Odmoria — testni kalendar'];
  events.forEach((ev, i) => {
    const start = plusDays(today, ev.from);
    const end = plusDays(start, ev.nights);
    lines.push('BEGIN:VEVENT', 'UID:odmoria-test-' + i + '-' + ymd(start) + '@odmoria.com', 'DTSTAMP:' + ymd(today) + 'T000000Z',
      'DTSTART;VALUE=DATE:' + ymd(start), 'DTEND;VALUE=DATE:' + ymd(end));
    if (ev.cancelled) lines.push('STATUS:CANCELLED');
    lines.push('SUMMARY:' + ev.summary, 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  posalji(res, lines, 'no-store');
}

const IZVOR = { booking: 'ical_booking', airbnb: 'ical_airbnb' };

module.exports = async (req, res) => {
  const q = req.query || {};
  if (q.test) return testniKalendar(res);

  const token = String(q.t || '').replace(/\.ics$/i, '');
  if (!/^[a-z0-9]{16,64}$/i.test(token)) { res.status(404).send('Kalendar nije pronađen.'); return; }
  const bez = IZVOR[String(q.za || '').toLowerCase()] || null;

  let d;
  try {
    const r = await fetch(SUPABASE_URL + '/rest/v1/rpc/kalendar_izvoz', {
      method: 'POST',
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON, 'Content-Type': 'application/json' },
      body: JSON.stringify({ p_token: token })
    });
    if (!r.ok) throw new Error('supabase ' + r.status);
    d = await r.json();
  } catch (e) {
    // Booking/Airbnb na grešku zadrže zadnje stanje — bolje 503 nego prazan
    // kalendar koji bi otvorio sve dane.
    res.setHeader('Retry-After', '600');
    res.status(503).send('Kalendar trenutno nije dostupan.');
    return;
  }
  if (!d || d.stanje !== 'ok') { res.status(404).send('Kalendar nije pronađen.'); return; }

  const datumi = (d.dani || []).filter(x => !bez || x.source !== bez).map(x => String(x.date).slice(0, 10));
  const sad = new Date();
  const stamp = sad.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Odmoria//Izvoz kalendara//HR', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:' + tekst((d.objekt || 'Odmoria') + ' — Odmoria')];
  for (const r of rasponi(datumi)) {
    lines.push('BEGIN:VEVENT',
      'UID:odm-' + token.slice(0, 8) + '-' + ymd(r.od) + '@odmoria',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + ymd(r.od),
      'DTEND;VALUE=DATE:' + ymd(r.do),
      'SUMMARY:Zauzeto (Odmoria)',
      'TRANSP:OPAQUE',
      'END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  // Booking i Airbnb čitaju svakih nekoliko sati; 5 min na CDN-u je dovoljno svježe.
  posalji(res, lines, 'public, max-age=0, s-maxage=300');
};

// Očekivani rezultat sinkronizacije testnog kalendara, da test ima provjerljiv ishod.
module.exports.expected = () => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return { nights: 12, firstStart: plusDays(today, 10), secondStart: plusDays(today, 24) };
};
module.exports.rasponi = rasponi;
