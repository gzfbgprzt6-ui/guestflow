-- =====================================================================
--  Planovi po objektu (v5, 20. 10. 2026. — odluke, točka 35)
--
--    Free      1 objekt                         0 €
--    Domaćin   1–5 objekata    12 € / objekt / mj.  ili  99 € / objekt / god.
--    Agencija  6 i više         9 € / objekt / mj.  ili  89 € / objekt / god.
--
--  Id-jevi planova ostaju 'pro' i 'business' (subscriptions.plan, Stripe
--  metapodaci, okidači) — mijenjaju se samo ime, opis, cijene i limiti.
--
--  plans.po_objektu     cijena vrijedi za jedan objekt; račun = cijena × broj
--  plans.min_properties najmanji broj objekata koji se plaća (Agencija 6)
--  subscriptions.kolicina  koliko je objekata plaćeno (upisuje SAMO
--                       api/stripe-webhook.js iz Stripeove „quantity”).
--                       NULL = ručno dodijeljen plan (admin) → vrijedi
--                       max_properties plana, kao prije.
--
--  plan_limit(korisnik, 'properties') = najviše plaćenih objekata, a nikad
--  manje od min_properties ni više od max_properties.
--
--  Pokrenuti JEDNOM u Supabase SQL editoru (smije se ponoviti). Postojeće
--  pretplate se ne diraju — vrijede nove cijene tek za novu naplatu.
-- =====================================================================

begin;

alter table public.plans add column if not exists po_objektu boolean not null default false;
alter table public.plans add column if not exists min_properties int not null default 1;
alter table public.subscriptions add column if not exists kolicina int;

do $$ begin
  alter table public.subscriptions add constraint subscriptions_kolicina_chk check (kolicina is null or kolicina between 1 and 500);
exception when duplicate_object then null; end $$;

update public.plans set name = 'Free', description = 'Za prvi objekt',
  monthly_price_eur = 0, yearly_price_eur = 0, po_objektu = false,
  min_properties = 1, max_properties = 1
 where id = 'free';

update public.plans set name = 'Domaćin', description = 'Za 1–5 objekata, cijena po objektu',
  monthly_price_eur = 12, yearly_price_eur = 99, po_objektu = true,
  min_properties = 1, max_properties = 5
 where id = 'pro';

update public.plans set name = 'Agencija', description = 'Za 6 i više objekata, cijena po objektu',
  monthly_price_eur = 9, yearly_price_eur = 89, po_objektu = true,
  min_properties = 6, max_properties = -1
 where id = 'business';

-- mogućnost „agencija” (svi objekti, predložak za više objekata, izvještaj
-- vlasniku) — samo Agencija; plans.mogucnosti je iz sql/add-plan-features.sql
do $$ begin
  update public.plans set mogucnosti = mogucnosti || '["agencija"]'::jsonb
   where id = 'business' and not mogucnosti ? 'agencija';
exception when undefined_column then null; end $$;

create or replace function public.plan_limit(p_user uuid, p_key text)
returns int
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text := public.current_plan_id(p_user);
  v_val  int;
  v_po   boolean;
  v_min  int;
  v_kol  int;
begin
  select case p_key
    when 'properties'   then max_properties
    when 'photos'       then max_photos_per_property
    when 'local_places' then max_local_places
    when 'transport'    then max_transport
    when 'attractions'  then max_attractions
    when 'house_rules'  then max_house_rules
    when 'faq'          then max_faq
    when 'languages'    then max_languages
    when 'team_members' then max_team_members
    else null
  end, po_objektu, min_properties
  into v_val, v_po, v_min
  from public.plans
  where id = v_plan;

  if v_val is null then
    return 2147483647;              -- nepoznat kljuc: ne blokiraj
  end if;
  if v_val < 0 then
    v_val := 2147483647;            -- -1 = neograniceno
  end if;

  -- plaćeno po objektu: broj objekata = plaćena količina (u granicama plana)
  if p_key = 'properties' and v_po and v_plan <> 'free' then
    select kolicina into v_kol from public.subscriptions where user_id = p_user limit 1;
    if v_kol is not null then
      return least(v_val, greatest(coalesce(v_min, 1), v_kol));
    end if;
  end if;
  return v_val;
end;
$$;

-- Koliko objekata domaćin ima i koliko smije — za lijepu poruku u pregledniku
-- (limit i dalje provodi okidač enforce_property_limit).
create or replace function public.moji_objekti_limit()
returns jsonb
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'plan', public.current_plan_id(auth.uid()),
    'ima', (select count(*) from public.properties where user_id = auth.uid()),
    'smije', public.plan_limit(auth.uid(), 'properties'),
    'placeno', (select kolicina from public.subscriptions where user_id = auth.uid() limit 1))
$$;
revoke all on function public.moji_objekti_limit() from public;
grant execute on function public.moji_objekti_limit() to authenticated;

commit;

-- provjera:
-- select id, name, monthly_price_eur, yearly_price_eur, po_objektu, min_properties, max_properties from public.plans order by sort_order;
