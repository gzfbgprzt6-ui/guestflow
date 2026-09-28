-- ============================================================================
--  Odmoria — šifre vrata i Wi-Fi samo preko poslužitelja (docs/odluke.md, točka 0)
--  ---------------------------------------------------------------------------
--  PROBLEM
--    Vodič (h.html) je red iz `sections` — sa šifrom vrata i Wi-Fi lozinkom —
--    čitao izravno iz preglednika, javnim ključem, PRIJE provjere vremena.
--    Ako RLS dopušta anonimno čitanje `sections`, šifre svih objekata mogu se
--    dohvatiti API-jem bez linka i bez vremena. Isto vrijedi za `bookings`:
--    pravilo „aktivne rezervacije su javne” omogućuje popis svih tokena, a
--    token otvara vodič.
--
--  RJEŠENJE
--    1. Funkcija `vodic_gosta(token, slug)` na poslužitelju provjerava link i
--       vrijeme i tek tada vraća šifre. Izvan prozora vraća samo „šifra
--       postoji”, nikad vrijednost. Vrijeme računa po Europe/Zagreb.
--    2. `sections` smije čitati i mijenjati samo vlasnik objekta (dashboard);
--       `bookings` više nisu čitljive anonimno. Vodič ide isključivo kroz (1).
--
--  REDOSLIJED — VAŽNO
--    KORAK 0  pokrenuti i pogledati (samo čita, ništa ne mijenja)
--    KORAK 1  pokrenuti bilo kad — ništa ne zatvara, samo dodaje funkciju
--    ...      objaviti novi h.html (grana s ovim commitom) — on koristi (1)
--    KORAK 2  tek NAKON objave: zatvara izravno čitanje
--    KORAK 4  provjera
--    Stari h.html bez funkcije (1) nakon KORAKA 2 ne bi mogao prikazati vodič.
--
--  Provjereno na lokalnom PostgreSQL-u 16 s ulogama anon/authenticated i
--  auth.uid() kao u Supabaseu (vidi docs/odluke.md, točka 0). Skripta je
--  idempotentna — svaki korak smije se pokrenuti ponovno.
-- ============================================================================


-- ============================================================================
--  KORAK 0 — PROVJERA (samo čita). Pokrenuti blok po blok i spremiti rezultat.
-- ============================================================================

-- 0a. Pravila (RLS) na tri tablice
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public' and tablename in ('sections', 'bookings', 'properties')
order by tablename, policyname;

-- 0b. Je li RLS uopće uključen
select relname, relrowsecurity as rls_ukljucen
from pg_class
where relnamespace = 'public'::regnamespace and relname in ('sections', 'bookings', 'properties');

-- 0c. Što stvarno vidi anonimni posjetitelj (javni ključ). Vraća samo BROJEVE.
--     Ako je prvi broj veći od 0, šifre su danas dostupne bez linka.
--     Ako javi „permission denied for table …”, anonimno čitanje te tablice
--     je već zatvoreno — to je dobro; ostale brojeve provjeriti zasebno.
begin;
  set local role anon;
  select
    (select count(*) from public.sections where coalesce(door_code, '') <> '' or coalesce(wifi_pass, '') <> '') as sekcija_sa_sifrom,
    (select count(*) from public.bookings)                                  as rezervacija_citljivo,
    (select count(*) from public.properties where guest_token is not null)  as starih_tokena_citljivo;
rollback;


