-- =====================================================================
-- Vremenska crta upita (P1-4, 23. 10. 2026.)
--
--   inquiries.odgovoreno_at   kad je domaćin prvi put odgovorio (gotova poruka
--                             poslana WhatsAppom, e-mailom ili kopirana)
--   inquiries.odgovor_kanal   wa | email | kopija
--
-- Upisuje domaćin (postojeće pravo UPDATE na inquiries). Gost pri slanju upita
-- ta polja ne smije postaviti — okidač ih pri upisu briše.
-- Pokrenuti jednom; ponavljanje ne mijenja ništa.
-- =====================================================================
begin;

alter table public.inquiries
  add column if not exists odgovoreno_at timestamptz,
  add column if not exists odgovor_kanal text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'inquiries_odgovor_kanal') then
    alter table public.inquiries add constraint inquiries_odgovor_kanal
      check (odgovor_kanal is null or odgovor_kanal in ('wa', 'email', 'kopija'));
  end if;
end $$;

create or replace function public.inquiries_bez_odgovora()
 returns trigger language plpgsql set search_path to 'public', 'pg_temp' as $$
begin
  new.odgovoreno_at := null;
  new.odgovor_kanal := null;
  return new;
end $$;

create or replace trigger inquiries_bez_odgovora
  before insert on public.inquiries
  for each row execute function public.inquiries_bez_odgovora();

commit;
