// Ovaj modul pretpostavlja da dashboard već ima inicijaliziran Supabase client.

async function authHeaders(supabase) {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session) throw new Error("Niste prijavljeni.");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session.access_token}`,
  };
}

export async function startCheckout(supabase, plan, interval = "month") {
  const response = await fetch("/api/create-checkout-session", {
    method: "POST",
    headers: await authHeaders(supabase),
    body: JSON.stringify({ plan, interval }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Checkout nije pokrenut.");
  window.location.assign(result.url);
}

export async function openBillingPortal(supabase) {
  const response = await fetch("/api/create-portal-session", {
    method: "POST",
    headers: await authHeaders(supabase),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Portal nije dostupan.");
  window.location.assign(result.url);
}

export function trackOdmoriaEvent(slug, event) {
  // Namjerno fire-and-forget: statistika ne smije usporiti stranicu gosta.
  fetch("/api/track-event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug, event }),
    keepalive: true,
  }).catch(() => {});
}

