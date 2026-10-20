// ============================================================================
//  Odmoria planovi
//  ---------------------------------------------------------------------------
//  Vrijednosti ispod su SAMO rezerva — stvarni izvor istine je tablica `plans`
//  u Supabaseu (vidi sql/plan-limits.sql). Pozovi loadPlans(sb) jednom pri
//  pokretanju stranice pa sve funkcije ispod rade s onim sto je u bazi.
//
//  Zasto tako: planovi i cijene ce se jos mijenjati. Promjena limita ili cijene
//  treba biti UPDATE u bazi, a ne izmjena koda na tri mjesta i novi deploy.
//  Limite usto provode okidaci u bazi, pa ovo ovdje sluzi za UI, ne za sigurnost.
// ============================================================================

const FALLBACK = {
  free: {
    id: "free",
    name: "Free",
    description: "Za prvi objekt",
    sortOrder: 1,
    monthlyPriceEur: 0,
    yearlyPriceEur: 0,
    seasonPriceEur: null,
    maxProperties: 1,
    maxPhotosPerProperty: 5,
    maxLocalPlacesPerProperty: 5,
    maxTransportPerProperty: 3,
    maxAttractionsPerProperty: 3,
    maxHouseRulesPerProperty: Infinity,
    maxFaqPerProperty: Infinity,
    maxLanguages: 2,
    maxTeamMembers: 1,
    analyticsDays: 0,
    canRemoveBranding: false,
    canCloneProperty: false,
    whiteLabel: false,
    mogucnosti: [],
  },
  pro: {
    id: "pro",
    name: "Domaćin",
    description: "Za 1–5 objekata, cijena po objektu",
    sortOrder: 2,
    monthlyPriceEur: 12,
    yearlyPriceEur: 99,
    poObjektu: true,
    minProperties: 1,
    seasonPriceEur: null,
    maxProperties: 5,
    maxPhotosPerProperty: 30,
    maxLocalPlacesPerProperty: 30,
    maxTransportPerProperty: 20,
    maxAttractionsPerProperty: 30,
    maxHouseRulesPerProperty: Infinity,
    maxFaqPerProperty: Infinity,
    maxLanguages: 8,
    maxTeamMembers: 1,
    analyticsDays: 90,
    canRemoveBranding: false,   // odluka vlasnika: oznaka i na Pro (sql/add-reviews.sql)
    canCloneProperty: true,
    whiteLabel: false,
    mogucnosti: ["koraci", "preporuke", "ocjena", "evisitor", "stilovi", "cistacica"],
  },
  business: {
    id: "business",
    name: "Agencija",
    description: "Za 6 i više objekata, cijena po objektu",
    sortOrder: 3,
    monthlyPriceEur: 9,
    yearlyPriceEur: 89,
    poObjektu: true,
    minProperties: 6,
    seasonPriceEur: null,
    maxProperties: Infinity,
    maxPhotosPerProperty: 50,
    maxLocalPlacesPerProperty: 100,
    maxTransportPerProperty: 50,
    maxAttractionsPerProperty: 100,
    maxHouseRulesPerProperty: Infinity,
    maxFaqPerProperty: Infinity,
    maxLanguages: 8,
    maxTeamMembers: 5,
    analyticsDays: 365,
    canRemoveBranding: true,
    canCloneProperty: true,
    whiteLabel: true,
    mogucnosti: ["koraci", "preporuke", "ocjena", "evisitor", "stilovi", "cistacica", "promocija", "email"],
  },
};

// Ziva kopija s kojom sve radi. loadPlans() je prepise vrijednostima iz baze.
export const ODMORIA_PLANS = structuredClone(FALLBACK);

let loaded = false;

/** -1 u bazi znaci "neograniceno" */
function num(value, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return n < 0 ? Infinity : n;
}

