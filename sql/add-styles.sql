-- =====================================================================
--  Stilovi javne stranice (3. 10. 2026.) — osam novih imena u properties.theme
--
--  Pokrenuti u Supabase SQL editoru JEDNOM, cijelo odjednom. Može se
--  pokrenuti bez obzira je li ranije pokrenut add-theme-to-properties.sql.
--
--  Što radi: dopušta u stupcu `theme` imena novih stilova (stilovi.js):
--  priroda, luksuz, more, moderno, grad, snijeg, relax, seoska. Stara imena
--  tema (jadran, laguna…) ostaju dopuštena, a stranica ih prikazuje kao
--  zadani izgled. NULL = zadani izgled „Odmoria”.
--
--  Ništa se ne briše: stara vrijednost `Beach & Sea` (ostatak starog
--  koncepta, nitko je ne čita) postaje NULL = zadani izgled, kao što je i
--  bila. Ako se u stupcu zatekne nešto treće, skripta STANE i ne mijenja
--  ništa (cijela je u transakciji) — javite vrijednost.
-- =====================================================================

begin;

alter table public.properties
  add column if not exists theme text;

alter table public.properties
  alter column theme drop default;

update public.properties
   set theme = null
 where theme = 'Beach & Sea';

do $$
declare
  nepoznato text;
begin
  select string_agg(distinct theme, ', ') into nepoznato
    from public.properties
   where theme is not null
     and theme not in ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova',
                       'priroda','luksuz','more','moderno','grad','snijeg','relax','seoska');
  if nepoznato is not null then
    raise exception 'U properties.theme su vrijednosti koje nisu ime stila ni teme: %. Ništa nije promijenjeno.', nepoznato;
  end if;
end $$;

alter table public.properties
  drop constraint if exists properties_theme_check;
alter table public.properties
  add constraint properties_theme_check check (
    theme is null or theme in
      ('jadran','laguna','zlatnisat','terakota','beton','riviera','ponocni','borova',
       'priroda','luksuz','more','moderno','grad','snijeg','relax','seoska')
  );

comment on column public.properties.theme is
  'Stil javne stranice (stilovi.js): priroda | luksuz | more | moderno | grad | snijeg | relax | seoska. NULL ili staro ime teme = zadani izgled.';

commit;
