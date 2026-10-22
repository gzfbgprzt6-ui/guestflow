-- =====================================================================
--  Vlastiti naslovi kućica „Upute za korištenje” (Klima-uređaj, Grijanje,
--  Topla voda, Kuhinja) — domaćin ih može preimenovati, npr. „Perilica”.
--  sections.uredaji_naslovi = {"ac": "...", "grijanje": "...", "voda": "...", "kuhinja": "..."}
--  Prazno / bez ključa = zadani naziv. vodic_gosta() vraća cijeli red
--  sections, pa funkciju ne treba mijenjati. Bez brisanja. Ponovljivo.
-- =====================================================================
begin;
alter table public.sections
  add column if not exists uredaji_naslovi jsonb not null default '{}'::jsonb;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'sections_uredaji_naslovi_chk') then
    alter table public.sections
      add constraint sections_uredaji_naslovi_chk check (jsonb_typeof(uredaji_naslovi) = 'object');
  end if;
end $$;
commit;
