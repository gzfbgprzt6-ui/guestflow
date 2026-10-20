-- =====================================================================
--  iCal v6 (20. 10. 2026. — odluke, točka 39)
--
--  1) calendar_exports.dohvat_booking / dohvat_airbnb / dohvat_ostalo —
--     kad je platforma ZADNJI PUT povukla naš izvoz (/kalendar/<token>.ics).
--     Upisuje ih kalendar_izvoz_za(token, za), koju zove api/kalendar.js.
--     Dashboard tako zna je li izvoz stvarno spojen („Booking povlači vaš
--     kalendar · prije 2 h”), a sinkronizacija razlikuje pravu dvostruku
--     rezervaciju od „jeke” (platforma nam vrati naše vlastite datume).
--
--  2) kalendar_sukobi — moguća dvostruka rezervacija: noć koju je platforma
--     prodala, a već je zauzeta izravnom rezervacijom ili drugom platformom.
--     Upisuje api/_ical.js (jednom po rasponu — jedinstveni ključ), okidač
--     šalje obavijest na mobitel (vrsta „sukob”, api/_push.js).
--
--  3) automatska sinkronizacija svakih 10 min (bila 30).
--
--  Pokrenuti NAKON add-ical-export.sql, auto-ical-sync.sql, add-push.sql i
--  add-team-roles.sql. Bez brisanja — smije se pokrenuti konektorom. Ponovljivo.
-- =====================================================================

begin;

alter table public.calendar_exports add column if not exists dohvat_booking timestamptz;
alter table public.calendar_exports add column if not exists dohvat_airbnb  timestamptz;
alter table public.calendar_exports add column if not exists dohvat_ostalo  timestamptz;

-- izvoz + bilješka tko ga je povukao (upis najviše jednom u 5 min)
create or replace function public.kalendar_izvoz_za(p_token text, p_za text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  r jsonb := public.kalendar_izvoz(p_token);
  pet timestamptz := now() - interval '5 minutes';
begin
  if r->>'stanje' = 'ok' then
    if p_za = 'booking' then
      update public.calendar_exports set dohvat_booking = now() where token = p_token and (dohvat_booking is null or dohvat_booking < pet);
    elsif p_za = 'airbnb' then
      update public.calendar_exports set dohvat_airbnb = now() where token = p_token and (dohvat_airbnb is null or dohvat_airbnb < pet);
    else
      update public.calendar_exports set dohvat_ostalo = now() where token = p_token and (dohvat_ostalo is null or dohvat_ostalo < pet);
    end if;
  end if;
  return r;
end;
$$;
revoke all on function public.kalendar_izvoz_za(text, text) from public;
grant execute on function public.kalendar_izvoz_za(text, text) to anon, authenticated;

create table if not exists public.kalendar_sukobi (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  izvor       text not null check (izvor in ('ical_booking', 'ical_airbnb')),
  s_cim       text not null check (s_cim in ('rezervacija', 'ical_booking', 'ical_airbnb')),
  booking_id  uuid,
  od          date not null,
  do_         date not null,
  vidjeno     boolean not null default false,
  created_at  timestamptz not null default now()
);
create unique index if not exists kalendar_sukobi_jednom on public.kalendar_sukobi (property_id, izvor, s_cim, od, do_);
alter table public.kalendar_sukobi enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kalendar_sukobi' and policyname = 'sukobi: vlasnik') then
    create policy "sukobi: vlasnik" on public.kalendar_sukobi for all to authenticated
      using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
      with check (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));
  end if;
  if to_regprocedure('public.ima_ulogu(uuid, text[])') is not null
     and not exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'kalendar_sukobi' and policyname = 'suradnik') then
    create policy "suradnik" on public.kalendar_sukobi for all to authenticated
      using (public.ima_ulogu(property_id, array['upravitelj', 'recepcija']))
      with check (public.ima_ulogu(property_id, array['upravitelj', 'recepcija']));
  end if;
end $$;
revoke all on public.kalendar_sukobi from anon;
grant select, insert, update on public.kalendar_sukobi to authenticated;

-- obavijest na mobitel (sql/add-push.sql) — samo pri stvarnom upisu, ne pri ponovljenom
create or replace function public._push_sukob()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.properties%rowtype;
begin
  select * into p from public.properties where id = new.property_id;
  if found and to_regprocedure('public._push_posalji(uuid, text, jsonb)') is not null then
    perform public._push_posalji(p.user_id, 'sukob', jsonb_build_object(
      'property_id', p.id, 'objekt', p.name, 'izvor', new.izvor, 's_cim', new.s_cim, 'od', new.od, 'do', new.do_));
  end if;
  return new;
exception when others then
  raise warning 'Odmoria: obavijest o preklapanju: %', sqlerrm; return new;
end;
$$;
revoke all on function public._push_sukob() from public, anon, authenticated;
create or replace trigger push_sukob after insert on public.kalendar_sukobi
  for each row execute function public._push_sukob();

-- automatska sinkronizacija: svakih 10 minuta
do $$ begin
  perform cron.alter_job(jobid, schedule := '*/10 * * * *') from cron.job where jobname = 'odmoria-ical-sync';
exception when undefined_function or invalid_schema_name then null; end $$;

commit;

-- provjera:
-- select jobname, schedule from cron.job where jobname = 'odmoria-ical-sync';
-- select * from public.kalendar_sukobi order by created_at desc limit 10;
