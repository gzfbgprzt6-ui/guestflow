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
//
// DOMAĆIN (dashboard → Objekt → Prijevodi), s njegovim tokenom
// (Authorization: Bearer …) — ruta provjeri da je objekt njegov:
//   GET  /api/prevedi?objekt=<id>&lang=de[&prevedi=1]   svi tekstovi objekta s
//        prijevodom i oznakom „ručno”; prevedi=1 prevede ono što fali
//   POST /api/prevedi  { objekt, lang, izmjene: [{ izvor, prijevod }] }
//        ručni ispravak (prazan prijevod = vrati automatski)
// Ručni ispravci su u tablici `prijevodi_rucni`, PO OBJEKTU — jedan domaćin
// ne može promijeniti prijevod koji vide gosti drugog domaćina. Imaju
// prednost pred automatskim prijevodom.
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

const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
// o.vodic = vodič (sve osim sadržaja), o.sve = domaćin (vodič + javna stranica)
async function tekstovi(o) {
  const id = enc(o.id);
  const p = redovi(await db(`properties?select=id,user_id,welcome_msg,type,show_local,show_transport,show_attractions,show_faq&id=eq.${id}`))[0];
  if (!p) return null;
  const vodic = o.vodic || o.sve;
  const [sek, mjesta, prijevoz, izleti, pravila, pitanja, sadrzaji] = await Promise.all([
    vodic ? db(`sections?select=checkin_notes,checkout_notes,parking_info,ac_info,heating_info,hot_water_info,kitchen_info&property_id=eq.${id}&limit=1`) : null,
    vodic || p.show_local ? db(`local_places?select=name,category,distance&property_id=eq.${id}`) : null,
    vodic || p.show_transport ? db(`transport?select=name,details&property_id=eq.${id}`) : null,
    vodic || p.show_attractions ? db(`attractions?select=name,type,distance,price,description&property_id=eq.${id}`) : null,
    db(`house_rules?select=rule_text&property_id=eq.${id}`),
    vodic || p.show_faq ? db(`faq?select=question,answer&property_id=eq.${id}`) : null,
    o.vodic ? null : db(`amenities?select=name&property_id=eq.${id}&enabled=eq.true`)
  ].map(x => x || { ok: true, data: [] }));

  const grupe = new Map();                          // tekst → skupina (za panel u dashboardu)
  const dodaj = (v, g) => {
    const s = typeof v === 'string' ? v.trim() : '';
    if (s && /\p{L}/u.test(s) && s.length <= 4000 && !grupe.has(s)) grupe.set(s, g);
  };
  dodaj(p.welcome_msg, 'Opis');
  if (!o.vodic) dodaj(p.type, 'Opis');
  for (const s of redovi(sek)) for (const v of Object.values(s)) dodaj(v, 'Dolazak i kuća');
  // popis za odlazak vodič dijeli po recima — svaki redak je zasebna stavka
  for (const s of redovi(sek)) for (const red of String(s.checkout_notes || '').split(/\n+/))
    dodaj(red.replace(/^\s*([-•*–·]|\d+[.)])\s*/, ''), 'Dolazak i kuća');
  for (const [t, g] of [[pravila, 'Pravila i pitanja'], [pitanja, 'Pravila i pitanja'], [mjesta, 'Preporuke'], [prijevoz, 'Preporuke'], [izleti, 'Preporuke'], [sadrzaji, 'Sadržaji']])
    for (const r of redovi(t)) for (const v of Object.values(r)) dodaj(v, g);

  let lista = [...grupe.keys()], zbroj = 0;
  lista = lista.filter(s => (zbroj += s.length) <= MAX_ZNAKOVA).slice(0, MAX_TEKSTOVA);
  return { vlasnik: p.user_id, lista, grupe };
}

// spremljeni prijevodi (tablica prijevodi) + ručni ispravci objekta (prijevodi_rucni)
async function spremljeni(objektId, lista, jezik) {
  const prijevodi = Object.create(null);     // tekst domaćina može biti i „constructor”
  const rucni = new Set();
  const poHashu = new Map(lista.map(s => [hash(s), s]));
  const hashevi = [...poHashu.keys()];
  for (let i = 0; i < hashevi.length; i += 80) {
    const r = await db(`prijevodi?select=hash,prijevod&jezik=eq.${jezik}&hash=in.(${hashevi.slice(i, i + 80).join(',')})`);
    if (!r.ok) return { tablica: false, prijevodi, rucni };   // sql/add-translations.sql nije pokrenut
    for (const x of r.data) { const s = poHashu.get(x.hash); if (s) prijevodi[s] = x.prijevod; }
  }
  const rr = await db(`prijevodi_rucni?select=hash,prijevod&property_id=eq.${enc(objektId)}&jezik=eq.${jezik}`);
  for (const x of redovi(rr)) { const s = poHashu.get(x.hash); if (s) { prijevodi[s] = x.prijevod; rucni.add(s); } }
  return { tablica: true, prijevodi, rucni };
}

