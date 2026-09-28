// ============================================================
// Zajedničko za Stripe rute (checkout, portal, webhook, status).
//
// Datoteka počinje s „_” pa je Vercel NE objavljuje kao zasebnu rutu —
// samo je uvoze ostale funkcije u api/.
//
// Namjerno bez ijedne npm ovisnosti (vidi api/keepalive.js): Stripe i
// Supabase se zovu izravno preko REST-a (`fetch`).
//
// Varijable okruženja (Vercel → Settings → Environment Variables):
//   STRIPE_SECRET_KEY          sk_test_… (testni način) ili sk_live_…
//   SUPABASE_SERVICE_ROLE_KEY  poslužiteljski ključ — koristi ga SAMO
//                              webhook, jer Stripe ne šalje korisnikov
//                              token; nikad ne ide u preglednik ni u kod.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';

const PLACENI = ['pro', 'business'];               // planovi koji se mogu kupiti
const INTERVALI = { month: 'mjesec', year: 'godina' }; // Stripe → cijena_plana
// Nakon kraja razdoblja plan vrijedi još 2 dana: obnova stiže webhookom, a
// kad bi webhook kasnio, domaćin ne smije ni na trenutak pasti na Free.
const PRODULJENJE_MS = 2 * 24 * 3600 * 1000;

function kljuc() {
  return process.env.STRIPE_SECRET_KEY || '';
}
function testniNacin() {
  return kljuc().startsWith('sk_test_') || kljuc().startsWith('rk_test_');
}

// ---------------------------------------------------------------- odgovori
function posalji(res, status, tijelo) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(tijelo));
}

// ---------------------------------------------------------------- Stripe
// Stripe prima application/x-www-form-urlencoded s ugniježđenim ključevima
// (line_items[0][price_data][currency]=eur).
function formular(obj, prefix, out) {
  out = out || [];
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined || v === null) continue;
    const ime = prefix ? `${prefix}[${k}]` : k;
    if (typeof v === 'object') formular(v, ime, out);
    else out.push(encodeURIComponent(ime) + '=' + encodeURIComponent(String(v)));
  }
  return out;
}

async function stripe(put, { method = 'GET', params } = {}) {
  const tijelo = params ? formular(params).join('&') : undefined;
  const r = await fetch('https://api.stripe.com/v1' + put + (method === 'GET' && tijelo ? '?' + tijelo : ''), {
    method,
    headers: {
      Authorization: 'Bearer ' + kljuc(),
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2024-06-20'
    },
    body: method === 'GET' ? undefined : tijelo
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const e = new Error((data.error && data.error.message) || 'Stripe greška ' + r.status);
    e.status = r.status;
    e.stripe = data.error || null;
    throw e;
  }
  return data;
}

// Dohvati objekt; ako ne postoji (404), napravi ga. Za proizvode i kupone
// s našim vlastitim id-jem, da se ne gomilaju duplikati.
async function dohvatiIliNapravi(vrsta, id, params) {
  try {
    return await stripe(`/${vrsta}/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e.status !== 404) throw e;
    return stripe(`/${vrsta}`, { method: 'POST', params: Object.assign({ id }, params) });
  }
}

// ---------------------------------------------------------------- Supabase
// Korisnik iz njegovog access tokena (Authorization: Bearer …).
async function korisnik(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7).trim() : '';
  if (!token) return null;
  const r = await fetch(SUPABASE_URL + '/auth/v1/user', {
    headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + token }
  });
  if (!r.ok) return null;
  const u = await r.json().catch(() => null);
  return u && u.id ? { id: u.id, email: u.email || null, token } : null;
}

// REST poziv u ime korisnika (RLS vrijedi kao u pregledniku)
async function kaoKorisnik(token, put, { method = 'GET', body } = {}) {
  const r = await fetch(SUPABASE_URL + '/rest/v1' + put, {
    method,
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}

// REST poziv poslužiteljskim ključem — SAMO iz webhooka
async function kaoPosluzitelj(put, { method = 'GET', body, prefer } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY nije postavljen');
  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(SUPABASE_URL + '/rest/v1' + put, {
    method, headers, body: body ? JSON.stringify(body) : undefined
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const e = new Error('Supabase ' + r.status + ': ' + JSON.stringify(data));
    e.status = r.status;
    throw e;
  }
  return data;
}

// ---------------------------------------------------------------- ostalo
// Adresa za povratak s plaćanja. Nikad zakucana domena — uzima se s koje je
// korisnik došao (Vercel, Preview ili vlastita domena).
function ishodiste(req) {
  const host = req.headers['x-forwarded-host'] || req.headers.host || '';
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  if (!/^[a-z0-9.-]+(:\d+)?$/i.test(host)) return null;
  return proto + '://' + host;
}

// Tijelo zahtjeva kad ga Vercel nije već pročitao
function sirovoTijelo(req) {
  return new Promise((resolve, reject) => {
    const dijelovi = [];
    req.on('data', d => dijelovi.push(Buffer.isBuffer(d) ? d : Buffer.from(d)));
    req.on('end', () => resolve(Buffer.concat(dijelovi)));
    req.on('error', reject);
  });
}

// Kraj trenutnog razdoblja pretplate. Od Stripe API verzije 2025-03-31 polje
// je na stavci, a ne na pretplati — čitaju se oba mjesta.
function krajRazdoblja(sub) {
  const s = sub.current_period_end
    || (sub.items && sub.items.data && sub.items.data[0] && sub.items.data[0].current_period_end);
  return s ? new Date(s * 1000 + PRODULJENJE_MS).toISOString() : null;
}

module.exports = {
  SUPABASE_URL, SUPABASE_ANON, PLACENI, INTERVALI,
  kljuc, testniNacin, posalji, formular, stripe, dohvatiIliNapravi,
  korisnik, kaoKorisnik, kaoPosluzitelj, ishodiste, sirovoTijelo, krajRazdoblja
};
