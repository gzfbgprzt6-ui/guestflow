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
    description: "Za prvi digitalni vodič",
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
  },
  pro: {
    id: "pro",
    name: "Pro",
    description: "Za domaćine s do 5 objekata",
    sortOrder: 2,
    monthlyPriceEur: 15,
    yearlyPriceEur: 150,
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
    canRemoveBranding: true,
    canCloneProperty: true,
    whiteLabel: false,
  },
  business: {
    id: "business",
    name: "Business",
    description: "Za profesionalce i timove",
    sortOrder: 3,
    monthlyPriceEur: 49,
    yearlyPriceEur: 490,
    seasonPriceEur: null,
    maxProperties: 15,
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
  };
}

/**
 * Ucita planove iz baze. Ako baza nije dostupna (npr. Supabase spava),
 * ostaju rezervne vrijednosti pa stranica i dalje radi.
 */
export async function loadPlans(sb) {
  if (loaded) return ODMORIA_PLANS;
  try {
    const { data, error } = await sb.from("plans").select("*").order("sort_order");
    if (error || !data?.length) return ODMORIA_PLANS;
    for (const row of data) ODMORIA_PLANS[row.id] = fromRow(row);
    loaded = true;
  } catch {
    /* rezervne vrijednosti ostaju */
  }
  return ODMORIA_PLANS;
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
  return `${plan.name} plan uključuje ${max} ${plural(max, label)}. Nadogradite plan za više.`;
}
