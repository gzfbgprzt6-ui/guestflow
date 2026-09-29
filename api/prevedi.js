// ============================================================
// /api/prevedi — prijevod SADRŽAJA DOMAĆINA za vodič i javnu stranicu
//
//   GET /api/prevedi?lang=de&slug=<slug>              javna stranica (p.html)
//   GET /api/prevedi?lang=de&token=<token>[&slug=…]    vodič (h.html)
//
// Sučelje (gumbi, naslovi) prevodi jezici.js u pregledniku — besplatno i bez
// mreže. Ovdje se prevodi samo ono što je domaćin sam upisao (riječ
// dobrodošlice, upute, pravila, pitanja, preporuke). Ruta sama pročita te
// tekstove iz baze — klijent ne može poslati svoj tekst na prevođenje, pa
// ruta nije besplatan prevoditelj za bilo koga.
//
// NIKAD se ne čitaju ni ne šalju: sections.door_code, wifi_pass, wifi_name,
// address, ni ime i kontakt gosta. Stupci se biraju izričito (bez `*`).
//
// Prijevod radi Claude (Anthropic API) i sprema se u tablicu `prijevodi`
// (sql/add-translations.sql) — isti tekst se prevodi jednom. Promijeni li
// domaćin tekst, novi tekst se prevede pri prvom sljedećem otvaranju.
//
// Koliko jezika: `plans.max_languages` vlasnika objekta (hrvatski se broji);
// redoslijed je JEZICI niže. Free (2) = hrvatski + engleski.
//
// Varijable u Vercelu: SUPABASE_SERVICE_ROLE_KEY (tablica prijevoda i čitanje
// vodiča) i ANTHROPIC_API_KEY. Bez njih ruta vrati `prijevod:false` i sve
// jezike — stranica tada prevede sučelje, a sadržaj domaćina ostaje hrvatski.
// ============================================================

const crypto = require('crypto');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const MODEL = process.env.PRIJEVOD_MODEL || 'claude-haiku-4-5-20251001';

// isti redoslijed kao JEZICI u jezici.js
const JEZICI = ['hr', 'en', 'de', 'it', 'pl', 'cs'];
const IME = { en: 'British English', de: 'German', it: 'Italian', pl: 'Polish', cs: 'Czech' };

const MAX_TEKSTOVA = 400;
const MAX_ZNAKOVA = 60000;
const ROK_MS = 24000;          // cijeli poziv; vercel.json: maxDuration 30

const enc = encodeURIComponent;
const hash = s => crypto.createHash('sha256').update(s).digest('hex').slice(0, 40);

