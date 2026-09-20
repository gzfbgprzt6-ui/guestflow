-- =====================================================================
--  Tema javne stranice + istaknuta brojka
--
--  Pokrenuti u Supabase SQL editoru JEDNOM, cijelo odjednom.
--
--  O stupcu `theme`: vec je postojao u bazi i svih 8 objekata imalo je
--  istu vrijednost `Beach & Sea` — ostatak starijeg koncepta tema.
--  Nijedan .sql u repozitoriju ga ne stvara i nijedan kod ga vise ne cita
--  ni ne upisuje (provjereno). `Beach & Sea` je konceptualno ista stvar
--  kao zadana tema `jadran`, pa se PRESLIKAVA, ne brise — svaki objekt
--  ostaje na smislenoj temi i javna stranica se ne mijenja.
-- =====================================================================

-- 1. Istaknuta brojka (teme Laguna i Ponocni bazen).
alter table public.properties
  add column if not exists highlight text;

comment on column public.properties.highlight is
  'Istaknuta brojka za teme Laguna i Ponocni bazen, oblik "vrijednost · oznaka", npr. "32° · Temperatura bazena". Prazno = izvede se iz povrsine ili broja gostiju.';

-- 2. Ako je na stupcu ostao stari DEFAULT, novi objekt bi opet dobio
--    `Beach & Sea` i pao na CHECK-u ispod. Zato prvo dolje.
alter table public.properties
  alter column theme drop default;

-- 3. Stara vrijednost -> zadana tema.
update public.properties
   set theme = 'jadran'
 where theme = 'Beach & Sea';

-- 4. Sve ostalo nepoznato (ako se jos nesto zateklo) na NULL, sto kod
--    cita kao `jadran`. Bez ovoga CHECK ispod pada.
update public.properties
   set theme = null
 where theme is not null
   and theme not in
     ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova');

-- 5. Tek sada CHECK — od ovog trena u stupac moze samo ime teme.
alter table public.properties
  drop constraint if exists properties_theme_check;
alter table public.properties
  add constraint properties_theme_check check (
    theme is null or theme in
      ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova')
  );

comment on column public.properties.theme is
  'Tema javne stranice: jadran | laguna | zlatnisat | terakota | beton | riviera | ponocni | borova. NULL = jadran.';

-- RLS se NE dira: `properties` vec ima politike, a ovo su obicni stupci
-- te iste tablice, pa ih zahvaca postojeci select/update scope.

-- Provjera nakon pokretanja — ocekuje se 8 redova na `jadran`:
-- select coalesce(theme,'(prazno)') as tema, count(*) from public.properties
-- group by 1 order by 2 desc;
