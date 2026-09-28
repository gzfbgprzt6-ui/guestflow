-- ============================================================================
--  Odmoria — Stripe veza na tablici `subscriptions`
--  ---------------------------------------------------------------------------
--  Plaćanje karticom (api/create-checkout-session.js, api/stripe-webhook.js)
--  treba zapamtiti koji Stripeov kupac i koja pretplata pripadaju domaćinu:
--    - stripe_customer_id      → portal (kartica, računi, otkaz)
--    - stripe_subscription_id  → da se ne otvori druga pretplata i da stari
--                                događaj otkazane pretplate ne sruši novu
--  Plan, status i period_end piše SAMO webhook (poslužiteljskim ključem).
--
--  Pokrenuti u Supabase SQL editoru, KORAK po KORAK. Idempotentno.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  KORAK 0 — dijagnostika (samo čita). Pogledajte rezultat prije KORAKA 1.
-- ----------------------------------------------------------------------------
-- a) stupci: postoje li već stripe_* (ako da, provjerite što je u njima)
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'subscriptions'
order by ordinal_position;

-- b) provjere na stupcima (npr. dopuštene vrijednosti za status):
--    webhook upisuje Stripeove statuse: active, trialing, past_due,
--    canceled, unpaid, incomplete_expired
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.subscriptions'::regclass;

-- c) RLS pravila. VAŽNO: smije li domaćin sam MIJENJATI ili UPISIVATI svoj
--    red (cmd = UPDATE / INSERT / ALL za authenticated bez admin UID-a)?
--    Ako smije, može si sam upisati plan Business — javite, to se zatvara
--    zasebno (odluke.md, točka 16).
select policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename = 'subscriptions';


-- ----------------------------------------------------------------------------
--  KORAK 1 — stupci i indeks
-- ----------------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists stripe_customer_id     text,
  add column if not exists stripe_subscription_id text;

-- jedna Stripe pretplata = jedan domaćin
create unique index if not exists subscriptions_stripe_subscription
  on public.subscriptions (stripe_subscription_id)
  where stripe_subscription_id is not null;