function fromRow(row) {
  const base = FALLBACK[row.id] || FALLBACK.free;
  return {
    id: row.id,
    name: row.name ?? base.name,
    description: row.description ?? base.description,
    sortOrder: num(row.sort_order, base.sortOrder),
    monthlyPriceEur: Number(row.monthly_price_eur ?? base.monthlyPriceEur),
    yearlyPriceEur: Number(row.yearly_price_eur ?? base.yearlyPriceEur),
    seasonPriceEur: row.season_price_eur == null ? null : Number(row.season_price_eur),
    // cijena po objektu (sql/add-per-object-plans.sql); bez stupca vrijedi rezerva
    poObjektu: row.po_objektu == null ? !!base.poObjektu : !!row.po_objektu,
    minProperties: num(row.min_properties, base.minProperties || 1),
    maxProperties: num(row.max_properties, base.maxProperties),
    maxPhotosPerProperty: num(row.max_photos_per_property, base.maxPhotosPerProperty),
    maxLocalPlacesPerProperty: num(row.max_local_places, base.maxLocalPlacesPerProperty),
    maxTransportPerProperty: num(row.max_transport, base.maxTransportPerProperty),
    maxAttractionsPerProperty: num(row.max_attractions, base.maxAttractionsPerProperty),
    maxHouseRulesPerProperty: num(row.max_house_rules, base.maxHouseRulesPerProperty),
    maxFaqPerProperty: num(row.max_faq, base.maxFaqPerProperty),
    maxLanguages: num(row.max_languages, base.maxLanguages),
    maxTeamMembers: num(row.max_team_members, base.maxTeamMembers),
    analyticsDays: num(row.analytics_days, base.analyticsDays),
    canRemoveBranding: !!row.can_remove_branding,
    canCloneProperty: !!row.can_clone_property,
    whiteLabel: !!row.white_label,
    // plans.mogucnosti (sql/add-plan-features.sql); bez stupca vrijedi rezerva gore
    mogucnosti: Array.isArray(row.mogucnosti) ? row.mogucnosti : base.mogucnosti,
  };
}

/**
 * Ucita planove iz baze. Ako baza nije dostupna (npr. Supabase spava),
 * ostaju rezervne vrijednosti pa stranica i dalje radi.
 */
export async function loadPlans(sb, opts = {}) {
  if (opts.userId) KORISNIK = opts.userId;   // za osobne popuste (vidi popustZa)
  if (loaded) return ODMORIA_PLANS;
  try {
    const { data, error } = await sb.from("plans").select("*").order("sort_order");
    if (!error && data?.length) {
      for (const row of data) ODMORIA_PLANS[row.id] = fromRow(row);
      loaded = true;
    }
  } catch {
    /* rezervne vrijednosti ostaju */
  }
  await loadPromocije(sb);
  return ODMORIA_PLANS;
}

// ---------------------------------------------------------------------------
//  Popusti (tablica plan_promotions, sql/add-plan-promotions.sql)
//  ISTA pravila kao funkcija cijena_plana() u bazi — prikazana cijena i buduća
//  naplata (Stripe, koji zove cijena_plana) moraju se slagati. RLS vraća samo
//  ponude koje upravo vrijede (općenite i osobne tog korisnika); admin dobije
//  sve, pa se ovdje uvijek još filtrira po vremenu i korisniku.
//  Dok tablica ne postoji, popusta nema i sve radi kao prije.
// ---------------------------------------------------------------------------
let PROMOCIJE = [];
let KORISNIK = null;

async function loadPromocije(sb) {
  try {
    const { data, error } = await sb.from("plan_promotions").select("*");
    if (!error && Array.isArray(data)) PROMOCIJE = data;
  } catch {
    /* bez popusta */
  }
}

export function listPromocije() {
  return PROMOCIJE.slice();
}

export function vrijediSada(p, sad = new Date()) {
  return p.aktivan !== false && new Date(p.pocinje) <= sad && (!p.zavrsava || new Date(p.zavrsava) > sad);
}

/**
 * Najbolji popust koji upravo vrijedi za plan i razdoblje ('month' | 'year').
 * Vraća {id, naziv, redovna, cijena, posto, zavrsava, osobni} ili null.
 */
export function popustZa(planId, interval = "month", userId = KORISNIK, { samoOsobni = false } = {}) {
  const plan = getPlan(planId);
  const raz = interval === "year" ? "godina" : "mjesec";
  const redovna = raz === "godina" ? plan.yearlyPriceEur : plan.monthlyPriceEur;
  if (!(redovna > 0)) return null;
  let best = null;
  for (const p of PROMOCIJE) {
    if (!vrijediSada(p)) continue;
    if (p.plan_id && p.plan_id !== plan.id) continue;
    if (p.razdoblje && p.razdoblje !== "oba" && p.razdoblje !== raz) continue;
    if (p.vrsta === "cijena" && (!p.razdoblje || p.razdoblje === "oba") && raz !== "mjesec") continue; // stari zapis: fiksna cijena = mjesečna
    if (p.user_id && p.user_id !== userId) continue;
    if (samoOsobni && !p.user_id) continue;
    const v = Number(p.vrijednost);
    const c = p.vrsta === "posto" ? Math.round(redovna * (1 - v / 100) * 100) / 100 : Math.min(redovna, v);
    if (!best || c < best.cijena)
      best = { id: p.id, naziv: p.naziv, redovna, cijena: c, posto: Math.round((1 - c / redovna) * 100), zavrsava: p.zavrsava || null, osobni: !!p.user_id, mjeseci: p.trajanje_mjeseci || null };
  }
  return best && best.cijena < redovna ? best : null;
}

