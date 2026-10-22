-- =====================================================================
--  Fotografije preporuka (plaže, restorani…): local_places.foto (adresa
--  sličice na Wikimedia Commonsu) i foto_izvor (autor · licenca · izvor —
--  CC BY / BY-SA traže navođenje). Puni ih dashboard (fotke-mjesta.js) kod
--  „Predloži mjesta u blizini” i „Pronađi fotografije”; domaćin sliku može
--  ukloniti. Vodič ih čita kao i ostale stupce local_places.
--  Bez brisanja. Ponovljivo.
-- =====================================================================
begin;
alter table public.local_places
  add column if not exists foto text,
  add column if not exists foto_izvor text;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'local_places_foto_https_chk') then
    alter table public.local_places
      add constraint local_places_foto_https_chk check (foto is null or foto ~ '^https://');
  end if;
end $$;
commit;
