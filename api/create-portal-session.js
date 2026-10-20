// ============================================================
// POST /api/create-portal-session  { povratak: 'dashboard'|'account' }
// Authorization: Bearer <access token prijavljenog domaćina>
//
// Otvara Stripeov portal za kupce (kartica, računi, otkaz) i vraća { url }.
// Kupac se uzima iz korisnikovog reda u `subscriptions`, ali portal se
// otvara SAMO ako Stripeov kupac u metapodacima nosi isti user_id — da se
// podmetnutim stripe_customer_id-jem ne može otvoriti tuđi portal.
//
// v5: portal koristi NAŠU konfiguraciju (napravi se sama jednom, prepozna
// se po metadata.odmoria = 'portal-v5'): kartica, računi i otkaz da, ali
// BEZ promjene plana i količine — broj objekata mijenja se u dashboardu
// (create-checkout-session), inače bi se plan i subscriptions.kolicina
// razišli. Ne uspije li izrada, otvara se zadani portal kao prije.
// ============================================================

const S = require('./_stripe.js');

const POVRATAK = { dashboard: '/dashboard.html', account: '/account.html#pretplata' };
const OZNAKA = 'portal-v5';

async function konfiguracija(baza) {
  const l = await S.stripe('/billing_portal/configurations', { params: { active: 'true', limit: 100 } });
  const ima = (l.data || []).find(c => c.metadata && c.metadata.odmoria === OZNAKA);
  if (ima) return ima.id;
  const nova = await S.stripe('/billing_portal/configurations', { method: 'POST', params: {
    metadata: { odmoria: OZNAKA },
    business_profile: { privacy_policy_url: baza + '/privacy.html', terms_of_service_url: baza + '/terms.html' },
    features: {
      payment_method_update: { enabled: true },
      invoice_history: { enabled: true },
      customer_update: { enabled: true, allowed_updates: ['email', 'address', 'tax_id'] },
      subscription_cancel: { enabled: true, mode: 'at_period_end' },
      subscription_update: { enabled: false }
    }
  } });
  return nova.id;
}

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

    const params = { customer: kupac.id, locale: 'hr', return_url: baza + (POVRATAK[b.povratak] || POVRATAK.dashboard) };
    const konf = await konfiguracija(baza).catch(e => { console.error('portal: konfiguracija', e.message); return null; });
    if (konf) params.configuration = konf;
    const portal = await S.stripe('/billing_portal/sessions', { method: 'POST', params });
    return S.posalji(res, 200, { url: portal.url });
  } catch (e) {
    console.error('portal:', e.message);
    return S.posalji(res, 502, { error: 'Portal se trenutačno ne može otvoriti. Pokušajte ponovno za minutu.' });
  }
};
