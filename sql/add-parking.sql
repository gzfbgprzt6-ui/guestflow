-- =====================================================================
--  Parking: fotografija i pribadača na karti (16. 10. 2026.)
--  Dashboard → Objekt → Dolazak i upute → Parking; gost vidi u privatnom
--  vodiču (/h/…, „Dolazak”): tekst, fotografiju, malu kartu i „Navigiraj”.
--
--  Pokrenuti u Supabase SQL editoru JEDNOM (smije se ponoviti). Samo dodaje
--  tri stupca u `sections`; politike i funkcije se ne mijenjaju —
--  vodic_gosta() vraća cijeli red sections, pa ih vodič dobije sam.
--  Javna stranica (p.html) sections nikad ne čita.
-- =====================================================================

begin;

alter table public.sections add column if not exists parking_foto text;
alter table public.sections add column if not exists parking_lat double precision;
alter table public.sections add column if not exists parking_lon double precision;

alter table public.sections drop constraint if exists sections_parking_koord_check;
alter table public.sections add constraint sections_parking_koord_check check (
  (parking_lat is null and parking_lon is null)
  or (parking_lat between -90 and 90 and parking_lon between -180 and 180)
);
alter table public.sections drop constraint if exists sections_parking_foto_check;
alter table public.sections add constraint sections_parking_foto_check check (
  parking_foto is null or (parking_foto ~ '^https://' and length(parking_foto) <= 600)
);

comment on column public.sections.parking_foto is 'Fotografija parkinga (Cloudinary), samo privatni vodič.';
comment on column public.sections.parking_lat  is 'Pribadača parkinga (WGS84), samo privatni vodič.';

commit;
