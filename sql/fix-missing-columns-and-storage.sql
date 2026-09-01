-- ============================================================
-- FIX: nedostajuci stupci na properties + storage bucket za fotografije
-- Pokreni ovo jednom u Supabase → SQL Editor.
-- Bez ovoga: upload fotografija tiho ne uspijeva (bucket ne postoji),
-- a iCal sekcija u dashboardu javlja gresku "column does not exist".
-- ============================================================

-- Fotografije
ALTER TABLE properties ADD COLUMN IF NOT EXISTS photo_urls jsonb DEFAULT '[]'::jsonb;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS cover_photo_url text;

-- iCal sinkronizacija (Booking.com / Airbnb)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ical_booking_url text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ical_airbnb_url text;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS ical_last_sync timestamptz;

-- Booking.com-style detalji o objektu (kreveti, kupaonice, m2)
ALTER TABLE properties ADD COLUMN IF NOT EXISTS beds int;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS bathrooms numeric(3,1);
ALTER TABLE properties ADD COLUMN IF NOT EXISTS size_m2 int;

-- Storage bucket za fotografije objekta (javno cita se, samo vlasnik uploada/brise)
insert into storage.buckets (id, name, public)
values ('property-photos', 'property-photos', true)
on conflict (id) do nothing;

drop policy if exists "Public read property photos" on storage.objects;
create policy "Public read property photos"
on storage.objects for select
using (bucket_id = 'property-photos');

drop policy if exists "Owners upload their property photos" on storage.objects;
create policy "Owners upload their property photos"
on storage.objects for insert
with check (bucket_id = 'property-photos' and auth.uid()::text = (storage.foldername(name))[1]);

drop policy if exists "Owners delete their property photos" on storage.objects;
create policy "Owners delete their property photos"
on storage.objects for delete
using (bucket_id = 'property-photos' and auth.uid()::text = (storage.foldername(name))[1]);
