// ============================================================
// /api/track — upis pregleda s državom posjetitelja
//
// Zašto postoji: država se može saznati samo iz IP adrese, a preglednik
// je ne zna. Vercel u svaki poziv funkcije dodaje zaglavlje
// `x-vercel-ip-country` (ISO dvoslovna oznaka, npr. HR, DE). Ova ruta
// uzme tu oznaku i upiše red u `page_views`. IP adresa se NE sprema.
//
// Upis ide istim javnim ključem i istim RLS pravilom kao i prije iz
// preglednika („Anyone can log a page view”), pa ruta ne može ništa što
// preglednik ne može. Ako stupac `country` još ne postoji
// (sql/add-country-to-page-views.sql nije pokrenut), red se upiše bez njega.
//
// Namjerno bez ijedne npm ovisnosti (vidi api/keepalive.js).
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';

// iste vrste kao u p.html / h.html (funkcija biljezi) i analitika.js
const VRSTE = /^(public|guest_hub|inquiry_whatsapp|inquiry_email|inquiry_copy|map|guide:(dolazak|kuca|preporuke|domacin))$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function upisi(red, signal) {
  return fetch(SUPABASE_URL + '/rest/v1/page_views', {
    method: 'POST',
    signal,
    headers: {
      apikey: SUPABASE_ANON,
      Authorization: 'Bearer ' + SUPABASE_ANON,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal'
    },
    body: JSON.stringify(red)
  });
}

// XX = Vercel ne zna državu; T1 = Tor. Oboje se sprema kao nepoznato.
function drzava(h) {
  const c = String(h || '').trim().toUpperCase();
  return /^[A-Z]{2}$/.test(c) && c !== 'XX' && c !== 'T1' ? c : null;
}

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ ok: false });
    return;
  }

  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  if (!b || !UUID.test(String(b.property_id || '')) || !VRSTE.test(String(b.view_type || ''))) {
    res.status(400).json({ ok: false });
    return;
  }

  const red = { property_id: b.property_id, view_type: b.view_type };
  const country = drzava(req.headers['x-vercel-ip-country']);
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 5000);

  try {
    let r = await upisi(country ? { ...red, country } : red, ctl.signal);
    // 400 = PostgREST ne poznaje stupac `country` → isti red bez njega
    if (!r.ok && r.status === 400 && country) r = await upisi(red, ctl.signal);
    res.status(r.ok ? 204 : 502).end();
  } catch (e) {
    res.status(502).json({ ok: false });
  } finally {
    clearTimeout(timer);
  }
};

module.exports.drzava = drzava;
