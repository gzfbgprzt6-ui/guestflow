-- ============================================================================
--  Odmoria — IZVOZ kalendara prema Bookingu i Airbnbu (iCal)
--  ---------------------------------------------------------------------------
--  Dosad je sinkronizacija išla samo prema nama. Rezervacija dogovorena
--  izravno ili ručno blokiran dan nisu zatvarali termin na portalima →
--  isti termin mogao se prodati dvaput.
--
--  Domaćin u dashboardu (Boravci → Sinkronizacija) napravi link
--  /kalendar/<token>.ics i zalijepi ga u Booking/Airbnb („Uvezi kalendar”).
--  Ruta api/kalendar.js zove kalendar_izvoz(token) javnim ključem — funkcija
--  vraća SAMO datume zauzetih noći i izvor (bez imena gostiju i bez šifri).
--  „Novi link” zamijeni token, pa stari odmah prestaje raditi.
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno. Ne dira postojeće tablice.
-- ============================================================================

create table if not exists public.calendar_exports (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete cascade,
  token       text not null unique check (token ~ '^[a-z0-9]{16,64}$'),
  created_at  timestamptz not null default now()
);

alter table public.calendar_exports enable row level security;

drop policy if exists "izvoz kalendara: vlasnik" on public.calendar_exports;
create policy "izvoz kalendara: vlasnik" on public.calendar_exports for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));

revoke all on public.calendar_exports from anon;
grant select, insert, update, delete on public.calendar_exports to authenticated;

-- Zauzete noći od jučer do dvije godine unaprijed.
-- { stanje: ok | invalid, objekt, dani: [{date, source}] }
--  - iz availability (is_booked), source = manual / ical_booking / ical_airbnb / …
--  - aktivne rezervacije bez dana u kalendaru (starije) dodaju se kao 'rezervacija'
create or replace function public.kalendar_izvoz(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  l public.calendar_exports%rowtype;
  p public.properties%rowtype;
  od date := (now() at time zone 'Europe/Zagreb')::date - 1;
  do_ date := (now() at time zone 'Europe/Zagreb')::date + 730;
begin
  if p_token is null or p_token !~ '^[a-z0-9]{16,64}$' then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select * into l from public.calendar_exports where token = p_token limit 1;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into p from public.properties where id = l.property_id;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;

  return jsonb_build_object(
    'stanje', 'ok',
    'objekt', p.name,
    'dani', coalesce((
      select jsonb_agg(jsonb_build_object('date', x.d, 'source', x.src) order by x.d)
        from (
          select a.date::date as d, coalesce(to_jsonb(a) ->> 'source', 'manual') as src
            from public.availability a
           where a.property_id = p.id and coalesce(a.is_booked, true)
             and a.date::date between od and do_
          union
          select g::date, 'rezervacija'
            from public.bookings b,
                 generate_series(b.checkin_date::date, b.checkout_date::date - 1, interval '1 day') g
           where b.property_id = p.id and coalesce(b.is_active, true)
             and b.checkin_date is not null and b.checkout_date is not null
             and b.checkout_date::date > od and b.checkin_date::date <= do_
             and not exists (select 1 from public.availability a2
                              where a2.property_id = p.id and a2.date::date = g::date)
        ) x
       where x.d between od and do_), '[]'::jsonb));
end;
$$;

revoke all on function public.kalendar_izvoz(text) from public;
grant execute on function public.kalendar_izvoz(text) to anon, authenticated;
