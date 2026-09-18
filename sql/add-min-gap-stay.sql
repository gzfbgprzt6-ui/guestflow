-- ============================================================================
--  Najkraci razmak koji gost smije popuniti
--  ---------------------------------------------------------------------------
--  `allow_gap_fill_stays` dopusta boravak kraci od `min_stay` kad tocno
--  popunjava razmak izmedu dvije rezervacije. Bez dodatnog ogranicenja to je
--  znacilo da se nudi i razmak od jedne noci, sto vecini domacina ne odgovara.
--
--  `min_gap_stay` je donja granica: razmaci kraci od toga se ne nude.
--  Zadano 3 noci; svaki objekt moze imati svoju vrijednost.
-- ============================================================================

alter table public.properties
  add column if not exists min_gap_stay int not null default 3;

-- Postojeci objekti dobivaju istu zadanu vrijednost.
update public.properties
  set min_gap_stay = 3
  where min_gap_stay is null;

-- Provjera:
-- select name, min_stay, allow_gap_fill_stays, min_gap_stay from public.properties;
