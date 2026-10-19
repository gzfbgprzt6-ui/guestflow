// ============================================================
// Obavijesti na mobitel domaćina (Web Push) — odluke, točke 26 i 32
//
// Datoteka počinje s „_” pa je Vercel ne objavljuje kao rutu; zove je
// api/sync-all.js (rewrite /api/obavijest → /api/sync-all?push=1), jer je
// na Hobby planu svih 12 funkcija zauzeto.
//
//   GET  /api/obavijest?kljuc=1   → { javni }  VAPID javni ključ (pregledniku
//                                    treba za pretplatu). Prvi put ključeve
//                                    napravi sama i spremi u Supabase Vault —
//                                    privatni ključ nikad ne izlazi iz poslužitelja.
//   POST /api/obavijest           → šalje obavijest; zove je SAMO baza
//                                    (okidač → pg_net, sql/add-push.sql) s
//                                    `Authorization: Bearer <CRON_SECRET>`.
//        tijelo: { user_id, vrsta: upit | cistacica | kalendar, podaci }
//
// Namjerno bez npm ovisnosti: VAPID (RFC 8292) potpis ES256 i šifriranje
// poruke aes128gcm (RFC 8291 / 8188) rade preko Node `crypto`.
// ============================================================

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';

const b64u = buf => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const odB64u = s => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

// ---------- Supabase (poslužiteljski ključ) ----------
function sbZaglavlja(kljuc) {
  return { apikey: kljuc, Authorization: 'Bearer ' + kljuc, 'Content-Type': 'application/json' };
}
async function rpc(kljuc, ime, args) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${ime}`, { method: 'POST', headers: sbZaglavlja(kljuc), body: JSON.stringify(args || {}) });
  if (!r.ok) throw new Error(`${ime}: HTTP ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
}

// ---------- VAPID ključevi (Vault) ----------
let KLJUCEVI = null;   // predmemorija dok funkcija živi
async function kljucevi(kljuc) {
  if (KLJUCEVI) return KLJUCEVI;
  let k = await rpc(kljuc, 'push_vapid');
  if (!k || !k.javni || !k.privatni) {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
    const jwk = publicKey.export({ format: 'jwk' });
    const javni = b64u(Buffer.concat([Buffer.from([4]), odB64u(jwk.x), odB64u(jwk.y)]));
    const privatni = JSON.stringify(privateKey.export({ format: 'jwk' }));
    // ako je druga instanca upravo spremila svoje, funkcija vrati ono što je u Vaultu
    k = await rpc(kljuc, 'push_vapid_spremi', { p_javni: javni, p_privatni: privatni });
  }
  KLJUCEVI = { javni: k.javni, privatni: crypto.createPrivateKey({ key: JSON.parse(k.privatni), format: 'jwk' }) };
  return KLJUCEVI;
}

// ---------- VAPID JWT (ES256) ----------
function vapidJwt(endpoint, privatni, kontakt) {
  const aud = new URL(endpoint).origin;
  const zag = b64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const tijelo = b64u(JSON.stringify({ aud, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: kontakt }));
  const potpis = crypto.sign('sha256', Buffer.from(`${zag}.${tijelo}`), { key: privatni, dsaEncoding: 'ieee-p1363' });
  return `${zag}.${tijelo}.${b64u(potpis)}`;
}

// ---------- šifriranje poruke (aes128gcm, RFC 8291) ----------
const hmac = (kljuc, podaci) => crypto.createHmac('sha256', kljuc).update(podaci).digest();
function sifriraj(poruka, p256dh, auth) {
  const uaJavni = odB64u(p256dh), tajnaAuth = odB64u(auth);
  const ecdh = crypto.createECDH('prime256v1'); ecdh.generateKeys();
  const asJavni = ecdh.getPublicKey();
  const zajednicka = ecdh.computeSecret(uaJavni);
  const prkKljuc = hmac(tajnaAuth, zajednicka);
  const ikm = hmac(prkKljuc, Buffer.concat([Buffer.from('WebPush: info\0'), uaJavni, asJavni, Buffer.from([1])]));
  const sol = crypto.randomBytes(16);
  const prk = hmac(sol, ikm);
  const cek = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: aes128gcm\0'), Buffer.from([1])])).subarray(0, 16);
  const nonce = hmac(prk, Buffer.concat([Buffer.from('Content-Encoding: nonce\0'), Buffer.from([1])])).subarray(0, 12);
  const c = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const sifrat = Buffer.concat([c.update(Buffer.concat([Buffer.from(poruka), Buffer.from([2])])), c.final(), c.getAuthTag()]);
  const rs = Buffer.alloc(4); rs.writeUInt32BE(4096);
  return Buffer.concat([sol, rs, Buffer.from([asJavni.length]), asJavni, sifrat]);
}

async function posalji(pretplata, poruka, k, kontakt) {
  const r = await fetch(pretplata.endpoint, {
    method: 'POST',
    headers: {
      'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream',
      TTL: '86400', Urgency: 'high',
      Authorization: `vapid t=${vapidJwt(pretplata.endpoint, k.privatni, kontakt)}, k=${k.javni}`,
    },
    body: sifriraj(JSON.stringify(poruka), pretplata.p256dh, pretplata.auth),
  });
  return r.status;
}

