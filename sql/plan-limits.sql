-- ============================================================================
--  Odmoria — limiti plana kao PODATAK, ne kao kod
--  ---------------------------------------------------------------------------
--  Prije ovoga limiti su postojali samo u pregledniku (tri odvojene kopije u
--  dashboard.html, add-property.html i plans.js) pa ih je svatko s otvorenim
--  devtoolsom mogao zaobici. Ovime:
--    1. limiti i cijene zive u tablici `plans` — promjena plana je UPDATE,
--       a ne izmjena koda i novi deploy,
--    2. baza ih sama provodi okidacima, bez obzira sto klijent salje.
--
--  Pokrenuti u Supabase SQL editoru. Skripta je idempotentna.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Tablica planova
-- ---------------------------------------------------------------------------
create table if not exists public.plans (
  id                        text primary key,
  name                      text not null,
  description               text,
  sort_order                int  not null default 0,
  is_public                 boolean not null default true,

  -- cijene (informativno za UI; naplata jos nije spojena)
  monthly_price_eur         numeric(10,2) not null default 0,
  yearly_price_eur          numeric(10,2) not null default 0,
  season_price_eur          numeric(10,2),

  -- limiti: -1 znaci neograniceno
  max_properties            int not null default 1,
  max_photos_per_property   int not null default 5,
  max_local_places          int not null default 5,
  max_transport             int not null default 3,
  max_attractions           int not null default 3,
  max_house_rules           int not null default -1,
  max_faq                   int not null default -1,
  max_languages             int not null default 2,
  max_team_members          int not null default 1,
  analytics_days            int not null default 0,

  can_remove_branding       boolean not null default false,
  can_clone_property        boolean not null default false,
  white_label               boolean not null default false,

  updated_at                timestamptz not null default now()
);

-- Pocetne vrijednosti = tocno ono sto je do sada bilo u plans.js.
-- Mijenjaj ih slobodno UPDATE-om, kod ih ne zakucava.
insert into public.plans (
  id, name, description, sort_order,
  monthly_price_eur, yearly_price_eur,
  max_properties, max_photos_per_property, max_local_places, max_transport,
  max_attractions, max_languages, max_team_members, analytics_days,
  can_remove_branding, can_clone_property, white_label
) values
  ('free','Free','Za prvi digitalni vodic',1,
    0,0,    1,  5,  5,  3,  3, 2, 1,   0, false,false,false),
  ('pro','Pro','Za domacine s do 5 objekata',2,
    15,150, 5, 30, 30, 20, 30, 8, 1,  90, true, true, false),
  ('business','Business','Za profesionalce i timove',3,
    49,490,15, 50,100, 50,100, 8, 5, 365, true, true, true )
on conflict (id) do nothing;   -- postojece vrijednosti se NE gaze

-- Svatko smije citati planove (cjenik na landingu je javan).
alter table public.plans enable row level security;

drop policy if exists "plans su javno citljivi" on public.plans;
create policy "plans su javno citljivi"
  on public.plans for select
  using (true);

-- Pisati smije samo vlasnik racuna (isti UID kao u admin-access.sql).
drop policy if exists "plans mijenja samo vlasnik" on public.plans;
create policy "plans mijenja samo vlasnik"
  on public.plans for all
  using (auth.uid() = '56549320-2c02-405c-9936-770144bd9b49')
  with check (auth.uid() = '56549320-2c02-405c-9936-770144bd9b49');


-- ---------------------------------------------------------------------------
-- 2. Koji plan korisnik STVARNO ima
--    Ponasa se isto kao dashboard.html: istekao plan koji nije free pada na free.
-- ---------------------------------------------------------------------------
create or replace function public.current_plan_id(p_user uuid)
returns text
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_plan text;
  v_end  timestamptz;
begin
  select plan, period_end into v_plan, v_end
  from public.subscriptions
  where user_id = p_user
  limit 1;

  if v_plan is null then
    return 'free';
  end if;

  -- kompatibilnost sa starom vrijednoscu iz pocetne sheme
  if v_plan = 'agency' then
    v_plan := 'business';
  end if;

  if v_plan <> 'free' and v_end is not null and v_end < now() then
    return 'free';
  end if;

  -- nepoznat plan -> free, da nepostojeca vrijednost ne otkljuca sve
  if not exists (select 1 from public.plans where id = v_plan) then
    return 'free';
  end if;

  return v_plan;
