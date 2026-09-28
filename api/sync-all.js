// ============================================================
// /api/sync-all — automatska iCal sinkronizacija svih objekata
//
// Zove je zakazani zadatak (Supabase pg_cron svakih 30 min, vidi
// sql/auto-ical-sync.sql) i dnevni Vercel Cron preko api/keepalive.js.
// Ruta je zaključana tajnom: zaglavlje `Authorization: Bearer <CRON_SECRET>`.
// Bez CRON_SECRET ili SUPABASE_SERVICE_ROLE_KEY u Vercelu ne radi ništa.
//
// Obradi najdulje nesinkronizirane objekte dok ima vremena (serije),
// objekt sinkroniziran u zadnjih 20 min preskoči.
// ============================================================

const I = require('./_ical.js');

module.exports = async (req, res) => {
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
