// Odmoria planovi — jedini frontend izvor istine za prikaz limita.
// Sigurnosni limiti se dodatno provode u Supabase migraciji.

export const ODMORIA_PLANS = Object.freeze({
  free: Object.freeze({
    id: "free",
    name: "Free",
    description: "Za prvi digitalni vodič",
    monthlyPriceEur: 0,
    yearlyPriceEur: 0,
    maxProperties: 1,
    maxPhotosPerProperty: 5,
    maxLocalPlacesPerProperty: 5,
    maxTransportPerProperty: 3,
    maxAttractionsPerProperty: 3,
    maxLanguages: 2,
    analyticsDays: 0,
    maxTeamMembers: 1,
    canRemoveBranding: false,
    canCloneProperty: false,
    whiteLabel: false,
  }),

  pro: Object.freeze({
    id: "pro",
    name: "Pro",
    description: "Za domaćine s do 5 objekata",
    monthlyPriceEur: 15,
    yearlyPriceEur: 150,
    maxProperties: 5,
    maxPhotosPerProperty: 30,
    maxLocalPlacesPerProperty: 30,
    maxTransportPerProperty: 20,
    maxAttractionsPerProperty: 30,
    maxLanguages: 8,
    analyticsDays: 90,
    maxTeamMembers: 1,
    canRemoveBranding: true,
    canCloneProperty: true,
    whiteLabel: false,
  }),

  business: Object.freeze({
    id: "business",
    name: "Business",
    description: "Za profesionalce i timove s do 15 objekata",
    monthlyPriceEur: 49,
    yearlyPriceEur: 490,
    maxProperties: 15,
    maxPhotosPerProperty: 50,
    maxLocalPlacesPerProperty: 100,
    maxTransportPerProperty: 50,
    maxAttractionsPerProperty: 100,
    maxLanguages: 8,
    analyticsDays: 365,
    maxTeamMembers: 5,
    canRemoveBranding: true,
    canCloneProperty: true,
    whiteLabel: true,
  }),
});

export function normalizePlanId(planId) {
  // Kompatibilnost sa starom vrijednošću iz postojeće sheme.
  if (planId === "agency") return "business";
  return ODMORIA_PLANS[planId] ? planId : "free";
}

export function getPlan(planId) {
  return ODMORIA_PLANS[normalizePlanId(planId)];
}

export function canCreateProperty(planId, currentCount) {
  return Number(currentCount) < getPlan(planId).maxProperties;
}

export function getRemainingProperties(planId, currentCount) {
  return Math.max(0, getPlan(planId).maxProperties - Number(currentCount));
}

export function getUpgradeTarget(planId) {
  const normalized = normalizePlanId(planId);
  if (normalized === "free") return "pro";
  if (normalized === "pro") return "business";
  return null;
}

export function formatPlanPrice(planId, interval = "month") {
  const plan = getPlan(planId);
  if (plan.id === "free") return "Besplatno";
  const amount = interval === "year" ? plan.yearlyPriceEur : plan.monthlyPriceEur;
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function limitMessage(resource, planId) {
  const plan = getPlan(planId);
  const messages = {
    properties: `Dosegnuli ste limit od ${plan.maxProperties} objekata na ${plan.name} planu.`,
    photos: `Dosegnuli ste limit od ${plan.maxPhotosPerProperty} fotografija po objektu.`,
    localPlaces: `Dosegnuli ste limit od ${plan.maxLocalPlacesPerProperty} lokalnih preporuka.`,
    transport: `Dosegnuli ste limit od ${plan.maxTransportPerProperty} prijevoznih opcija.`,
    attractions: `Dosegnuli ste limit od ${plan.maxAttractionsPerProperty} atrakcija.`,
  };
  return messages[resource] || "Dosegnuli ste limit trenutnog plana.";
}

