// ============================================================
// /api/sync-ical?property_id=… — gumb „Sinkroniziraj” u dashboardu
//
// Sigurnost: funkcija NEMA service role ključ. Radi s korisnikovim
// access tokenom, pa RLS i dalje odlučuje što smije pročitati i
// upisati — korisnik može sinkronizirati samo vlastiti objekt.
// Sama sinkronizacija je u api/_ical.js (dijeli je i api/sync-all.js).
// ============================================================

const I = require('./_ical.js');

module.exports = async (req, res) => {
  const propertyId = (req.query && req.query.property_id) || '';
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : '';

  if (!propertyId) { res.status(400).json({ error: 'Nedostaje property_id.' }); return; }
  if (!token) { res.status(401).json({ error: 'Niste prijavljeni.' }); return; }

  try {
    // Objekt — RLS pušta samo vlasniku, pa je ovo ujedno provjera prava.
    const pr = await I.rest('properties?id=eq.' + encodeURIComponent(propertyId) + '&select=id,ical_booking_url,ical_airbnb_url', token);
    if (!pr.ok) { res.status(pr.status).json({ error: 'Supabase: ' + await pr.text() }); return; }
    const prop = (await pr.json())[0];
    if (!prop) { res.status(404).json({ error: 'Objekt nije pronađen ili nije vaš.' }); return; }

    const r = await I.syncProperty(prop, token);
    if (!r.results.length && r.error) { res.status(400).json({ error: r.error }); return; }
    res.status(200).json(r);
  } catch (e) {
    res.status(500).json({ error: String(e && e.message || e) });
  }
};

// izvezeno radi testiranja
module.exports.parseIcal = I.parseIcal;
module.exports.nightsBetween = I.nightsBetween;
module.exports.safeUrl = I.safeUrl;
