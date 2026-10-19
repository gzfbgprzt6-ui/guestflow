-- =====================================================================
--  Obavijesti na mobitel domaćina — Web Push (19. 10. 2026., odluke 26 i 32)
--
--  Domaćin u dashboardu klikne „Uključi obavijesti” (🔔 → Obavijesti na ovom
--  uređaju). Preglednik da pretplatu (endpoint + ključevi uređaja) i ona se
--  spremi ovdje. Kad stigne upit, kad čistačica javi da ne može ili kad
--  Booking/Airbnb otkaže ili doda rezervaciju, okidač kroz pg_net pozove
--  /api/obavijest (api/_push.js), a ruta pošalje obavijest na sve uređaje.
--
--  VAPID ključeve NITKO ne upisuje: ruta ih prvi put napravi sama i spremi u
--  Vault (push_vapid_spremi) — privatni ključ ne izlazi iz poslužitelja.
--  Adresa aplikacije: Vault `odmoria_adresa`, inače iz zadatka
--  odmoria-ical-sync (sql/auto-ical-sync.sql). Tajna: `odmoria_cron_secret`.
--
--  Pokrenuti JEDNOM (smije se ponoviti), NAKON sql/auto-ical-sync.sql,
--  sql/add-inquiries.sql i sql/add-cleaner-status.sql. Postojeće tablice i
--  pravila se ne mijenjaju; slanje nikad ne ruši upis (greška = WARNING).
-- =====================================================================

begin;

-- 1) pretplate uređaja (domaćin vidi samo svoje; upis kroz push_prijava)
create table if not exists public.push_pretplate (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  endpoint    text not null unique check (endpoint ~ '^https://' and length(endpoint) <= 1000),
  p256dh      text not null check (length(p256dh) between 40 and 200),
  auth        text not null check (length(auth) between 10 and 60),
  jezik       text not null default 'hr' check (jezik in ('hr', 'en')),
  uredaj      text check (uredaj is null or length(uredaj) <= 120),
  created_at  timestamptz not null default now()
);
create index if not exists push_pretplate_korisnik on public.push_pretplate (user_id);
alter table public.push_pretplate enable row level security;
drop policy if exists "pretplate: svoje" on public.push_pretplate;
create policy "pretplate: svoje" on public.push_pretplate for select to authenticated using (user_id = auth.uid());
revoke all on public.push_pretplate from anon, authenticated;
grant select on public.push_pretplate to authenticated;

-- isti uređaj pod drugim računom: stara pretplata se prepiše novim vlasnikom
create or replace function public.push_prijava(p_endpoint text, p_p256dh text, p_auth text, p_jezik text default 'hr', p_uredaj text default null)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return jsonb_build_object('stanje', 'prijava'); end if;
  insert into public.push_pretplate (user_id, endpoint, p256dh, auth, jezik, uredaj)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, case when p_jezik = 'en' then 'en' else 'hr' end, left(p_uredaj, 120))
  on conflict (endpoint) do update
    set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth,
        jezik = excluded.jezik, uredaj = excluded.uredaj, created_at = now();
  return jsonb_build_object('stanje', 'ok');
end;
$$;
create or replace function public.push_odjava(p_endpoint text)
returns jsonb language sql volatile security definer set search_path = public, pg_temp
as $$
  with x as (delete from public.push_pretplate where endpoint = p_endpoint and user_id = auth.uid() returning 1)
  select jsonb_build_object('stanje', 'ok', 'uklonjeno', (select count(*) from x))
$$;
revoke all on function public.push_prijava(text, text, text, text, text) from public, anon;
revoke all on function public.push_odjava(text) from public, anon;
grant execute on function public.push_prijava(text, text, text, text, text) to authenticated;
grant execute on function public.push_odjava(text) to authenticated;

-- 2) VAPID ključevi u Vaultu — čita i piše SAMO poslužiteljski ključ (api/_push.js)
create or replace function public.push_vapid()
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
  select jsonb_build_object(
    'javni',    (select decrypted_secret from vault.decrypted_secrets where name = 'odmoria_vapid_javni'),
    'privatni', (select decrypted_secret from vault.decrypted_secrets where name = 'odmoria_vapid_privatni'))
$$;
create or replace function public.push_vapid_spremi(p_javni text, p_privatni text)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  perform pg_advisory_xact_lock(hashtext('odmoria_vapid'));
  -- već postoje (druga instanca rute je bila brža) → vrati postojeće, ništa ne mijenjaj
  if not exists (select 1 from vault.secrets where name = 'odmoria_vapid_privatni') then
    perform vault.create_secret(p_privatni, 'odmoria_vapid_privatni', 'Odmoria: Web Push (VAPID) privatni ključ');
    perform vault.create_secret(p_javni, 'odmoria_vapid_javni', 'Odmoria: Web Push (VAPID) javni ključ');
  end if;
  return public.push_vapid();
end;
$$;
revoke all on function public.push_vapid() from public, anon, authenticated;
revoke all on function public.push_vapid_spremi(text, text) from public, anon, authenticated;
grant execute on function public.push_vapid() to service_role;
grant execute on function public.push_vapid_spremi(text, text) to service_role;

