// ============================================================
// POST /api/create-checkout-session  { plan: 'pro'|'business',
//                                      interval: 'month'|'year',
//                                      povratak: 'dashboard'|'account' }
// Authorization: Bearer <access token prijavljenog domaćina>
//
// Otvara Stripe Checkout za pretplatu i vraća { url }.
//
// IZNOS: nikad iz preglednika. Redovna cijena i popust dolaze iz baze
// (funkcija `cijena_plana_za_mene`, sql/add-plan-promotions.sql) —
// isti izračun koji stranice prikazuju. Popust ide kao Stripe kupon, pa
// Stripe sam vrati punu cijenu kad istekne „trajanje nakon kupnje”.
// Ako funkcija još ne postoji, naplaćuje se redovna cijena iz `plans`.
//
// Tko već ima aktivnu pretplatu karticom, ne dobiva drugu: vraća se 409
// i preglednik otvara portal (promjena ili otkaz postojeće).
// ============================================================

const S = require('./_stripe.js');

const POVRATAK = { dashboard: '/dashboard.html', account: '/account.html' };
const AKTIVNA = ['active', 'trialing', 'past_due'];

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return S.posalji(res, 405, { error: 'Samo POST.' });
  if (!S.kljuc()) return S.posalji(res, 503, { error: 'Online plaćanje još nije uključeno.' });

  const u = await S.korisnik(req).catch(() => null);
  if (!u) return S.posalji(res, 401, { error: 'Niste prijavljeni.' });

  const b = (req.body && typeof req.body === 'object') ? req.body : {};
  const plan = String(b.plan || '');
  const interval = String(b.interval || 'month');
  if (!S.PLACENI.includes(plan)) return S.posalji(res, 400, { error: 'Nepoznat plan.' });
  if (!S.INTERVALI[interval]) return S.posalji(res, 400, { error: 'Nepoznato razdoblje.' });
  const put = POVRATAK[b.povratak] || POVRATAK.dashboard;
  const baza = S.ishodiste(req);
  if (!baza) return S.posalji(res, 400, { error: 'Nepoznata adresa.' });

  try {
    // 1. plan i redovna cijena (tablica `plans`, javno čitljiva)
    const p = await S.kaoKorisnik(u.token,
      `/plans?id=eq.${plan}&select=id,name,monthly_price_eur,yearly_price_eur`);
    const red = p.ok && Array.isArray(p.data) ? p.data[0] : null;
    if (!red) return S.posalji(res, 400, { error: 'Plan nije pronađen.' });
    let redovna = Number(interval === 'year' ? red.yearly_price_eur : red.monthly_price_eur);
    let cijena = redovna;
    let ponuda = null;

    // 2. popust — ista funkcija koju koristi prikaz; računa uvijek za auth.uid()
    const c = await S.kaoKorisnik(u.token, '/rpc/cijena_plana_za_mene', {
      method: 'POST', body: { p_plan: plan, p_razdoblje: S.INTERVALI[interval] }
    });
    if (c.ok && c.data && c.data.cijena != null) {
      redovna = Number(c.data.redovna);
      cijena = Number(c.data.cijena);
      ponuda = c.data.ponuda || null;
    }
    if (!(redovna > 0)) return S.posalji(res, 400, { error: 'Plan nema cijenu za to razdoblje.' });

    // 3. postojeća pretplata: ne otvarati drugu
    const s = await S.kaoKorisnik(u.token, `/subscriptions?user_id=eq.${u.id}&select=*`);
    const sub = s.ok && Array.isArray(s.data) ? s.data[0] : null;
    if (sub && sub.stripe_subscription_id && AKTIVNA.includes(sub.status)
        && (!sub.period_end || new Date(sub.period_end) > new Date())) {
      return S.posalji(res, 409, { error: 'Već imate pretplatu karticom — promijenite je u portalu.', portal: true });
    }

    // 4. kupac: postojeći samo ako je stvarno ovog korisnika (metadata)
    let kupac = null;
    if (sub && sub.stripe_customer_id) {
      const k = await S.stripe('/customers/' + encodeURIComponent(sub.stripe_customer_id)).catch(() => null);
      if (k && !k.deleted && k.metadata && k.metadata.user_id === u.id) kupac = k.id;
    }

    // 5. proizvod s našim id-jem (jedan po planu, bez duplikata)
    const proizvod = await S.dohvatiIliNapravi('products', 'odmoria_' + plan, { name: 'Odmoria ' + red.name });

    // 6. kupon za popust
    let kupon = null;
    const popust = Math.round((redovna - cijena) * 100);
    if (ponuda && popust > 0) {
      const mjeseci = Number(ponuda.trajanje_mjeseci) || null;
      const trajanje = !mjeseci ? { duration: 'forever' }
        : interval === 'year' ? { duration: 'once' }
        : { duration: 'repeating', duration_in_months: mjeseci };
      const id = ['odm', String(ponuda.id).replace(/-/g, '').slice(0, 12), popust, trajanje.duration, trajanje.duration_in_months || 0].join('_');
      kupon = await S.dohvatiIliNapravi('coupons', id, Object.assign({
        amount_off: popust, currency: 'eur', name: String(ponuda.naziv || 'Popust').slice(0, 40)
      }, trajanje));
    }

    // 7. Checkout
    const meta = { user_id: u.id, plan, interval };
    const params = {
      mode: 'subscription',
      locale: 'hr',
      client_reference_id: u.id,
      metadata: meta,
      subscription_data: { metadata: meta },
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'eur',
          product: proizvod.id,
          unit_amount: Math.round(redovna * 100),
          recurring: { interval }
        }
      }],
      success_url: baza + put + '?placanje=uspjeh' + (put === POVRATAK.account ? '#pretplata' : ''),
      cancel_url: baza + put + '?placanje=odustao' + (put === POVRATAK.account ? '#pretplata' : '')
    };
    if (kupac) params.customer = kupac;
    else if (u.email) params.customer_email = u.email;
    if (kupon) params.discounts = [{ coupon: kupon.id }];
    // ponuda koja ističe za manje od 24 h: ni Checkout ne smije živjeti dulje
    if (ponuda && ponuda.zavrsava) {
      const do_ = Math.floor(new Date(ponuda.zavrsava).getTime() / 1000);
      const sad = Math.floor(Date.now() / 1000);
      if (do_ - sad < 24 * 3600) params.expires_at = Math.max(do_, sad + 31 * 60);
    }

    const sesija = await S.stripe('/checkout/sessions', { method: 'POST', params });
    return S.posalji(res, 200, { url: sesija.url, test: S.testniNacin() });
  } catch (e) {
    console.error('checkout:', e.message);
    return S.posalji(res, 502, { error: 'Plaćanje se trenutačno ne može otvoriti. Pokušajte ponovno za minutu.' });
  }
};