-- ============================================================================
--  KORAK 1 — funkcija vodic_gosta (sigurno pokrenuti odmah)
-- ============================================================================
create or replace function public.vodic_gosta(p_token text, p_slug text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  -- Stari opći link (slug + properties.guest_token) nema datume, pa šifre
  -- pokazuje odmah — kao i dosad. Postaviti na false kad se stari link ukine
  -- (vidi KORAK 3), pa ponovno pokrenuti ovaj korak.
  stari_link_otkljucava constant boolean := true;

  b        public.bookings%rowtype;
  p        public.properties%rowtype;
  s        public.sections%rowtype;
  ima_sek  boolean := false;
  stari    boolean := false;
  vrijeme  time    := time '15:00';
  t_od     timestamptz;
  t_do     timestamptz;
  otvoreno boolean;
  sek      jsonb;
begin
  if p_token is null or length(p_token) < 6 or length(p_token) > 128 then
    return jsonb_build_object('stanje', 'invalid');
  end if;

  select * into b from public.bookings where token = p_token limit 1;
  if found then
    if not coalesce(b.is_active, false)
       or (b.token_expires_at is not null and b.token_expires_at < now()) then
      return jsonb_build_object('stanje', 'expired');
    end if;
    select * into p from public.properties where id = b.property_id;
    if not found then
      return jsonb_build_object('stanje', 'missing');
    end if;
  else
    if p_slug is null then
      return jsonb_build_object('stanje', 'invalid');
    end if;
    select * into p from public.properties
      where slug = p_slug and guest_token is not null and guest_token = p_token
      limit 1;
    if not found then
      return jsonb_build_object('stanje', 'invalid');
    end if;
    stari := true;
  end if;

  select * into s from public.sections where property_id = p.id limit 1;
  ima_sek := found;

  if stari then
    otvoreno := stari_link_otkljucava;
  else
    -- sat prije prijave do 23:59 dana odlaska, po lokalnom vremenu objekta
    if ima_sek and s.checkin_time::text ~ '^\d{1,2}:\d{2}' then
      vrijeme := substring(s.checkin_time::text from '^\d{1,2}:\d{2}')::time;
    end if;
    t_od := ((b.checkin_date::date + vrijeme) at time zone 'Europe/Zagreb') - interval '1 hour';
    t_do := ((b.checkout_date::date + time '23:59') at time zone 'Europe/Zagreb');
    otvoreno := now() >= t_od and now() <= t_do;
  end if;

  sek := case when ima_sek then to_jsonb(s) else '{}'::jsonb end;
  sek := sek || jsonb_build_object(
    'ima_door_code', ima_sek and coalesce(trim(s.door_code::text), '') <> '',
    'ima_wifi_pass', ima_sek and coalesce(trim(s.wifi_pass::text), '') <> '');
  if not otvoreno then
    -- vrijednosti ne izlaze iz baze; vodič zna samo da postoje
    sek := sek - 'door_code' - 'wifi_pass';
  end if;

  return jsonb_build_object(
    'stanje',     'ok',
    'stari_link', stari,
    'otvoreno',   otvoreno,
    'otkljucava', t_od,
    'zavrsava',   t_do,
    'booking', case when stari then null else jsonb_build_object(
        'id', b.id, 'guest_name', b.guest_name, 'guest_note', b.guest_note,
        'checkin_date', b.checkin_date, 'checkout_date', b.checkout_date) end,
    'property', to_jsonb(p) - 'guest_token' - 'user_id' - 'ical_booking_url' - 'ical_airbnb_url',
    'section', sek
  );
end;
$$;

revoke all on function public.vodic_gosta(text, text) from public;
grant execute on function public.vodic_gosta(text, text) to anon, authenticated;


-- ============================================================================
--  KORAK 2 — zatvaranje izravnog čitanja (TEK NAKON objave novog h.html)
-- ============================================================================
begin;

alter table public.sections enable row level security;
alter table public.bookings enable row level security;

-- 2a. Vlasnička pravila (dashboard, postavljanje i dodavanje objekta ih trebaju)
drop policy if exists "sections: vlasnik čita"    on public.sections;
drop policy if exists "sections: vlasnik dodaje"  on public.sections;
drop policy if exists "sections: vlasnik mijenja" on public.sections;
drop policy if exists "sections: vlasnik briše"   on public.sections;
create policy "sections: vlasnik čita" on public.sections for select to authenticated
  using (exists (select 1 from public.properties p where p.id = sections.property_id and p.user_id = auth.uid()));
create policy "sections: vlasnik dodaje" on public.sections for insert to authenticated
  with check (exists (select 1 from public.properties p where p.id = sections.property_id and p.user_id = auth.uid()));
create policy "sections: vlasnik mijenja" on public.sections for update to authenticated
  using (exists (select 1 from public.properties p where p.id = sections.property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = sections.property_id and p.user_id = auth.uid()));
create policy "sections: vlasnik briše" on public.sections for delete to authenticated
  using (exists (select 1 from public.properties p where p.id = sections.property_id and p.user_id = auth.uid()));

drop policy if exists "bookings: vlasnik čita"    on public.bookings;
drop policy if exists "bookings: vlasnik dodaje"  on public.bookings;
drop policy if exists "bookings: vlasnik mijenja" on public.bookings;
drop policy if exists "bookings: vlasnik briše"   on public.bookings;
create policy "bookings: vlasnik čita" on public.bookings for select to authenticated
  using (exists (select 1 from public.properties p where p.id = bookings.property_id and p.user_id = auth.uid()));
create policy "bookings: vlasnik dodaje" on public.bookings for insert to authenticated
  with check (exists (select 1 from public.properties p where p.id = bookings.property_id and p.user_id = auth.uid()));
create policy "bookings: vlasnik mijenja" on public.bookings for update to authenticated
  using (exists (select 1 from public.properties p where p.id = bookings.property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = bookings.property_id and p.user_id = auth.uid()));
create policy "bookings: vlasnik briše" on public.bookings for delete to authenticated
  using (exists (select 1 from public.properties p where p.id = bookings.property_id and p.user_id = auth.uid()));

-- 2b. Ukloni svako pravilo koje pristup NE veže uz prijavljenog korisnika
--     (npr. „svi čitaju sections”, „aktivne rezervacije su javne”). Pravila
--     vlasnika i admina (sql/admin-access.sql) sadrže auth.uid() i ostaju.
do $$
declare r record;
begin
  for r in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('sections', 'bookings')
      and coalesce(qual, '')       not ilike '%auth.uid()%'
      and coalesce(with_check, '') not ilike '%auth.uid()%'
  loop
    execute format('drop policy %I on public.%I', r.policyname, r.tablename);
    raise notice 'uklonjeno pravilo: %.%', r.tablename, r.policyname;
  end loop;
end $$;

-- 2c. Anonimna uloga nema što raditi u ovim tablicama ni kad bi netko kasnije
--     dodao preširoko pravilo.
revoke all on public.sections from anon;
revoke all on public.bookings from anon;
grant select, insert, update, delete on public.sections to authenticated;
grant select, insert, update, delete on public.bookings to authenticated;

commit;


-- ============================================================================
--  KORAK 3 — stari opći link (odluka vlasnika, ne pokretati bez nje)
-- ============================================================================
--  Stari link /h.html?slug=…&token=<properties.guest_token> nema datume i
--  šifre pokazuje odmah. Dashboard ga i danas nudi kao „Privatni vodič”.
--  Ako je `properties` javno čitljiv (vidi 0a/0c), `guest_token` je čitljiv
--  svima — pa i šifre iza njega. Kad se stari link ukine u aplikaciji:
--    a) u KORAKU 1 postaviti  stari_link_otkljucava := false  i pokrenuti ga,
--    b) po želji poništiti tokene:  update public.properties set guest_token = null;
--  Do tada vrijedi: linkovi po rezervaciji su sigurni, stari link nije.


-- ============================================================================
--  KORAK 4 — PROVJERA NAKON (svaki blok zasebno)
-- ============================================================================
-- 4a. Anonimno čitanje šifri mora javiti: permission denied for table sections
begin; set local role anon; select count(*) from public.sections; rollback;

-- 4b. Anonimno čitanje rezervacija mora javiti: permission denied for table bookings
begin; set local role anon; select count(*) from public.bookings; rollback;

-- 4c. Funkcija radi anonimno: nepostojeći token → {"stanje": "invalid"}
begin; set local role anon; select public.vodic_gosta('nepostojeci-token-123'); rollback;

-- 4d. Prijavljen tuđi korisnik ne vidi ništa: mora biti 0
begin;
  set local role authenticated;
  select set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-000000000000","role":"authenticated"}', true);
  select count(*) as tudjih_sekcija from public.sections;
rollback;


-- ============================================================================
--  POVRATAK (samo u nuždi — vraća ranjivost!)
-- ============================================================================
--  grant select on public.sections to anon;
--  grant select on public.bookings to anon;
--  create policy "privremeno: javno čitanje sekcija" on public.sections for select using (true);
--  Funkcija vodic_gosta može ostati — ne smeta.