async function db(put, { method = 'GET', body, prefer } = {}) {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const headers = { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' };
  if (prefer) headers.Prefer = prefer;
  const r = await fetch(SUPABASE_URL + '/rest/v1/' + put, { method, headers, body: body ? JSON.stringify(body) : undefined });
  const data = await r.json().catch(() => null);
  return { ok: r.ok, status: r.status, data };
}
const redovi = r => (r.ok && Array.isArray(r.data) ? r.data : []);

// ── koji objekt i smije li se ───────────────────────────────
async function objektIzLinka(token, slug) {
  const b = redovi(await db(`bookings?select=property_id,is_active,token_expires_at&token=eq.${enc(token)}&limit=1`))[0];
  if (b) {
    if (!b.is_active) return null;
    if (b.token_expires_at && new Date(b.token_expires_at) < new Date()) return null;
    return { id: b.property_id, vodic: true };
  }
  // stari link: slug + properties.guest_token
  if (!slug) return null;
  const p = redovi(await db(`properties?select=id,guest_token&slug=eq.${enc(slug)}&limit=1`))[0];
  if (p && p.guest_token && p.guest_token === token) return { id: p.id, vodic: true };
  return null;
}
async function objektIzSluga(slug) {
  const p = redovi(await db(`properties?select=id&slug=eq.${enc(slug)}&limit=1`))[0];
  return p ? { id: p.id, vodic: false } : null;
}

async function dopusteniJezici(userId) {
  const r = await db('rpc/plan_limit', { method: 'POST', body: { p_user: userId, p_key: 'languages' } });
  let n = r.ok && Number.isFinite(Number(r.data)) ? Number(r.data) : 2;
  if (n < 0) n = JEZICI.length;                   // -1 = neograničeno
  return JEZICI.slice(0, Math.max(1, Math.min(n, JEZICI.length)));
}

// ── tekstovi koje stranica stvarno prikazuje ─────────────────
async function tekstovi(o) {
  const id = enc(o.id);
  const p = redovi(await db(`properties?select=id,user_id,welcome_msg,type,show_local,show_transport,show_attractions,show_faq&id=eq.${id}`))[0];
  if (!p) return null;
  const vodic = o.vodic;
  const [sek, mjesta, prijevoz, izleti, pravila, pitanja, sadrzaji] = await Promise.all([
    vodic ? db(`sections?select=checkin_notes,checkout_notes,parking_info,ac_info,heating_info,hot_water_info,kitchen_info&property_id=eq.${id}&limit=1`) : null,
    vodic || p.show_local ? db(`local_places?select=name,category,distance&property_id=eq.${id}`) : null,
    vodic || p.show_transport ? db(`transport?select=name,details&property_id=eq.${id}`) : null,
    vodic || p.show_attractions ? db(`attractions?select=name,type,distance,price,description&property_id=eq.${id}`) : null,
    db(`house_rules?select=rule_text&property_id=eq.${id}`),
    vodic || p.show_faq ? db(`faq?select=question,answer&property_id=eq.${id}`) : null,
    vodic ? null : db(`amenities?select=name&property_id=eq.${id}&enabled=eq.true`)
  ].map(x => x || { ok: true, data: [] }));

  const skup = new Set();
  const dodaj = v => {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && /\p{L}/u.test(s) && s.length <= 4000) skup.add(s);
  };
  dodaj(p.welcome_msg);
  if (!vodic) dodaj(p.type);
  for (const s of redovi(sek)) for (const v of Object.values(s)) dodaj(v);
  // popis za odlazak vodič dijeli po recima — svaki redak je zasebna stavka
  for (const s of redovi(sek)) for (const red of String(s.checkout_notes || '').split(/\n+/))
    dodaj(red.replace(/^\s*([-•*–·]|\d+[.)])\s*/, ''));
  for (const t of [mjesta, prijevoz, izleti, pravila, pitanja, sadrzaji]) for (const r of redovi(t)) for (const v of Object.values(r)) dodaj(v);

  let lista = [...skup], zbroj = 0;
  lista = lista.filter(s => (zbroj += s.length) <= MAX_ZNAKOVA).slice(0, MAX_TEKSTOVA);
  return { vlasnik: p.user_id, lista };
}

// ── prijevod (Claude) ────────────────────────────────────────
function uputa(jezik) {
  return `You translate short texts that a holiday-rental host in Croatia wrote for their guests. ` +
    `Translate each string in the JSON array from Croatian into ${IME[jezik]}. Keep the meaning, the friendly tone and every line break. ` +
    `Do not translate proper names of places, beaches, restaurants, streets, businesses or people (you may translate a generic word next to a name, e.g. "Plaža Raduča" -> "Raduča beach"). ` +
    `Keep numbers, times, prices, phone numbers, URLs and codes exactly as they are. If a string is already in ${IME[jezik]} or is only a name, return it unchanged. ` +
    `Reply with only a JSON array of strings: the same length and the same order as the input, with no commentary.`;
}

async function prevediDio(dio, jezik, signal) {
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    signal,
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json'
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 8000,
      system: uputa(jezik),
      messages: [{ role: 'user', content: JSON.stringify(dio) }]
    })
  });
  if (!r.ok) throw new Error('anthropic ' + r.status);
  const d = await r.json();
  const txt = (d.content || []).filter(c => c.type === 'text').map(c => c.text).join('');
  const a = txt.indexOf('['), z = txt.lastIndexOf(']');
  const niz = a >= 0 && z > a ? JSON.parse(txt.slice(a, z + 1)) : null;
  if (!Array.isArray(niz) || niz.length !== dio.length) throw new Error('neispravan odgovor');
  return niz.map((x, i) => (typeof x === 'string' && x.trim() ? x : dio[i]));
}

// dijelovi do ~40 tekstova / 5000 znakova, do 4 istodobno
function dijelovi(lista) {
  const out = [];
  let cur = [], zn = 0;
  for (const s of lista) {
    if (cur.length && (cur.length >= 40 || zn + s.length > 5000)) { out.push(cur); cur = []; zn = 0; }
    cur.push(s); zn += s.length;
  }
  if (cur.length) out.push(cur);
  return out;
}