/** Cijena koju korisnik stvarno plaća (s popustom ako vrijedi). */
export function cijenaPlana(planId, interval = "month") {
  const pop = popustZa(planId, interval);
  if (pop) return pop.cijena;
  const plan = getPlan(planId);
  return interval === "year" ? plan.yearlyPriceEur : plan.monthlyPriceEur;
}

/** 11,25 € / 15 € — decimale samo kad trebaju */
export function formatEur(n) {
  const cijeli = Math.round(n * 100) % 100 === 0;
  return new Intl.NumberFormat("hr-HR", { style: "currency", currency: "EUR", minimumFractionDigits: cijeli ? 0 : 2, maximumFractionDigits: 2 }).format(n);
}

/** Za admin: zamijeni popis ponuda nakon izmjene (bez ponovnog učitavanja stranice) */
export function postaviPromocije(lista) {
  PROMOCIJE = Array.isArray(lista) ? lista : [];
}

/** „prva 3 mj.” — koliko dugo popust traje nakon kupnje */
export function trajanjePopusta(pop) {
  const m = pop?.mjeseci;
  if (!m) return "";
  return m === 1 ? "prvi mjesec" : `prva ${m} mj.`;
}

/** „do 12. 10.” ili prazno kad ponuda nema rok */
export function rokPopusta(pop) {
  if (!pop?.zavrsava) return "";
  const d = new Date(pop.zavrsava);
  return `do ${d.getDate()}. ${d.getMonth() + 1}.`;
}

export function plansLoaded() {
  return loaded;
}

export function normalizePlanId(planId) {
  if (planId === "agency") return "business";      // stara vrijednost iz pocetne sheme
  return ODMORIA_PLANS[planId] ? planId : "free";
}

/**
 * Koji plan korisnik STVARNO ima, iz retka tablice `subscriptions`.
 * Istekao plan koji nije free pada na free — ista logika kao u bazi
 * (funkcija current_plan_id u sql/plan-limits.sql). Drzi se na jednom
 * mjestu da se stranice ne razidju.
 */
export function effectivePlanId(subscription) {
  if (!subscription?.plan) return "free";
  const plan = normalizePlanId(subscription.plan);
  if (plan === "free") return "free";
  const end = subscription.period_end;
  if (end && new Date(end) < new Date()) return "free";
  return plan;
}

export function getPlan(planId) {
  return ODMORIA_PLANS[normalizePlanId(planId)];
}

/**
 * Otključava li plan mogućnost (koraci, preporuke, ocjena, evisitor, stilovi,
 * cistacica, promocija, email). Izvor je plans.mogucnosti u bazi.
 */
export function imaMogucnost(planId, kljuc) {
  return (getPlan(planId).mogucnosti || []).includes(kljuc);
}

/** Najjeftiniji plan koji otključava mogućnost — za oznaku „Pro” / „Business”. */
export function planZaMogucnost(kljuc) {
  return Object.values(ODMORIA_PLANS)
    .filter((p) => (p.mogucnosti || []).includes(kljuc))
    .sort((a, b) => a.sortOrder - b.sortOrder)[0] || null;
}

// ---------------------------------------------------------------------------
//  Cijena po objektu (v5): Domaćin 1–5, Agencija 6+. Račun = cijena × objekti.
// ---------------------------------------------------------------------------

/** Koliko se objekata plaća za n objekata na planu (Agencija najmanje 6). */
export function placeniObjekti(planId, n) {
  const p = getPlan(planId);
  if (!p.poObjektu) return 1;
  return Math.max(p.minProperties || 1, Math.max(1, Math.floor(Number(n) || 1)));
}

/** Ukupno za n objekata (s popustom ako vrijedi). */
export function ukupnoZa(planId, interval, n) {
  return Math.round(cijenaPlana(planId, interval) * placeniObjekti(planId, n) * 100) / 100;
}

/** Plan koji odgovara broju objekata: 1 → Free, do 5 → Domaćin, više → Agencija. */
export function planZaBroj(n, { besplatno = true } = {}) {
  const lista = listPlans().filter((p) => p.monthlyPriceEur > 0 || besplatno);
  return lista.find((p) => Number(n) <= p.maxProperties && (p.poObjektu || p.monthlyPriceEur === 0)) || lista[lista.length - 1];
}

