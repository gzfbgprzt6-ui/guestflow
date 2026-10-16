-- =====================================================================
--  Čistačica javlja domaćinu + promjene s Bookinga/Airbnba (16. 10. 2026.)
--
--  1) cleaning_status — na stranici /c/<token> čistačica uz svako čišćenje
--     može kliknuti „Potvrđujem”, „Dolazim u __:__”, „Gotovo” ili „Ne mogu
--     doći” (+ kratka napomena). Ništa nije obavezno. Domaćin to vidi u
--     dashboardu (obavijesti, Linkovi i QR → Čistačica).
--     Čistačica NE piše u tablicu izravno — samo kroz javi_ciscenje(token…),
--     kao i ostale funkcije za goste (provjera tokena).
--  2) kalendar_promjene — sinkronizacija (api/_ical.js) upiše kad s Bookinga
--     ili Airbnba nestanu buduće noći (otkazano) ili se pojave nove (nova
--     rezervacija). Domaćin to vidi u obavijestima kao „Hitno” / „Važno”.
--
--  Pokrenuti u Supabase SQL editoru JEDNOM (smije se ponoviti), NAKON
--  sql/add-cleaner-links.sql. Postojeće tablice i politike se ne mijenjaju;
--  raspored_ciscenja() se zamijeni istom funkcijom koja vraća i javljanja.
-- =====================================================================

begin;

create table if not exists public.cleaning_status (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  dan         date not null,
  stanje      text not null check (stanje in ('potvrdeno', 'dolazim', 'gotovo', 'ne_mogu')),
  vrijeme     text check (vrijeme is null or vrijeme ~ '^\d{1,2}:\d{2}$'),
  napomena    text check (napomena is null or length(napomena) <= 300),
  updated_at  timestamptz not null default now(),
  unique (property_id, dan)
);
alter table public.cleaning_status enable row level security;
drop policy if exists "javljanja: vlasnik" on public.cleaning_status;
create policy "javljanja: vlasnik" on public.cleaning_status for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));
revoke all on public.cleaning_status from anon;
grant select on public.cleaning_status to authenticated;

create table if not exists public.kalendar_promjene (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  izvor       text not null check (izvor in ('ical_booking', 'ical_airbnb')),
  vrsta       text not null check (vrsta in ('otkazano', 'novo')),
  od          date not null,
  do_         date not null,
  vidjeno     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists kalendar_promjene_objekt on public.kalendar_promjene (property_id, created_at desc);
alter table public.kalendar_promjene enable row level security;
drop policy if exists "promjene: vlasnik" on public.kalendar_promjene;
create policy "promjene: vlasnik" on public.kalendar_promjene for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));
revoke all on public.kalendar_promjene from anon;
grant select, insert, update on public.kalendar_promjene to authenticated;

-- suradnici (sql/add-team-access.sql) vide isto što i vlasnik — samo ako je pokrenut
do $$
begin
  if to_regprocedure('public.je_suradnik(uuid)') is not null then
    execute 'drop policy if exists "suradnik" on public.cleaning_status';
    execute 'create policy "suradnik" on public.cleaning_status for select to authenticated using (public.je_suradnik(property_id))';
    execute 'drop policy if exists "suradnik" on public.kalendar_promjene';
    execute 'create policy "suradnik" on public.kalendar_promjene for all to authenticated using (public.je_suradnik(property_id)) with check (public.je_suradnik(property_id))';
  end if;
end $$;

-- čistačica javlja: samo s valjanim tokenom, samo za dane od -3 do +60
create or replace function public.javi_ciscenje(p_token text, p_dan date, p_stanje text, p_vrijeme text default null, p_napomena text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  l public.cleaner_links%rowtype;
  danas date := (now() at time zone 'Europe/Zagreb')::date;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 64 then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into l from public.cleaner_links where token = p_token limit 1;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  if p_dan is null or p_dan < danas - 3 or p_dan > danas + 60 then return jsonb_build_object('stanje', 'dan'); end if;
  if p_stanje is null then
    delete from public.cleaning_status where property_id = l.property_id and dan = p_dan;
    return jsonb_build_object('stanje', 'ok');
  end if;
  if p_stanje not in ('potvrdeno', 'dolazim', 'gotovo', 'ne_mogu') then return jsonb_build_object('stanje', 'vrijednost'); end if;
  if p_vrijeme is not null and p_vrijeme !~ '^\d{1,2}:\d{2}$' then p_vrijeme := null; end if;
  insert into public.cleaning_status (property_id, dan, stanje, vrijeme, napomena, updated_at)
  values (l.property_id, p_dan, p_stanje, nullif(trim(p_vrijeme), ''), nullif(left(trim(coalesce(p_napomena, '')), 300), ''), now())
  on conflict (property_id, dan) do update
    set stanje = excluded.stanje, vrijeme = excluded.vrijeme, napomena = excluded.napomena, updated_at = now();
  return jsonb_build_object('stanje', 'ok');
end;
$$;
revoke all on function public.javi_ciscenje(text, date, text, text, text) from public;
grant execute on function public.javi_ciscenje(text, date, text, text, text) to anon, authenticated;

-- raspored_ciscenja: isto kao prije (sql/add-cleaner-links.sql) + 'javljanja'
create or replace function public.raspored_ciscenja(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  l public.cleaner_links%rowtype;
  p public.properties%rowtype;
  s record;
  od date := (now() at time zone 'Europe/Zagreb')::date - 3;
  do_ date := (now() at time zone 'Europe/Zagreb')::date + 60;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 64 then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select * into l from public.cleaner_links where token = p_token limit 1;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into p from public.properties where id = l.property_id;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  select address, checkin_time, checkout_time into s from public.sections where property_id = p.id limit 1;

  return jsonb_build_object(
    'stanje', 'ok',
    'objekt', p.name,
    'mjesto', p.location,
    'adresa', s.address,
    'prijava', s.checkin_time,
    'odjava', s.checkout_time,
    'dani', coalesce((select jsonb_agg(jsonb_build_object('date', a.date, 'source', to_jsonb(a) -> 'source',
                                                'booking_id', to_jsonb(a) -> 'booking_id') order by a.date)
                        from public.availability a
                       where a.property_id = p.id and coalesce(a.is_booked, true)
                         and a.date::date between od and do_), '[]'::jsonb),
    'rezervacije', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'od', b.checkin_date, 'do', b.checkout_date) order by b.checkin_date)
                               from public.bookings b
                              where b.property_id = p.id and coalesce(b.is_active, true)
                                and b.checkout_date::date >= od and b.checkin_date::date <= do_), '[]'::jsonb),
    'javljanja', coalesce((select jsonb_agg(jsonb_build_object('dan', c.dan, 'stanje', c.stanje, 'vrijeme', c.vrijeme, 'napomena', c.napomena))
                             from public.cleaning_status c
                            where c.property_id = p.id and c.dan between od and do_), '[]'::jsonb));
end;
$$;
revoke all on function public.raspored_ciscenja(text) from public;
grant execute on function public.raspored_ciscenja(text) to anon, authenticated;

commit;
