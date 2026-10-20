-- =====================================================================
--  Izravne rezervacije (v5, 20. 10. 2026. — odluke, točka 36)
--
--  Odmoria NE obrađuje plaćanje i nije posrednik. Ovo samo pomaže domaćinu
--  da gostu odmah kaže cijenu i pošalje ponudu s kaparom na SVOJ račun.
--
--  properties.sezonske_cijene  [{od:'MM-DD', do:'MM-DD', cijena: 150}] (≤ 12)
--                              noć ulazi u razdoblje ako je njen datum između
--                              od i do (uključivo); od > do = preko Nove godine
--  properties.kapara_posto     koliki dio iznosa traži kao kaparu (0–100)
--
--  inquiries.iznos             okvirni iznos boravka — RAČUNA GA BAZA pri upisu
--                              (cijena_boravka), ne preglednik gosta
--  inquiries.kod               kod povratnog gosta koji je gost upisao (domaćin
--                              ga provjeri; kod se nigdje javno ne čuva)
--  inquiries.pristanak_ponude  gost je kvačicom pristao da mu domaćin šalje
--                              ponude za buduće boravke (popis povratnih gostiju)
--
--  IBAN domaćina NIJE u bazi objekta (properties je javno čitljiv po slugu) —
--  dashboard ga drži u user_metadata domaćina i upisuje samo u poruku ponude.
--
--  Pokrenuti JEDNOM u Supabase SQL editoru (smije se ponoviti).
-- =====================================================================

begin;

alter table public.properties add column if not exists sezonske_cijene jsonb not null default '[]'::jsonb;
alter table public.properties add column if not exists kapara_posto int;
alter table public.inquiries  add column if not exists iznos numeric(10,2);
alter table public.inquiries  add column if not exists kod text;
alter table public.inquiries  add column if not exists pristanak_ponude boolean not null default false;

do $$ begin
  alter table public.properties add constraint properties_sezonske_chk
    check (jsonb_typeof(sezonske_cijene) = 'array' and jsonb_array_length(sezonske_cijene) <= 12);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.properties add constraint properties_kapara_chk check (kapara_posto is null or kapara_posto between 0 and 100);
exception when duplicate_object then null; end $$;
do $$ begin
  alter table public.inquiries add constraint inquiries_kod_chk check (kod is null or char_length(kod) <= 30);
exception when duplicate_object then null; end $$;

-- cijena jedne noći: sezona koja pokriva datum, inače osnovna cijena
create or replace function public.cijena_noci(p_property uuid, p_dan date)
returns numeric
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  with p as (select price_per_night, sezonske_cijene from public.properties where id = p_property),
  s as (
    select (e->>'cijena')::numeric as cijena
      from p, jsonb_array_elements(p.sezonske_cijene) e
     where e->>'od' ~ '^\d{2}-\d{2}$' and e->>'do' ~ '^\d{2}-\d{2}$'
       and (e->>'cijena') ~ '^\d+(\.\d+)?$'
       and case when e->>'od' <= e->>'do'
                then to_char(p_dan, 'MM-DD') between e->>'od' and e->>'do'
                else to_char(p_dan, 'MM-DD') >= e->>'od' or to_char(p_dan, 'MM-DD') <= e->>'do' end
     limit 1)
  select coalesce((select cijena from s), nullif((select price_per_night from p), 0))
$$;

-- iznos boravka [od, do): zbroj noći; NULL ako neka noć nema cijenu
create or replace function public.cijena_boravka(p_property uuid, p_od date, p_do date)
returns numeric
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  d date := p_od;
  uk numeric := 0;
  c numeric;
begin
  if p_od is null or p_do is null or p_do <= p_od or p_do - p_od > 90 then return null; end if;
  while d < p_do loop
    c := public.cijena_noci(p_property, d);
    if c is null then return null; end if;
    uk := uk + c;
    d := d + 1;
  end loop;
  return round(uk, 2);
end;
$$;
revoke all on function public.cijena_noci(uuid, date) from public;
revoke all on function public.cijena_boravka(uuid, date, date) from public;
grant execute on function public.cijena_boravka(uuid, date, date) to authenticated;

-- iznos upita računa baza (gost ga ne može podmetnuti)
create or replace function public.inquiries_iznos()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  new.iznos := public.cijena_boravka(new.property_id, new.checkin_date, new.checkout_date);
  new.kod := nullif(upper(btrim(coalesce(new.kod, ''))), '');
  new.pristanak_ponude := coalesce(new.pristanak_ponude, false);
  return new;
end;
$$;
drop trigger if exists inquiries_iznos on public.inquiries;
create trigger inquiries_iznos before insert on public.inquiries
  for each row execute function public.inquiries_iznos();

-- mogućnost „izravno” (sql/add-plan-features.sql): Domaćin i Agencija, ne Free
do $$ begin
  update public.plans set mogucnosti = mogucnosti || '["izravno"]'::jsonb
   where id in ('pro', 'business') and not mogucnosti ? 'izravno';
exception when undefined_column then null; end $$;

commit;

-- provjera:
-- select public.cijena_boravka('<id objekta>', current_date + 10, current_date + 13);