async function prevedi(lista, jezik, rok) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), Math.max(1000, rok - Date.now()));
  const out = Object.create(null);
  try {
    const red = dijelovi(lista);
    const radnik = async () => {
      for (let dio; (dio = red.shift());) {
        try {
          const p = await prevediDio(dio, jezik, ctl.signal);
          dio.forEach((s, i) => { out[s] = p[i]; });
        } catch (e) { if (ctl.signal.aborted) return; }
      }
    };
    await Promise.all([radnik(), radnik(), radnik(), radnik()]);
  } finally { clearTimeout(t); }
  return out;
}

// ── ruta ─────────────────────────────────────────────────────
module.exports = async (req, res) => {
  const pocetak = Date.now();
  const q = req.query || {};
  const jezik = String(q.lang || '').toLowerCase();
  const token = String(q.token || '').trim();
  const slug = String(q.slug || '').trim();
  const posalji = (status, body, javno) => {
    res.setHeader('Cache-Control', javno ? 'public, s-maxage=120, stale-while-revalidate=600' : 'private, no-store');
    res.status(status).json(body);
  };

  if (!JEZICI.includes(jezik) || (!token && !slug) || token.length > 64 || slug.length > 120) {
    return posalji(400, { ok: false, error: 'lang, token ili slug' });
  }
  // bez poslužiteljskog ključa: sučelje na svim jezicima, sadržaj ostaje hrvatski
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return posalji(200, { ok: true, jezici: JEZICI, jezik, prijevod: false, prijevodi: {} });
  }

  try {
    const o = token ? await objektIzLinka(token, slug || null) : await objektIzSluga(slug);
    if (!o) return posalji(404, { ok: false, error: 'nije pronađeno' });
    const t = await tekstovi(o);
    if (!t) return posalji(404, { ok: false, error: 'nije pronađeno' });

    const jezici = await dopusteniJezici(t.vlasnik);
    if (jezik === 'hr' || !jezici.includes(jezik) || !t.lista.length) {
      return posalji(200, { ok: true, jezici, jezik, prijevod: jezik !== 'hr' && jezici.includes(jezik), potpuno: true, prijevodi: {} }, !token);
    }

    // 1) spremljeni prijevodi
    const prijevodi = Object.create(null);     // tekst domaćina može biti i „constructor”
    const poHashu = new Map(t.lista.map(s => [hash(s), s]));
    const hashevi = [...poHashu.keys()];
    let tablica = true;
    for (let i = 0; i < hashevi.length && tablica; i += 80) {
      const r = await db(`prijevodi?select=hash,prijevod&jezik=eq.${jezik}&hash=in.(${hashevi.slice(i, i + 80).join(',')})`);
      if (!r.ok) { tablica = false; break; }       // sql/add-translations.sql nije pokrenut
      for (const x of r.data) { const s = poHashu.get(x.hash); if (s) prijevodi[s] = x.prijevod; }
    }
    // bez tablice se ne prevodi: svako otvaranje bi se ponovno platilo
    if (!tablica) return posalji(200, { ok: true, jezici, jezik, prijevod: false, potpuno: false, prijevodi: {} });

    // 2) što fali — Claude, pa u tablicu
    const fali = t.lista.filter(s => !(s in prijevodi));
    if (fali.length && process.env.ANTHROPIC_API_KEY) {
      const novi = await prevedi(fali, jezik, pocetak + ROK_MS);
      const redoviZaUpis = Object.entries(novi).map(([s, p]) => ({ hash: hash(s), jezik, izvor: s, prijevod: p }));
      Object.assign(prijevodi, novi);
      if (redoviZaUpis.length) {
        await db('prijevodi?on_conflict=hash,jezik', { method: 'POST', body: redoviZaUpis, prefer: 'resolution=merge-duplicates,return=minimal' }).catch(() => {});
      }
    }
    const potpuno = t.lista.every(s => s in prijevodi);
    return posalji(200, { ok: true, jezici, jezik, prijevod: true, potpuno, prijevodi }, !token && potpuno);
  } catch (e) {
    return posalji(502, { ok: false, error: String(e && e.message || e) });
  }
};

module.exports.dijelovi = dijelovi;
module.exports.hash = hash;
