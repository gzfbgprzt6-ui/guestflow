// ============================================================
// /api/keepalive — drži Supabase projekt budnim
//
// Zašto postoji: Supabase Free tier pauzira projekt nakon ~7 dana
// bez ijednog upita. Kad se to dogodi, CIJELA aplikacija baca
// "Failed to fetch" — landing, dashboard i gostinski vodič.
// Vercel Cron (vidi vercel.json) poziva ovu rutu jednom dnevno i
// napravi jedan trivijalan read, što je dovoljno da projekt ostane aktivan.
//
// Namjerno bez ijedne npm ovisnosti — projekt nema build korak,
// pa se Supabase zove izravno preko REST API-ja.
// ============================================================

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://wtojzqjhipdfbrnmprmz.supabase.co';
const SUPABASE_ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_tmZAZTDbQ7ktc1N-8y4q4w_ztAu_62F';

module.exports = async (req, res) => {
  // Ako je CRON_SECRET postavljen u Vercelu, propusti samo Vercel Cron.
  // Bez njega ruta je javna, ali radi samo jedan read javne tablice.
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || '';
    if (auth !== 'Bearer ' + secret) {
      res.status(401).json({ ok: false, error: 'Unauthorized' });
      return;
    }
  }

  const started = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);

  try {
    // `plans` je javno čitljiva (landing i help.html je čitaju bez prijave).
    const r = await fetch(SUPABASE_URL + '/rest/v1/plans?select=id&limit=1', {
      signal: ctl.signal,
      headers: { apikey: SUPABASE_ANON, Authorization: 'Bearer ' + SUPABASE_ANON }
    });

    const ms = Date.now() - started;

    if (!r.ok) {
      // 5xx ovdje najčešće znači da je projekt već pauziran i da se budi.
      res.status(200).json({ ok: false, status: r.status, ms, note: 'Supabase nije odgovorio s 2xx' });
      return;
    }

    const rows = await r.json();
    res.status(200).json({ ok: true, rows: Array.isArray(rows) ? rows.length : 0, ms });
  } catch (e) {
    res.status(200).json({ ok: false, error: String(e && e.message || e) });
  } finally {
    clearTimeout(timer);
  }
};
