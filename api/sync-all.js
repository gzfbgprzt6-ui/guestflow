// ============================================================
// /api/sync-all — automatska iCal sinkronizacija svih objekata
//
// Zove je zakazani zadatak (Supabase pg_cron svakih 10 min, vidi
// sql/auto-ical-sync.sql) i dnevni Vercel Cron preko api/keepalive.js.
// Ruta je zaključana tajnom: zaglavlje `Authorization: Bearer <CRON_SECRET>`.
// Bez CRON_SECRET ili SUPABASE_SERVICE_ROLE_KEY u Vercelu ne radi ništa.
//
// Obradi najdulje nesinkronizirane objekte dok ima vremena (serije),
// objekt sinkroniziran u zadnjih 8 min preskoči.
//
// Ista funkcija nosi i /api/obavijest (?push=1 → api/_push.js) — na Hobby
// planu je svih 12 funkcija zauzeto.
// ============================================================

const I = require('./_ical.js');
const PUSH = require('./_push.js');

module.exports = async (req, res) => {
  // /api/obavijest (vercel.json) — obavijesti na mobitel domaćina, vidi api/_push.js
  if (req.query && req.query.push) return PUSH.obradi(req, res);
  const tajna = process.env.CRON_SECRET || '';
  if (!tajna) { res.status(503).json({ ok: false, error: 'CRON_SECRET nije postavljen.' }); return; }
  if ((req.headers.authorization || '') !== 'Bearer ' + tajna) { res.status(401).json({ ok: false, error: 'Unauthorized' }); return; }
  try {
    const r = await I.syncAll();
    res.status(r.ok ? 200 : 503).json(r);
  } catch (e) {
    res.status(500).json({ ok: false, error: String(e && e.message || e) });
  }
};
