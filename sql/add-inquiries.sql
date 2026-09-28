-- ============================================================================
--  Odmoria — upiti gostiju spremljeni u aplikaciji (tablica `inquiries`)
--  ---------------------------------------------------------------------------
--  Gost na javnoj stranici odabere termin, upiše ime i kontakt i pošalje upit.
--  Domaćin ga vidi u dashboardu (Boravci → Upiti) i jednim klikom ga prihvati:
--  nastane rezervacija, dani se označe kao zauzeti i dobije privatni link koji
--  odmah pošalje gostu (WhatsApp / e-mail). Do sada se upit nigdje nije spremao.
--
--  Sigurnost:
--    - gost (anonimno) smije samo DODATI upit — ne može čitati ni tuđe ni svoj,
--    - čita, mijenja i briše samo vlasnik objekta,
--    - okidač: najviše 20 upita na sat po objektu (zaštita od spama), a status,
--      vrijeme i vezu na rezervaciju gost ne može sam postaviti,
--    - provjere oblika (duljina imena i poruke, e-mail, telefon, datumi).
--
--  Osobni podaci: ime i kontakt gosta. Pravila privatnosti treba dopuniti
--  (docs/odluke.md, točka 8b i 13).
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno.
-- ============================================================================

create table if not exists public.inquiries (
  id            uuid primary key default gen_random_uuid(),
  property_id   uuid not null references public.properties(id) on delete cascade,
  guest_name    text not null check (char_length(btrim(guest_name)) between 2 and 100),
  guest_email   text check (guest_email is null or (char_length(guest_email) <= 200 and guest_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  guest_phone   text check (guest_phone is null or guest_phone ~ '^[+0-9 ()/.-]{6,30}$'),
  checkin_date  date,
  checkout_date date,
  guests        int  check (guests is null or guests between 1 and 50),
  message       text check (message is null or char_length(message) <= 2000),
  status        text not null default 'novi' check (status in ('novi', 'prihvacen', 'odbijen')),
  booking_id    uuid references public.bookings(id) on delete set null,
  created_at    timestamptz not null default now(),
  constraint inquiries_kontakt check (guest_email is not null or guest_phone is not null),
  constraint inquiries_datumi  check ((checkin_date is null and checkout_date is null)
                                   or (checkin_date is not null and checkout_date is not null and checkout_date > checkin_date))
);

create index if not exists inquiries_property_created on public.inquiries (property_id, created_at desc);

alter table public.inquiries enable row level security;

-- gost šalje (i prijavljen korisnik koji gleda tuđu stranicu)
drop policy if exists "inquiries: gost šalje" on public.inquiries;
create policy "inquiries: gost šalje" on public.inquiries for insert to anon, authenticated
  with check (status = 'novi' and booking_id is null);

-- vlasnik objekta čita, mijenja status i briše
drop policy if exists "inquiries: vlasnik čita" on public.inquiries;
drop policy if exists "inquiries: vlasnik mijenja" on public.inquiries;
drop policy if exists "inquiries: vlasnik briše" on public.inquiries;
create policy "inquiries: vlasnik čita" on public.inquiries for select to authenticated
  using (exists (select 1 from public.properties p where p.id = inquiries.property_id and p.user_id = auth.uid()));
create policy "inquiries: vlasnik mijenja" on public.inquiries for update to authenticated
  using (exists (select 1 from public.properties p where p.id = inquiries.property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = inquiries.property_id and p.user_id = auth.uid()));
create policy "inquiries: vlasnik briše" on public.inquiries for delete to authenticated
  using (exists (select 1 from public.properties p where p.id = inquiries.property_id and p.user_id = auth.uid()));

revoke all on public.inquiries from anon;
grant insert on public.inquiries to anon;
grant select, insert, update, delete on public.inquiries to authenticated;

-- Okidač: ograničenje i polja koja gost ne smije sam postaviti
create or replace function public.inquiries_prije_upisa()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if (select count(*) from public.inquiries
      where property_id = new.property_id and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Previše upita za ovaj objekt u zadnjem satu. Pokušajte kasnije.' using errcode = 'P0001';
  end if;
  new.guest_name  := btrim(new.guest_name);
  new.guest_email := nullif(btrim(new.guest_email), '');
  new.guest_phone := nullif(btrim(new.guest_phone), '');
  new.status      := 'novi';
  new.booking_id  := null;
  new.created_at  := now();
  return new;
end;
$$;

drop trigger if exists inquiries_prije_upisa on public.inquiries;
create trigger inquiries_prije_upisa before insert on public.inquiries
  for each row execute function public.inquiries_prije_upisa();

-- PROVJERA (svaki blok zasebno):
-- a) anonimno čitanje mora javiti: permission denied for table inquiries
--    begin; set local role anon; select count(*) from public.inquiries; rollback;
-- b) anonimni upis s krivim statusom prolazi, ali okidač ga vrati na 'novi'