// ---------- tekst obavijesti (hr / en, po jeziku uređaja domaćina) ----------
const fmtDan = (d, en) => {
  if (!d) return '';
  const [g, m, dd] = String(d).slice(0, 10).split('-').map(Number);
  return en ? `${dd} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][m - 1]}` : `${dd}. ${m}.`;
};
function poruka(vrsta, p, jezik) {
  const en = jezik === 'en', o = p.objekt || 'Odmoria', id = p.property_id || '';
  const url = cilj => `/dashboard.html?otvori=${cilj}${id ? '&objekt=' + encodeURIComponent(id) : ''}`;
  if (vrsta === 'upit') return {
    title: en ? `New inquiry — ${o}` : `Novi upit — ${o}`,
    body: [p.ime, p.od && p.do ? `${fmtDan(p.od, en)} – ${fmtDan(p.do, en)}` : '', p.gosti ? (en ? `${p.gosti} guests` : `gostiju: ${p.gosti}`) : ''].filter(Boolean).join(' · ') || (en ? 'A guest sent an inquiry.' : 'Gost je poslao upit.'),
    url: url('upiti'), tag: 'upit-' + (p.id || Date.now()) };
  if (vrsta === 'cistacica') return {
    title: en ? 'The cleaner can’t come' : 'Čistačica ne može doći',
    body: `${o} · ${fmtDan(p.dan, en)}${p.napomena ? ' — ' + p.napomena : ''}`,
    url: url('cistacica'), tag: 'cist-' + id + '-' + p.dan };
  if (vrsta === 'kalendar') {
    const izvor = p.izvor === 'ical_airbnb' ? 'Airbnb' : 'Booking.com', otk = p.vrsta === 'otkazano';
    return {
      title: otk ? (en ? `Cancelled on ${izvor}` : `Otkazano na ${izvor}`) : (en ? `New booking on ${izvor}` : `Nova rezervacija (${izvor})`),
      body: `${o} · ${fmtDan(p.od, en)} – ${fmtDan(p.do, en)}`,
      url: url('kalendar'), tag: 'kal-' + id + '-' + p.od };
  }
  if (vrsta === 'proba') return {
    title: en ? 'Notifications are on' : 'Obavijesti su uključene',
    body: en ? 'This device will get new inquiries and urgent notices.' : 'Na ovaj uređaj stižu novi upiti i hitne obavijesti.',
    url: '/dashboard.html', tag: 'proba' };
  return null;
}

// ---------- ruta ----------
async function obradi(req, res) {
  const kljuc = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!kljuc) { res.status(503).json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY nije postavljen.' }); return; }
  const kontakt = 'https://' + (req.headers['x-forwarded-host'] || req.headers.host || 'odmoria.com');

  if (req.method === 'GET') {
    try {
      const k = await kljucevi(kljuc);
      res.setHeader('Cache-Control', 'public, max-age=300');
      res.status(200).json({ ok: true, javni: k.javni });
    } catch (e) { res.status(503).json({ ok: false, error: String(e.message || e) }); }
    return;
  }

  if (req.method !== 'POST') { res.status(405).json({ ok: false }); return; }
  const tajna = process.env.CRON_SECRET || '';
  if (!tajna || (req.headers.authorization || '') !== 'Bearer ' + tajna) { res.status(401).json({ ok: false, error: 'Unauthorized' }); return; }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = {}; } }
  const korisnik = b && b.user_id, vrsta = b && b.vrsta, podaci = (b && b.podaci) || {};
  if (!/^[0-9a-f-]{36}$/i.test(String(korisnik || '')) || !vrsta) { res.status(400).json({ ok: false, error: 'user_id i vrsta su obavezni' }); return; }

  try {
    const k = await kljucevi(kljuc);
    const r = await fetch(`${SUPABASE_URL}/rest/v1/push_pretplate?user_id=eq.${korisnik}&select=id,endpoint,p256dh,auth,jezik`, { headers: sbZaglavlja(kljuc) });
    const pretplate = r.ok ? await r.json() : [];
    let poslano = 0, uklonjeno = 0;
    await Promise.all(pretplate.map(async p => {
      const m = poruka(vrsta, podaci, p.jezik);
      if (!m) return;
      let status = 0;
      try { status = await posalji(p, m, k, kontakt); } catch { status = 0; }
      if (status >= 200 && status < 300) poslano++;
      else if (status === 404 || status === 410) {   // pretplata je istekla ili je odjavljena u pregledniku
        await fetch(`${SUPABASE_URL}/rest/v1/push_pretplate?id=eq.${p.id}`, { method: 'DELETE', headers: sbZaglavlja(kljuc) }).catch(() => {});
        uklonjeno++;
      }
    }));
    res.status(200).json({ ok: true, pretplata: pretplate.length, poslano, uklonjeno });
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e.message || e) });
  }
}

module.exports = { obradi, _sifriraj: sifriraj, _vapidJwt: vapidJwt, _poruka: poruka };
