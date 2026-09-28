-- ============================================================================
--  Odmoria — podaci gostiju za eVisitor i boravišna pristojba
--  ---------------------------------------------------------------------------
--  Domaćin je dužan prijaviti goste u eVisitor u roku 24 sata od dolaska.
--  Gost u vodiču (h.html → Prijava boravka) upiše podatke za sebe i
--  suputnike; domaćin ih u dashboardu (Boravci → Rezervacije) vidi uredno
--  složene za prepisivanje u eVisitor ili preuzimanje kao CSV, uz izračun
--  boravišne pristojbe.
--
--  Osobni podaci (broj isprave!):
--  - gost upisuje SAMO kroz funkciju `prijava_gostiju(token, osobe)` — dok
--    link vrijedi; `prijava_za_link(token)` vraća upisano da ga može ispraviti;
--  - čita ih SAMO vlasnik objekta (ni admin platforme);
--  - brišu se 30 dana nakon odlaska (`pocisti_prijave()`, zove ga dashboard
--    i funkcija upisa; i zakazani zadatak ako je postavljen, vidi
--    sql/auto-ical-sync.sql).
--
--  Pokrenuti u Supabase SQL editoru, KORAK po KORAK. Idempotentno.
-- ============================================================================

-- ----------------------------------------------------------------------------
--  KORAK 0 — dijagnostika: postoje li već stupci pristojbe na properties?
--  (ako postoje od ranije, javite prije KORAKA 1 — vidi CLAUDE.md, zamka
--  „add column if not exists”)
-- ----------------------------------------------------------------------------
select column_name, data_type, column_default from information_schema.columns
 where table_schema = 'public' and table_name = 'properties'
   and column_name in ('pristojba_nacin', 'pristojba_iznos');


-- ----------------------------------------------------------------------------
--  KORAK 1 — postavke pristojbe po objektu, tablica i funkcije
-- ----------------------------------------------------------------------------
alter table public.properties
  add column if not exists pristojba_nacin text,          -- 'pausal' (godišnje po krevetu) | 'nocenje'
  add column if not exists pristojba_iznos numeric(7,2);  -- € po osobi po noći, ili € po krevetu godišnje

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'properties_pristojba_nacin') then
    alter table public.properties add constraint properties_pristojba_nacin
      check (pristojba_nacin is null or pristojba_nacin in ('pausal', 'nocenje'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_pristojba_iznos') then
    alter table public.properties add constraint properties_pristojba_iznos
      check (pristojba_iznos is null or pristojba_iznos between 0 and 10000);
  end if;
end $$;

create table if not exists public.guest_registrations (
  id          uuid primary key default gen_random_uuid(),
  booking_id  uuid not null unique references public.bookings(id) on delete cascade,
  property_id uuid not null references public.properties(id) on delete cascade,
  osobe       jsonb not null check (jsonb_typeof(osobe) = 'array' and jsonb_array_length(osobe) between 1 and 20),
  odlazak     date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists guest_registrations_property on public.guest_registrations (property_id);

alter table public.guest_registrations enable row level security;

drop policy if exists "prijave: vlasnik čita" on public.guest_registrations;
create policy "prijave: vlasnik čita" on public.guest_registrations for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));

drop policy if exists "prijave: vlasnik briše" on public.guest_registrations;
create policy "prijave: vlasnik briše" on public.guest_registrations for delete to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));

revoke all on public.guest_registrations from anon, authenticated;
grant select, delete on public.guest_registrations to authenticated;


-- Brisanje starih prijava (30 dana nakon odlaska). Sigurno zvati često.
create or replace function public.pocisti_prijave()
returns int language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare n int;
begin
  delete from public.guest_registrations where odlazak is not null and odlazak < current_date - 30;
  get diagnostics n = row_count;
  return n;
end;
$$;

-- Očisti jednu osobu: samo dopuštena polja, skraćena, bez praznih.
create or replace function public._osoba_ciste(o jsonb)
returns jsonb language sql immutable set search_path = public, pg_temp
as $$
  select coalesce(jsonb_object_agg(k, left(btrim(o ->> k), case when k in ('ime','prezime','grad_prebivalista') then 60 else 40 end))
                  filter (where coalesce(btrim(o ->> k), '') <> ''), '{}'::jsonb)
  from unnest(array['ime','prezime','spol','datum_rodjenja','drzavljanstvo',
                    'drzava_prebivalista','grad_prebivalista','vrsta_isprave','broj_isprave']) as k
  where jsonb_typeof(o) = 'object';
$$;

-- Gost upisuje ili ispravlja podatke. Vraća { stanje: ok | expired | invalid | neispravno, osoba: n }
create or replace function public.prijava_gostiju(p_token text, p_osobe jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  b public.bookings%rowtype;
  ciste jsonb;
begin
  if p_token is null or length(p_token) < 6 or length(p_token) > 128 then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select * into b from public.bookings where token = p_token limit 1;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  if not coalesce(b.is_active, false) or (b.token_expires_at is not null and b.token_expires_at < now()) then
    return jsonb_build_object('stanje', 'expired');
  end if;
  if jsonb_typeof(p_osobe) is distinct from 'array' or jsonb_array_length(p_osobe) not between 1 and 20 then
    return jsonb_build_object('stanje', 'neispravno');
  end if;
  select jsonb_agg(public._osoba_ciste(x)) into ciste from jsonb_array_elements(p_osobe) x;
  if exists (select 1 from jsonb_array_elements(ciste) x
              where coalesce(x ->> 'ime', '') = '' or coalesce(x ->> 'prezime', '') = '') then
    return jsonb_build_object('stanje', 'neispravno');
  end if;
  insert into public.guest_registrations (booking_id, property_id, osobe, odlazak)
  values (b.id, b.property_id, ciste, b.checkout_date::date)
  on conflict (booking_id) do update set osobe = excluded.osobe, odlazak = excluded.odlazak, updated_at = now();
  perform public.pocisti_prijave();
  return jsonb_build_object('stanje', 'ok', 'osoba', jsonb_array_length(ciste));
end;
$$;

-- Upisani podaci za isti link (da gost može ispraviti ono što je upisao)
create or replace function public.prijava_za_link(p_token text)
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce((select g.osobe from public.bookings b join public.guest_registrations g on g.booking_id = b.id
                    where b.token = p_token and length(p_token) between 6 and 128
                      and coalesce(b.is_active, false)
                      and (b.token_expires_at is null or b.token_expires_at >= now())
                    limit 1), '[]'::jsonb);
$$;

revoke all on function public.pocisti_prijave() from public;
revoke all on function public._osoba_ciste(jsonb) from public;
revoke all on function public.prijava_gostiju(text, jsonb) from public;
revoke all on function public.prijava_za_link(text) from public;
grant execute on function public.pocisti_prijave() to authenticated;
grant execute on function public.prijava_gostiju(text, jsonb) to anon, authenticated;
grant execute on function public.prijava_za_link(text) to anon, authenticated;
