// ============================================================
// POST /api/create-portal-session  { povratak: 'dashboard'|'account' }
// Authorization: Bearer <access token prijavljenog domaćina>
//
// Otvara Stripeov portal za kupce (kartica, računi, otkaz) i vraća { url }.
// Kupac se uzima iz korisnikovog reda u `subscriptions`, ali portal se
// otvara SAMO ako Stripeov kupac u metapodacima nosi isti user_id — da se
// podmetnutim stripe_customer_id-jem ne može otvoriti tuđi portal.
//
// U testnom načinu portal treba jednom uključiti: Stripe → Settings →
// Billing → Customer portal → Save (vidi docs/odluke.md, točka 16).
// ============================================================

const S = require('./_stripe.js');

const POVRATAK = { dashboard: '/dashboard.html', account: '/account.html#pretplata' };

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return S.posalji(res, 405, { error: 'Samo POST.' });
  if (!S.kljuc()) return S.posalji(res, 503, { error: 'Online plaćanje još nije uključeno.' });

  const u = await S.korisnik(req).catch(() => null);
  if (!u) return S.posalji(res, 401, { error: 'Niste prijavljeni.' });
  const baza = S.ishodiste(req);
  if (!baza) return S.posalji(res, 400, { error: 'Nepoznata adresa.' });
  const b = (req.body && typeof req.body === 'object') ? req.body : {};

  try {
    const s = await S.kaoKorisnik(u.token, `/subscriptions?user_id=eq.${u.id}&select=*`);
    const sub = s.ok && Array.isArray(s.data) ? s.data[0] : null;
    const id = sub && sub.stripe_customer_id;
    if (!id) return S.posalji(res, 404, { error: 'Nemate pretplatu plaćenu karticom.' });

    const kupac = await S.stripe('/customers/' + encodeURIComponent(id)).catch(() => null);
    if (!kupac || kupac.deleted || !kupac.metadata || kupac.metadata.user_id !== u.id) {
      return S.posalji(res, 403, { error: 'Pretplata nije pronađena na vašem računu.' });
    }

    const portal = await S.stripe('/billing_portal/sessions', {
      method: 'POST',
      params: { customer: kupac.id, locale: 'hr', return_url: baza + (POVRATAK[b.povratak] || POVRATAK.dashboard) }
    });
    return S.posalji(res, 200, { url: portal.url });
  } catch (e) {
    console.error('portal:', e.message);
    return S.posalji(res, 502, { error: 'Portal se trenutačno ne može otvoriti. Pokušajte ponovno za minutu.' });
  }
};
