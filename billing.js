// Plaćanje karticom (Stripe) iz preglednika — dashboard (Pretplata) i Račun.
// Preglednik NIKAD ne šalje iznos: poslužitelj ga računa iz baze
// (api/create-checkout-session.js → cijena_plana_za_mene).
// Ovaj modul pretpostavlja da stranica već ima inicijaliziran Supabase client.

async function authHeaders(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Niste prijavljeni.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session.access_token}`,
  };
}

// { stripe: je li plaćanje karticom uključeno, test: testni način }
// Ako ruta ne postoji ili ne odgovori, vrijedi stari put (e-mail).
export async function billingStatus() {
  try {
    const r = await fetch("/api/billing-status", { cache: "no-store" });
    if (!r.ok) return { stripe: false, test: false };
    const d = await r.json();
    return { stripe: Boolean(d.stripe), test: Boolean(d.test) };
  } catch {
    return { stripe: false, test: false };
  }
}

// Otvara Stripe Checkout. Ako korisnik već ima pretplatu karticom,
// poslužitelj vrati 409 pa se umjesto toga otvara portal.
export async function startCheckout(supabase, plan, interval = "month", povratak = "dashboard") {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: await authHeaders(supabase),
    body: JSON.stringify({ plan, interval, povratak }),
  });
  const result = await response.json().catch(() => ({}));
  if (response.status === 409 && result.portal) return openBillingPortal(supabase, povratak);
  if (!response.ok || !result.url) throw new Error(result.error || "Plaćanje nije pokrenuto.");
  window.location.assign(result.url);
}

export async function openBillingPortal(supabase, povratak = "dashboard") {
  const response = await fetch("/api/create-portal-session", {
    method: "POST",
    headers: await authHeaders(supabase),
    body: JSON.stringify({ povratak }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.url) throw new Error(result.error || "Portal nije dostupan.");
  window.location.assign(result.url);
}

// Povratak sa Stripea: ?placanje=uspjeh | odustao. Vrati vrijednost i makni
// je iz adrese (da osvježavanje stranice ne ponovi poruku).
export function povratakSPlacanja() {
  const q = new URLSearchParams(location.search);
  const v = q.get("placanje");
  if (!v) return null;
  q.delete("placanje");
  const s = q.toString();
  history.replaceState(null, "", location.pathname + (s ? "?" + s : "") + location.hash);
  return v === "uspjeh" || v === "odustao" ? v : null;
}

// Nakon uspješnog plaćanja plan upisuje webhook, obično za sekundu-dvije.
// Čeka dok red u `subscriptions` ne pokaže plaćeni plan (najviše ~20 s).
export async function cekajPlan(supabase, userId, jePlacen, { pokusaja = 10, razmak = 2000 } = {}) {
  for (let i = 0; i < pokusaja; i++) {
    const { data } = await supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle();
    if (data && jePlacen(data)) return data;
    await new Promise((r) => setTimeout(r, razmak));
  }
  return null;
}
