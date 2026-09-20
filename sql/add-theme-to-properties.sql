-- =====================================================================
--  Tema javne stranice + istaknuta brojka
--
--  Pokrenuti u Supabase SQL editoru JEDNOM. Do tada sve radi, samo se
--  odabir teme ne pamti: `p.html` bez stupca `theme` vrti zadanu temu
--  „Jadran”, a `?stil=` u adresi i dalje pokazuje svih osam.
--
--  Oba stupca su neobavezna i imaju zamjenu u kodu (`izBaze()` u
--  `teme.js`), pa prazan objekt nikad ne dobije prazno zaglavlje.
-- =====================================================================

alter table public.properties
  add column if not exists theme     text,
  add column if not exists highlight text;

comment on column public.properties.theme is
  'Tema javne stranice: jadran | laguna | zlatnisat | terakota | beton | riviera | ponocni | borova. NULL = jadran.';
comment on column public.properties.highlight is
  'Istaknuta brojka za teme Laguna i Ponocni bazen, oblik "vrijednost · oznaka", npr. "32° · Temperatura bazena". Prazno = izvede se iz povrsine ili broja gostiju.';

-- Samo poznate vrijednosti; kriva tema bi dala prazno zaglavlje.
alter table public.properties
  drop constraint if exists properties_theme_check;
alter table public.properties
  add constraint properties_theme_check check (
    theme is null or theme in
      ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova')
  );

-- RLS se NE dira: `properties` vec ima politike, a ovo su obicni stupci
-- te iste tablice, pa ih zahvaca postojeci select/update scope.