/** „ / objekt” uz cijenu kad je cijena po objektu */
export function poObjektuTxt(planId) {
  return getPlan(planId).poObjektu ? " / objekt" : "";
}

/**
 * Koliko objekata korisnik smije imati: plan, a kad je plaćeno po objektu,
 * plaćena količina (subscriptions.kolicina) — ista pravila kao plan_limit().
 */
export function limitObjekata(planId, sub) {
  const p = getPlan(planId);
  const max = p.maxProperties;
  const kol = sub && Number(sub.kolicina);
  if (p.poObjektu && normalizePlanId(planId) !== "free" && kol >= 1) return Math.min(max, Math.max(p.minProperties || 1, kol));
  return max;
}

export function listPlans() {
  return Object.values(ODMORIA_PLANS).sort((a, b) => a.sortOrder - b.sortOrder);
}

// ---------------------------------------------------------------------------
//  Limiti
// ---------------------------------------------------------------------------

// Naziv resursa -> polje u planu. Isti kljucevi kao u plan_limit() u bazi.
const LIMIT_FIELD = {
  properties: "maxProperties",
  photos: "maxPhotosPerProperty",
  local_places: "maxLocalPlacesPerProperty",
  transport: "maxTransportPerProperty",
  attractions: "maxAttractionsPerProperty",
  house_rules: "maxHouseRulesPerProperty",
  faq: "maxFaqPerProperty",
  languages: "maxLanguages",
  team_members: "maxTeamMembers",
};

export function limitFor(planId, resource) {
  const field = LIMIT_FIELD[resource];
  if (!field) return Infinity;
  return getPlan(planId)[field] ?? Infinity;
}

export function canAdd(planId, resource, currentCount) {
  return Number(currentCount) < limitFor(planId, resource);
}

export function remaining(planId, resource, currentCount) {
  const max = limitFor(planId, resource);
  if (max === Infinity) return Infinity;
  return Math.max(0, max - Number(currentCount));
}

export function canCreateProperty(planId, currentCount) {
  return canAdd(planId, "properties", currentCount);
}

export function getRemainingProperties(planId, currentCount) {
  return remaining(planId, "properties", currentCount);
}

export function getUpgradeTarget(planId) {
  const order = listPlans().map((p) => p.id);
  const i = order.indexOf(normalizePlanId(planId));
  return i >= 0 && i < order.length - 1 ? order[i + 1] : null;
}

// ---------------------------------------------------------------------------
//  Tekst za korisnika
// ---------------------------------------------------------------------------

export function formatPlanPrice(planId, interval = "month") {
  const plan = getPlan(planId);
  if (plan.monthlyPriceEur === 0 && plan.yearlyPriceEur === 0) return "Besplatno";
  const amount =
    interval === "season" && plan.seasonPriceEur != null ? plan.seasonPriceEur
    : interval === "year" ? plan.yearlyPriceEur
    : plan.monthlyPriceEur;
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

const RESOURCE_LABEL = {
  properties: ["objekt", "objekta", "objekata"],
  photos: ["fotografiju", "fotografije", "fotografija"],
  local_places: ["preporuku", "preporuke", "preporuka"],
  transport: ["prijevoz", "prijevoza", "prijevoza"],
  attractions: ["atrakciju", "atrakcije", "atrakcija"],
  house_rules: ["pravilo", "pravila", "pravila"],
  faq: ["pitanje", "pitanja", "pitanja"],
  languages: ["jezik", "jezika", "jezika"],
  team_members: ["člana tima", "člana tima", "članova tima"],
};

function plural(n, [one, few, many]) {
  const d10 = n % 10, d100 = n % 100;
  if (d10 === 1 && d100 !== 11) return one;
  if (d10 >= 2 && d10 <= 4 && (d100 < 12 || d100 > 14)) return few;
  return many;
}

export function limitMessage(resource, planId) {
  const plan = getPlan(planId);
  const max = limitFor(planId, resource);
  const label = RESOURCE_LABEL[resource];
  if (max === Infinity || !label) return "Dosegnuli ste limit trenutnog plana.";
  if (resource === "properties" && plan.id !== "free" && plan.poObjektu)
    return `Pretplata pokriva ${max} ${plural(max, label)}. Dodajte objekt u Pretplati — plaća se samo razlika.`;
  if (resource === "properties" && plan.id === "free")
    return `Free plan uključuje 1 objekt. Za više objekata odaberite Domaćin — plaća se po objektu.`;
  return `${plan.name} plan uključuje ${max} ${plural(max, label)}. Nadogradite plan za više.`;
}