-- 3) slanje: okidači → pg_net → /api/obavijest (nikad ne ruši upis)
create or replace function public._push_posalji(p_user uuid, p_vrsta text, p_podaci jsonb)
returns void language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare adresa text; tajna text;
begin
  if p_user is null or not exists (select 1 from public.push_pretplate where user_id = p_user) then return; end if;
  select decrypted_secret into adresa from vault.decrypted_secrets where name = 'odmoria_adresa';
  if adresa is null or adresa !~ '^https://' then
    select substring(command from 'https://[A-Za-z0-9.-]+') into adresa from cron.job where jobname = 'odmoria-ical-sync' limit 1;
  end if;
  select decrypted_secret into tajna from vault.decrypted_secrets where name = 'odmoria_cron_secret';
  if adresa is null or tajna is null or tajna like '<%' then
    raise warning 'Odmoria: obavijest nije poslana — nema adrese ili odmoria_cron_secret u Vaultu';
    return;
  end if;
  perform net.http_post(
    url := rtrim(adresa, '/') || '/api/obavijest',
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || tajna),
    body := jsonb_build_object('user_id', p_user, 'vrsta', p_vrsta, 'podaci', p_podaci),
    timeout_milliseconds := 15000);
exception when others then
  raise warning 'Odmoria: obavijest nije poslana: %', sqlerrm;
end;
$$;
revoke all on function public._push_posalji(uuid, text, jsonb) from public, anon, authenticated;

-- 3a) novi upit gosta
create or replace function public._push_upit()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.properties%rowtype;
begin
  select * into p from public.properties where id = new.property_id;
  if found then
    perform public._push_posalji(p.user_id, 'upit', jsonb_build_object(
      'id', new.id, 'property_id', p.id, 'objekt', p.name, 'ime', left(new.guest_name, 60),
      'od', new.checkin_date, 'do', new.checkout_date, 'gosti', new.guests));
  end if;
  return new;
exception when others then
  raise warning 'Odmoria: obavijest o upitu: %', sqlerrm; return new;
end;
$$;
revoke all on function public._push_upit() from public, anon, authenticated;
drop trigger if exists push_upit on public.inquiries;
create trigger push_upit after insert on public.inquiries for each row execute function public._push_upit();

-- 3b) čistačica javi „Ne mogu doći”
create or replace function public._push_cistacica()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.properties%rowtype;
begin
  if new.stanje = 'ne_mogu' and (tg_op = 'INSERT' or old.stanje is distinct from 'ne_mogu') then
    select * into p from public.properties where id = new.property_id;
    if found then
      perform public._push_posalji(p.user_id, 'cistacica', jsonb_build_object(
        'property_id', p.id, 'objekt', p.name, 'dan', new.dan, 'napomena', left(new.napomena, 120)));
    end if;
  end if;
  return new;
exception when others then
  raise warning 'Odmoria: obavijest čistačice: %', sqlerrm; return new;
end;
$$;
revoke all on function public._push_cistacica() from public, anon, authenticated;
drop trigger if exists push_cistacica on public.cleaning_status;
create trigger push_cistacica after insert or update on public.cleaning_status for each row execute function public._push_cistacica();

-- 3c) Booking/Airbnb: otkazano ili nova rezervacija (api/_ical.js upisuje kalendar_promjene)
create or replace function public._push_kalendar()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare p public.properties%rowtype;
begin
  select * into p from public.properties where id = new.property_id;
  if found then
    perform public._push_posalji(p.user_id, 'kalendar', jsonb_build_object(
      'property_id', p.id, 'objekt', p.name, 'izvor', new.izvor, 'vrsta', new.vrsta, 'od', new.od, 'do', new.do_));
  end if;
  return new;
exception when others then
  raise warning 'Odmoria: obavijest kalendara: %', sqlerrm; return new;
end;
$$;
revoke all on function public._push_kalendar() from public, anon, authenticated;
drop trigger if exists push_kalendar on public.kalendar_promjene;
create trigger push_kalendar after insert on public.kalendar_promjene for each row execute function public._push_kalendar();

-- 4) probna obavijest (gumb u dashboardu) — samo sebi
create or replace function public.push_proba()
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null then return jsonb_build_object('stanje', 'prijava'); end if;
  if not exists (select 1 from public.push_pretplate where user_id = auth.uid()) then return jsonb_build_object('stanje', 'nema_pretplate'); end if;
  perform public._push_posalji(auth.uid(), 'proba', '{}'::jsonb);
  return jsonb_build_object('stanje', 'ok');
end;
$$;
revoke all on function public.push_proba() from public, anon;
grant execute on function public.push_proba() to authenticated;

commit;

-- PROVJERA (nakon što domaćin uključi obavijesti):
-- select user_id, jezik, uredaj, created_at from public.push_pretplate;
-- select status_code, left(content::text, 200), created from net._http_response order by created desc limit 5;
