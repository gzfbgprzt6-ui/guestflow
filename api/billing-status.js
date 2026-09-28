// ============================================================
// GET /api/billing-status → { stripe: bool, test: bool }
//
// Preglednik po ovome odlučuje pokazuje li gumbe za plaćanje karticom
// (i oznaku „testni način”) ili staru nadogradnju e-mailom. Ne vraća
// nikakve ključeve — samo jesu li postavljeni.
// ============================================================

const S = require('./_stripe.js');

module.exports = function handler(req, res) {
  const stripe = Boolean(S.kljuc() && process.env.SUPABASE_SERVICE_ROLE_KEY);
  res.setHeader('Cache-Control', 'no-store');
  return S.posalji(res, 200, { stripe, test: stripe && S.testniNacin() });
};
