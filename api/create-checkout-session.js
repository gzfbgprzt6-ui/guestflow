// ============================================================
// POST /api/create-checkout-session  { plan: 'pro'|'business',
//                                      interval: 'month'|'year',
//                                      objekata: broj objekata (v5),
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
// CIJENA PO OBJEKTU (v5, sql/add-per-object-plans.sql): Stripeova
// „quantity” = broj objekata, u granicama plana (min_properties …
// max_properties). Webhook je upiše u subscriptions.kolicina, a baza po
// njoj pušta nove objekte.
//
// Tko već ima aktivnu pretplatu karticom, ne dobiva drugu: postojeća se
// PROMIJENI (broj objekata, plan, razdoblje) uz razmjerni obračun odmah
// ({ promijenjeno: true }). Bez `objekata` i dalje se vraća 409 → portal.
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
  if (b.dodatak === 'poddomena') return dodatakPoddomena(req, res, u, b);
  const plan = String(b.plan || '');
  const interval = String(b.interval || 'month');
  if (!S.PLACENI.includes(plan)) return S.posalji(res, 400, { error: 'Nepoznat plan.' });
  if (!S.INTERVALI[interval]) return S.posalji(res, 400, { error: 'Nepoznato razdoblje.' });
  const put = POVRATAK[b.povratak] || POVRATAK.dashboard;
  const baza = S.ishodiste(req);
  if (!baza) return S.posalji(res, 400, { error: 'Nepoznata adresa.' });

  try {
    // 1. plan i redovna cijena (tablica `plans`, javno čitljiva)
    let p = await S.kaoKorisnik(u.token,
      `/plans?id=eq.${plan}&select=id,name,monthly_price_eur,yearly_price_eur,po_objektu,min_properties,max_properties`);
    if (!p.ok) p = await S.kaoKorisnik(u.token,   // bez sql/add-per-object-plans.sql
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

    // broj objekata koji se plaća (cijena je po objektu)
    let kolicina = 1;
    if (red.po_objektu) {
      const min = Math.max(1, Number(red.min_properties) || 1);
      const max = Number(red.max_properties) > 0 ? Number(red.max_properties) : 500;
      const trazeno = Math.floor(Number(b.objekata));
      if (!(trazeno >= 1)) return S.posalji(res, 400, { error: 'Upišite broj objekata.' });
      if (trazeno > max) return S.posalji(res, 400, { error: `Plan ${red.name} je za najviše ${max} objekata.`, plan_premali: true });
      kolicina = Math.max(min, trazeno);
    }

    // 3. postojeća pretplata: ne otvarati drugu
    const s = await S.kaoKorisnik(u.token, `/subscriptions?user_id=eq.${u.id}&select=*`);
    const sub = s.ok && Array.isArray(s.data) ? s.data[0] : null;
    if (sub && sub.stripe_subscription_id && AKTIVNA.includes(sub.status)
        && (!sub.period_end || new Date(sub.period_end) > new Date())) {
      if (!red.po_objektu || b.objekata == null) {
        return S.posalji(res, 409, { error: 'Već imate pretplatu karticom — promijenite je u portalu.', portal: true });
      }
      // promjena postojeće: isti kupac, ista pretplata, razmjerni obračun odmah
      const st = await S.stripe('/subscriptions/' + encodeURIComponent(sub.stripe_subscription_id));
      const stavka = st.items && st.items.data && st.items.data[0];
      if (!stavka || !st.metadata || st.metadata.user_id !== u.id) {
        return S.posalji(res, 409, { error: 'Pretplatu promijenite u portalu.', portal: true });
      }
      const proizvodP = await S.dohvatiIliNapravi('products', 'odmoria_' + plan, { name: 'Odmoria ' + red.name });
      await S.stripe('/subscriptions/' + encodeURIComponent(st.id), { method: 'POST', params: {
        metadata: { user_id: u.id, plan, interval },
        proration_behavior: 'always_invoice',
        items: [{ id: stavka.id, quantity: kolicina, price_data: {
          currency: 'eur', product: proizvodP.id, unit_amount: Math.round(redovna * 100), recurring: { interval } } }]
      } });
      return S.posalji(res, 200, { promijenjeno: true, objekata: kolicina, test: S.testniNacin() });
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
    // kupon je iznos s cijelog računa → popust po objektu × broj objekata
    const popust = Math.round((redovna - cijena) * 100) * kolicina;
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
    const meta = { user_id: u.id, plan, interval, objekata: String(kolicina) };
    const params = {
      mode: 'subscription',
      locale: 'hr',
      client_reference_id: u.id,
      metadata: meta,
      subscription_data: { metadata: meta },
      line_items: [{
        quantity: kolicina,
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

// ------------------------------------------------------------
// Dodatak „Vlastita adresa” (sql/add-subdomain.sql): godišnja pretplata po
// objektu, cijena iz tablice `dodaci` (nikad iz preglednika). Ime adrese
// domaćin prvo spremi u properties.poddomena; webhook nakon plaćanja upiše
// poddomena_do (do kada adresa radi).
// ------------------------------------------------------------
async function dodatakPoddomena(req, res, u, b) {
  const baza = S.ishodiste(req);
  if (!baza) return S.posalji(res, 400, { error: 'Nepoznata adresa.' });
  const pid = String(b.objekt || '');
  if (!/^[0-9a-f-]{36}$/i.test(pid)) return S.posalji(res, 400, { error: 'Nepoznat objekt.' });
  try {
    const o = await S.kaoKorisnik(u.token, `/properties?id=eq.${pid}&user_id=eq.${u.id}&select=id,name,poddomena,poddomena_do`);
    const prop = o.ok && Array.isArray(o.data) ? o.data[0] : null;
    if (!prop) return S.posalji(res, 404, { error: 'Objekt nije pronađen na vašem računu.' });
    if (!prop.poddomena) return S.posalji(res, 400, { error: 'Prvo spremite ime adrese.' });
    if (prop.poddomena_do && new Date(prop.poddomena_do) > new Date()) return S.posalji(res, 409, { error: 'Adresa je već plaćena.', portal: true });
    const d = await S.kaoKorisnik(u.token, '/dodaci?id=eq.poddomena&aktivan=is.true&select=*');
    const dod = d.ok && Array.isArray(d.data) ? d.data[0] : null;
    if (!dod || !(Number(dod.cijena_god) > 0)) return S.posalji(res, 503, { error: 'Dodatak trenutačno nije dostupan.' });
    const proizvod = await S.dohvatiIliNapravi('products', 'odmoria_poddomena', { name: 'Odmoria — vlastita adresa' });
    const meta = { user_id: u.id, dodatak: 'poddomena', property_id: prop.id, poddomena: prop.poddomena };
    const s = await S.kaoKorisnik(u.token, `/subscriptions?user_id=eq.${u.id}&select=stripe_customer_id`);
    let kupac = null;
    const cid = s.ok && Array.isArray(s.data) && s.data[0] && s.data[0].stripe_customer_id;
    if (cid) {
      const k = await S.stripe('/customers/' + encodeURIComponent(cid)).catch(() => null);
      if (k && !k.deleted && k.metadata && k.metadata.user_id === u.id) kupac = k.id;
    }
    const params = {
      mode: 'subscription', locale: 'hr', client_reference_id: u.id, metadata: meta,
      subscription_data: { metadata: meta, description: prop.poddomena + '.odmoria.hr — ' + String(prop.name || '').slice(0, 60) },
      line_items: [{ quantity: 1, price_data: { currency: 'eur', product: proizvod.id, unit_amount: Math.round(Number(dod.cijena_god) * 100), recurring: { interval: 'year' } } }],
      success_url: baza + '/dashboard.html?placanje=uspjeh&otvori=adresa',
      cancel_url: baza + '/dashboard.html?placanje=odustao&otvori=adresa'
    };
    if (kupac) params.customer = kupac; else if (u.email) params.customer_email = u.email;
    const sesija = await S.stripe('/checkout/sessions', { method: 'POST', params });
    return S.posalji(res, 200, { url: sesija.url, test: S.testniNacin() });
  } catch (e) {
    console.error('checkout poddomena:', e.message);
    return S.posalji(res, 502, { error: 'Plaćanje se trenutačno ne može otvoriti. Pokušajte ponovno za minutu.' });
  }
}
