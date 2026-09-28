-- ============================================================================
--  Odmoria — link za čistačicu (raspored dolazaka i odlazaka, bez šifri)
--  ---------------------------------------------------------------------------
--  Domaćin u dashboardu (Linkovi i QR) napravi link i pošalje ga čistačici
--  WhatsAppom ili e-mailom. Stranica /c/<token> (c.html) pokazuje samo:
--  naziv i adresu objekta, vrijeme prijave i odjave te dolaske i odlaske u
--  sljedećih 60 dana. NEMA šifre vrata, Wi-Fi lozinke ni imena gostiju.
--  „Novi link” zamijeni token, pa stari odmah prestaje raditi.
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
-- ============================================================================

create table if not exists public.cleaner_links (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null unique references public.properties(id) on delete cascade,
  token       text not null unique check (length(token) between 16 and 64),
  created_at  timestamptz not null default now()
);

alter table public.cleaner_links enable row level security;

drop policy if exists "čistačica: vlasnik" on public.cleaner_links;
create policy "čistačica: vlasnik" on public.cleaner_links for all to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));

revoke all on public.cleaner_links from anon;
grant select, insert, update, delete on public.cleaner_links to authenticated;

-- Raspored za čistačicu. Vraća { stanje: ok | invalid, objekt, adresa,
-- prijava, odjava, dani: [{date, source, booking_id}], rezervacije: [{id, od, do}] }
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
                                and b.checkout_date::date >= od and b.checkin_date::date <= do_), '[]'::jsonb));
end;
$$;

revoke all on function public.raspored_ciscenja(text) from public;
grant execute on function public.raspored_ciscenja(text) to anon, authenticated;
