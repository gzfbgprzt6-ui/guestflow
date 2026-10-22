-- =====================================================================
--  Prikaz cijene na javnoj stranici: „javno” (zadano) ili „na_upit”.
--  Dashboard → Objekti → Cijene → Prikaz cijene. javni_objekt() vraća
--  cijeli red (to_jsonb), pa p.html stupac dobiva bez izmjene funkcije.
--  Bez brisanja. Ponovljivo.
-- =====================================================================
begin;
alter table public.properties
  add column if not exists prikaz_cijene text not null default 'javno';
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'properties_prikaz_cijene_chk') then
    alter table public.properties
      add constraint properties_prikaz_cijene_chk check (prikaz_cijene in ('javno', 'na_upit'));
  end if;
end $$;
commit;