// što fali — Claude, pa u tablicu prijevodi
async function dopuni(lista, prijevodi, jezik, rok) {
  const fali = lista.filter(s => !(s in prijevodi));
  if (!fali.length || !process.env.ANTHROPIC_API_KEY) return;
  const novi = await prevedi(fali, jezik, rok);
  const redoviZaUpis = Object.entries(novi).map(([s, p]) => ({ hash: hash(s), jezik, izvor: s, prijevod: p }));
  Object.assign(prijevodi, novi);
  if (redoviZaUpis.length) {
    await db('prijevodi?on_conflict=hash,jezik', { method: 'POST', body: redoviZaUpis, prefer: 'resolution=merge-duplicates,return=minimal' }).catch(() => {});
  }
}

// ── domaćin: tko je i je li objekt njegov ────────────────────
async function domacin(req, objektId) {
  const tok = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!tok || !UUID.test(String(objektId || ''))) return null;
  const u = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + tok } });
  if (!u.ok) return null;
  const user = await u.json().catch(() => null);
  if (!user || !user.id) return null;
  const p = redovi(await db(`properties?select=id,user_id&id=eq.${enc(objektId)}&limit=1`))[0];
  if (!p) return null;
  if (p.user_id === user.id) return { id: p.id, sve: true };
  // suradnik na objektu (sql/add-team-access.sql) smije isto; bez tablice → ne
  const m = redovi(await db(`property_members?select=id&property_id=eq.${enc(p.id)}&user_id=eq.${enc(user.id)}&accepted_at=not.is.null&limit=1`).catch(() => []));
  return m.length ? { id: p.id, sve: true } : null;
}

async function zaDomacina(req, res, q, posalji, pocetak) {
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  const post = req.method === 'POST';
  const objektId = post ? b && b.objekt : q.objekt;
  const jezik = String((post ? b && b.lang : q.lang) || '').toLowerCase();
  if (!JEZICI.includes(jezik) || jezik === 'hr') return posalji(400, { ok: false, error: 'lang' });
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return posalji(503, { ok: false, error: 'prijevodi nisu uključeni' });
  const o = await domacin(req, objektId);
  if (!o) return posalji(403, { ok: false, error: 'nije vaš objekt' });
  const t = await tekstovi(o);
  const jezici = await dopusteniJezici(t.vlasnik);
  if (!jezici.includes(jezik)) return posalji(200, { ok: true, jezici, jezik, dopusteno: false, stavke: [] });

  if (post) {
    const izmjene = Array.isArray(b.izmjene) ? b.izmjene.slice(0, MAX_TEKSTOVA) : [];
    const poznato = new Set(t.lista);
    const upis = [], brisi = [];
    for (const x of izmjene) {
      const izvor = typeof x.izvor === 'string' ? x.izvor.trim() : '';
      if (!poznato.has(izvor)) continue;                  // samo tekstovi ovog objekta
      const pr = typeof x.prijevod === 'string' ? x.prijevod.trim().slice(0, 4000) : '';
      if (pr) upis.push({ property_id: o.id, jezik, hash: hash(izvor), izvor, prijevod: pr, updated_at: new Date().toISOString() });
      else brisi.push(hash(izvor));
    }
    if (upis.length) {
      const r = await db('prijevodi_rucni?on_conflict=property_id,jezik,hash', { method: 'POST', body: upis, prefer: 'resolution=merge-duplicates,return=minimal' });
      if (!r.ok) return posalji(503, { ok: false, error: 'tablica prijevodi_rucni ne postoji (sql/add-translations.sql)' });
    }
    if (brisi.length) await db(`prijevodi_rucni?property_id=eq.${enc(o.id)}&jezik=eq.${jezik}&hash=in.(${brisi.join(',')})`, { method: 'DELETE' });
    return posalji(200, { ok: true, spremljeno: upis.length, vraceno: brisi.length });
  }

  const sp = await spremljeni(o.id, t.lista, jezik);
  if (!sp.tablica) return posalji(503, { ok: false, error: 'tablica prijevodi ne postoji (sql/add-translations.sql)' });
  if (q.prevedi) await dopuni(t.lista, sp.prijevodi, jezik, pocetak + ROK_MS);
  return posalji(200, { ok: true, jezici, jezik, dopusteno: true, ai: !!process.env.ANTHROPIC_API_KEY,
    stavke: t.lista.map(s => ({ izvor: s, grupa: t.grupe.get(s), prijevod: s in sp.prijevodi ? sp.prijevodi[s] : null, rucno: sp.rucni.has(s) })) });
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

  if (req.method === 'POST' || q.objekt) {
    try { return await zaDomacina(req, res, q, posalji, pocetak); }
    catch (e) { return posalji(502, { ok: false, error: String(e && e.message || e) }); }
  }

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

    // 1) spremljeni prijevodi i ručni ispravci domaćina
    const { tablica, prijevodi } = await spremljeni(o.id, t.lista, jezik);
    // bez tablice se ne prevodi: svako otvaranje bi se ponovno platilo
    if (!tablica) return posalji(200, { ok: true, jezici, jezik, prijevod: false, potpuno: false, prijevodi: {} });

    // 2) što fali — Claude, pa u tablicu
    await dopuni(t.lista, prijevodi, jezik, pocetak + ROK_MS);
    const potpuno = t.lista.every(s => s in prijevodi);
    return posalji(200, { ok: true, jezici, jezik, prijevod: true, potpuno, prijevodi }, !token && potpuno);
  } catch (e) {
    return posalji(502, { ok: false, error: String(e && e.message || e) });
  }
};

module.exports.dijelovi = dijelovi;
module.exports.hash = hash;
