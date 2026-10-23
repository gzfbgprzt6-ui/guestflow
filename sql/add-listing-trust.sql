-- =====================================================================
-- Registracijski broj i pravila otkazivanja na javnoj stranici (P1-2, 23. 10. 2026.)
--
--   properties.registracijski_broj  broj rješenja o kategorizaciji / registracijski
--                                   broj objekta (EU uredba 2024/1028 traži ga na
--                                   oglasima od 2026.); do 40 znakova
--   properties.otkazivanje          fleksibilno | umjereno | strogo | vlastito
--   properties.otkazivanje_tekst    domaćinov tekst za „vlastito” (do 600 znakova)
--
-- Javna stranica ih dobiva kroz javni_objekt() (vraća cijeli red bez tajnih
-- stupaca), pa funkciju ne treba mijenjati. Anon stupce ne vidi izravno.
-- Pokrenuti jednom; ponavljanje ne mijenja ništa.
-- =====================================================================
begin;

alter table public.properties
  add column if not exists registracijski_broj text,
  add column if not exists otkazivanje text,
  add column if not exists otkazivanje_tekst text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'properties_registracijski_broj_duljina') then
    alter table public.properties add constraint properties_registracijski_broj_duljina
      check (registracijski_broj is null or length(registracijski_broj) <= 40);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_otkazivanje_vrsta') then
    alter table public.properties add constraint properties_otkazivanje_vrsta
      check (otkazivanje is null or otkazivanje in ('fleksibilno', 'umjereno', 'strogo', 'vlastito'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'properties_otkazivanje_tekst_duljina') then
    alter table public.properties add constraint properties_otkazivanje_tekst_duljina
      check (otkazivanje_tekst is null or length(otkazivanje_tekst) <= 600);
  end if;
end $$;

commit;
