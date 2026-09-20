-- =====================================================================
--  Tema javne stranice + istaknuta brojka
--
--  POKRETATI U DVA KORAKA. Prvi je siguran i moze odmah.
--
--  Zasto: `properties.theme` u ovoj bazi VEC POSTOJI i vec ima vrijednosti
--  (otkriveno tako sto je CHECK constraint pao na postojecim redovima).
--  Nijedan `.sql` u repozitoriju ga ne stvara i nijedan kod osim ovoga ga
--  ne cita, pa je ostatak necega ranijeg. Ne preuzimamo ga naslijepo —
--  `saveTema()` bi prebrisao ono sto je unutra.
-- =====================================================================


-- ---------------------------------------------------------------------
--  KORAK 1 — sigurno, ne dira `theme`
-- ---------------------------------------------------------------------

alter table public.properties
  add column if not exists highlight text;

comment on column public.properties.highlight is
  'Istaknuta brojka za teme Laguna i Ponocni bazen, oblik "vrijednost · oznaka", npr. "32° · Temperatura bazena". Prazno = izvede se iz povrsine ili broja gostiju.';


-- ---------------------------------------------------------------------
--  PROVJERA — sto je u `theme`? Ovo samo cita.
-- ---------------------------------------------------------------------

select coalesce(theme, '(prazno)') as vrijednost, count(*) as redova
from public.properties
group by 1
order by 2 desc;


-- ---------------------------------------------------------------------
--  KORAK 2 — tek kad se zna sto je gore. Odaberi JEDNU varijantu.
-- ---------------------------------------------------------------------

-- VARIJANTA A: `theme` drzi nesto drugo i mora ostati netaknut.
--   Teme dobivaju vlastiti stupac; u `teme.js`/`dashboard.html`/`p.html`
--   tada treba zamijeniti `prop.theme` s `prop.page_theme`.
--
-- alter table public.properties
--   add column if not exists page_theme text;
-- alter table public.properties
--   drop constraint if exists properties_page_theme_check;
-- alter table public.properties
--   add constraint properties_page_theme_check check (
--     page_theme is null or page_theme in
--       ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova')
--   );


-- VARIJANTA B: u `theme` je smece ili neupotrebljive vrijednosti.
--   Ocisti ih, pa `theme` postane stupac za teme (bez drugog stupca
--   slicnog imena). Prvo pogledaj ispis iz PROVJERE!
--
-- update public.properties
--    set theme = null
--  where theme is not null
--    and theme not in
--      ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova');
--
-- alter table public.properties
--   drop constraint if exists properties_theme_check;
-- alter table public.properties
--   add constraint properties_theme_check check (
--     theme is null or theme in
--       ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova')
--   );
-- comment on column public.properties.theme is
--   'Tema javne stranice: jadran | laguna | zlatnisat | terakota | beton | riviera | ponocni | borova. NULL = jadran.';


-- RLS se NE dira: `properties` vec ima politike, a ovo su obicni stupci
-- te iste tablice, pa ih zahvaca postojeci select/update scope.