end;
$$;


-- ---------------------------------------------------------------------------
-- 3. Dohvat jednog limita. -1 (neograniceno) vraca se kao vrlo velik broj.
-- ---------------------------------------------------------------------------
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
  end
  into v_val
  from public.plans
  where id = v_plan;

  if v_val is null then
    return 2147483647;              -- nepoznat kljuc: ne blokiraj
  end if;
  if v_val < 0 then
    return 2147483647;              -- -1 = neograniceno
  end if;
  return v_val;
end;
$$;


-- ---------------------------------------------------------------------------
-- 4. Okidac: broj objekata
-- ---------------------------------------------------------------------------
create or replace function public.enforce_property_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := public.plan_limit(new.user_id, 'properties');
  v_count int;
begin
  select count(*) into v_count
  from public.properties
  where user_id = new.user_id;

  if v_count >= v_limit then
    raise exception
      'Vaš plan uključuje % objekt(a). Nadogradite plan za više objekata.', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_property_limit on public.properties;
create trigger trg_property_limit
  before insert on public.properties
  for each row execute function public.enforce_property_limit();


-- ---------------------------------------------------------------------------
-- 5. Okidac: broj fotografija po objektu (photo_urls je jsonb polje)
-- ---------------------------------------------------------------------------
create or replace function public.enforce_photo_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_limit int := public.plan_limit(new.user_id, 'photos');
  v_count int := 0;
begin
  if new.photo_urls is not null and jsonb_typeof(new.photo_urls) = 'array' then
    v_count := jsonb_array_length(new.photo_urls);
  end if;

  if v_count > v_limit then
    raise exception
      'Vaš plan uključuje % fotografija po objektu. Nadogradite plan za više.', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_photo_limit on public.properties;
create trigger trg_photo_limit
  before insert or update of photo_urls on public.properties
  for each row execute function public.enforce_photo_limit();


-- ---------------------------------------------------------------------------
-- 6. Okidac: stavke vezane uz objekt (preporuke, prijevoz, atrakcije, ...)
--    Jedna funkcija za sve tablice; kljuc limita stize kao argument okidaca.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_child_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key    text := tg_argv[0];
  v_owner  uuid;
  v_limit  int;
  v_count  int;
begin
  select user_id into v_owner
  from public.properties
  where id = new.property_id;

  if v_owner is null then
    return new;                      -- objekt ne postoji: neka to javi FK
  end if;

  v_limit := public.plan_limit(v_owner, v_key);

  execute format('select count(*) from public.%I where property_id = $1', tg_table_name)
    into v_count
    using new.property_id;

  if v_count >= v_limit then
    raise exception
      'Vaš plan uključuje % stavki u ovoj kategoriji. Nadogradite plan za više.', v_limit
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_local_places_limit on public.local_places;
create trigger trg_local_places_limit
  before insert on public.local_places
  for each row execute function public.enforce_child_limit('local_places');

drop trigger if exists trg_transport_limit on public.transport;
create trigger trg_transport_limit
  before insert on public.transport
  for each row execute function public.enforce_child_limit('transport');

drop trigger if exists trg_attractions_limit on public.attractions;
create trigger trg_attractions_limit
  before insert on public.attractions
  for each row execute function public.enforce_child_limit('attractions');

drop trigger if exists trg_house_rules_limit on public.house_rules;
create trigger trg_house_rules_limit
  before insert on public.house_rules
  for each row execute function public.enforce_child_limit('house_rules');

drop trigger if exists trg_faq_limit on public.faq;
create trigger trg_faq_limit
  before insert on public.faq
  for each row execute function public.enforce_child_limit('faq');


-- ---------------------------------------------------------------------------
-- 7. Provjera: sto koji plan dopusta
-- ---------------------------------------------------------------------------
-- select id, name, max_properties, max_photos_per_property, max_local_places
-- from public.plans order by sort_order;
