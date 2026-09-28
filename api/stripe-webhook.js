// ============================================================
// POST /api/stripe-webhook — Stripe javlja što se dogodilo s pretplatom.
//
// Jedino mjesto koje UPISUJE plaćeni plan u `subscriptions`. Preglednik
// to ne smije (inače bi si svatko dao Business), pa ovdje radi
// poslužiteljski ključ SUPABASE_SERVICE_ROLE_KEY iz okruženja Vercela.
//
// Sigurnost — tijelu zahtjeva se NE vjeruje:
//  - iz tijela se uzima samo id događaja (evt_…), a sam događaj se dohvati
//    od Stripea našim tajnim ključem. Izmišljen događaj tamo ne postoji → 400.
//    (Stripeov potpis nad sirovim tijelom ovdje se ne koristi: Vercel tijelo
//    sam pročita i pretvori u JSON, pa izvorni bajtovi nisu pouzdano dostupni.
//    Dohvat događaja je Stripeov dokumentirani zamjenski način provjere.)
//  - i pretplata se uvijek iznova dohvati od Stripea, pa redoslijed i
//    ponavljanje događaja ne mogu upisati staro stanje (Stripe šalje
//    „barem jednom”, ne nužno redom);
//  - kome pripada, piše u metapodacima koje je postavio naš checkout.
//
// Događaji koje treba uključiti u Stripeu (Developers → Webhooks):
//   checkout.session.completed, customer.subscription.created,
//   customer.subscription.updated, customer.subscription.deleted,
//   invoice.paid, invoice.payment_failed
// ============================================================

const S = require('./_stripe.js');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const IMA_PLAN = ['active', 'trialing', 'past_due'];   // plan vrijedi
const GOTOVA = ['canceled', 'unpaid', 'incomplete_expired']; // natrag na Free

// id pretplate iz bilo kojeg od događaja koje slušamo
function idPretplate(obj) {
  if (!obj) return null;
  if (obj.object === 'subscription') return obj.id;
  const s = obj.subscription
    || (obj.parent && obj.parent.subscription_details && obj.parent.subscription_details.subscription);
  return typeof s === 'string' ? s : (s && s.id) || null;
}

// Upis stanja jedne pretplate u korisnikov red. Vraća opis za zapisnik.
async function primijeni(sub, rezervniKorisnik) {
  const meta = sub.metadata || {};
  const userId = UUID.test(meta.user_id || '') ? meta.user_id : (UUID.test(rezervniKorisnik || '') ? rezervniKorisnik : null);
  if (!userId) return 'preskočeno: pretplata bez user_id';
  const kupac = typeof sub.customer === 'string' ? sub.customer : sub.customer && sub.customer.id;

  const redovi = await S.kaoPosluzitelj(`/subscriptions?user_id=eq.${userId}&select=*`);
  const red = Array.isArray(redovi) ? redovi[0] : null;

  // Stari događaj druge (npr. prijašnje, otkazane) pretplate ne smije
  // srušiti novu aktivnu.
  if (red && red.stripe_subscription_id && red.stripe_subscription_id !== sub.id && !IMA_PLAN.includes(sub.status)) {
    return 'preskočeno: događaj stare pretplate';
  }

  let promjena;
  if (IMA_PLAN.includes(sub.status)) {
    if (!S.PLACENI.includes(meta.plan)) return 'preskočeno: nepoznat plan u metapodacima';
    promjena = { plan: meta.plan, status: sub.status, period_end: S.krajRazdoblja(sub) };
  } else if (GOTOVA.includes(sub.status)) {
    promjena = { plan: 'free', status: sub.status, period_end: null };
  } else {
    // incomplete / paused: plaćanje nije prošlo, plan se ne mijenja
    return 'preskočeno: status ' + sub.status;
  }
  promjena.stripe_subscription_id = sub.id;
  if (kupac) promjena.stripe_customer_id = kupac;

  if (red) {
    await S.kaoPosluzitelj(`/subscriptions?user_id=eq.${userId}`, { method: 'PATCH', body: promjena, prefer: 'return=minimal' });
  } else {
    await S.kaoPosluzitelj('/subscriptions', { method: 'POST', body: Object.assign({ user_id: userId }, promjena), prefer: 'return=minimal' });
  }

  // Kupcu zapiši čiji je — portal i sljedeći checkout to provjeravaju.
  if (kupac) {
    await S.stripe('/customers/' + encodeURIComponent(kupac), { method: 'POST', params: { metadata: { user_id: userId } } })
      .catch(e => console.error('webhook: metapodaci kupca', e.message));
  }
  return `${userId}: ${promjena.plan} (${promjena.status})`;
}

// Tijelo zahtjeva: Vercel ga obično već pretvori u objekt; inače ga pročitaj.
async function tijelo(req) {
  let b = req.body;
  if (b === undefined) b = await S.sirovoTijelo(req);
  if (Buffer.isBuffer(b)) b = b.toString('utf8');
  if (typeof b === 'string') { try { b = JSON.parse(b); } catch { b = null; } }
  return b && typeof b === 'object' ? b : null;
}

async function handler(req, res) {
  if (req.method !== 'POST') return S.posalji(res, 405, { error: 'Samo POST.' });
  if (!S.kljuc()) return S.posalji(res, 503, { error: 'Stripe nije postavljen.' });

  const b = await tijelo(req);
  const idDogadjaja = b && typeof b.id === 'string' && /^evt_[A-Za-z0-9]+$/.test(b.id) ? b.id : null;
  if (!idDogadjaja) return S.posalji(res, 400, { error: 'Nema id-a događaja.' });

  let dogadjaj;
  try {
    dogadjaj = await S.stripe('/events/' + idDogadjaja);
  } catch (e) {
    if (e.status === 404) return S.posalji(res, 400, { error: 'Nepoznat događaj.' });
    console.error('webhook: dohvat događaja', e.message);
    return S.posalji(res, 500, { error: 'Stripe nedostupan.' });
  }

  const obj = dogadjaj.data && dogadjaj.data.object;
  const vrste = ['checkout.session.completed', 'customer.subscription.created', 'customer.subscription.updated',
    'customer.subscription.deleted', 'invoice.paid', 'invoice.payment_failed'];
  if (!vrste.includes(dogadjaj.type)) return S.posalji(res, 200, { primljeno: true, preskoceno: dogadjaj.type });

  const id = idPretplate(obj);
  if (!id) return S.posalji(res, 200, { primljeno: true, preskoceno: 'bez pretplate' });

  try {
    const sub = await S.stripe('/subscriptions/' + encodeURIComponent(id));
    const rezerva = dogadjaj.type === 'checkout.session.completed' ? obj.client_reference_id : null;
    const ishod = await primijeni(sub, rezerva);
    console.log('webhook', dogadjaj.type, ishod);
    return S.posalji(res, 200, { primljeno: true, ishod });
  } catch (e) {
    // 500 → Stripe ponavlja događaj (do 3 dana), npr. dok SQL nije pokrenut
    console.error('webhook', dogadjaj.type, e.message);
    return S.posalji(res, 500, { error: 'Upis nije uspio.' });
  }
}

module.exports = handler;
module.exports._primijeni = primijeni;
