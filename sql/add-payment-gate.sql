-- =====================================================================
-- Plaćanje potvrđeno prije šifre (analiza vlasnika 23. 10. 2026., P0-2)
--
-- Izravna rezervacija s kaparom: domaćin pošalje link vodiča odmah, ali
-- šifra vrata i Wi-Fi lozinka NE izlaze iz baze dok domaćin ne potvrdi
-- da je uplata stigla. Vodič se otvori (upute, karta, preporuke), a
-- umjesto šifre piše „Šifra stiže kad domaćin potvrdi uplatu”.
--
--   bookings.ceka_uplatu          true = šifre čekaju potvrdu uplate
--   bookings.uplata_potvrdena_at  kad je domaćin potvrdio (null = nije)
--
-- Upisuje samo vlasnik/suradnik (postojeće RLS politike na bookings).
-- Gost ne može ništa promijeniti — vodič čita samo vodic_gosta().
-- Pokrenuti jednom; ponavljanje ne mijenja ništa.
-- =====================================================================
begin;

alter table public.bookings
  add column if not exists ceka_uplatu boolean not null default false,
  add column if not exists uplata_potvrdena_at timestamptz;

create or replace function public.vodic_gosta(p_token text, p_slug text default null)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  -- Stari opći link (slug + properties.guest_token) nema datume. Od 19. 10.
  -- 2026. (odluke, točka 32) ukinut je za šifre: vodič se otvori, šifre
  -- vrata i Wi-Fi lozinka NIKAD — gost ih dobiva u linku rezervacije.
  stari_link_otkljucava constant boolean := false;

  b        public.bookings%rowtype;
  p        public.properties%rowtype;
  s        public.sections%rowtype;
  ima_sek  boolean := false;
  stari    boolean := false;
  ceka     boolean := false;
  vrijeme  time    := time '15:00';
  t_od     timestamptz;
  t_do     timestamptz;
  otvoreno boolean;
  sek      jsonb;
begin
  if p_token is null or length(p_token) < 6 or length(p_token) > 128 then
    return jsonb_build_object('stanje', 'invalid');
  end if;

  select * into b from public.bookings where token = p_token limit 1;
  if found then
    if not coalesce(b.is_active, false)
       or (b.token_expires_at is not null and b.token_expires_at < now()) then
      return jsonb_build_object('stanje', 'expired');
    end if;
    select * into p from public.properties where id = b.property_id;
    if not found then
      return jsonb_build_object('stanje', 'missing');
    end if;
  else
    if p_slug is null then
      return jsonb_build_object('stanje', 'invalid');
    end if;
    select * into p from public.properties
      where slug = p_slug and guest_token is not null and guest_token = p_token
      limit 1;
    if not found then
      return jsonb_build_object('stanje', 'invalid');
    end if;
    stari := true;
  end if;

  select * into s from public.sections where property_id = p.id limit 1;
  ima_sek := found;

  if stari then
    otvoreno := stari_link_otkljucava;
  else
    if ima_sek and s.checkin_time::text ~ '^\d{1,2}:\d{2}' then
      vrijeme := substring(s.checkin_time::text from '^\d{1,2}:\d{2}')::time;
    end if;
    t_od := ((b.checkin_date::date + vrijeme) at time zone 'Europe/Zagreb') - interval '1 hour';
    t_do := ((b.checkout_date::date + time '23:59') at time zone 'Europe/Zagreb');
    otvoreno := now() >= t_od and now() <= t_do;
    -- šifre čekaju potvrdu uplate (P0-2): prozor ne vrijedi dok domaćin ne potvrdi
    ceka := coalesce(b.ceka_uplatu, false) and b.uplata_potvrdena_at is null;
    if ceka then otvoreno := false; end if;
  end if;

  sek := case when ima_sek then to_jsonb(s) else '{}'::jsonb end;
  sek := sek || jsonb_build_object(
    'ima_door_code', ima_sek and coalesce(trim(s.door_code::text), '') <> '',
    'ima_wifi_pass', ima_sek and coalesce(trim(s.wifi_pass::text), '') <> '');
  if not otvoreno then
    sek := sek - 'door_code' - 'wifi_pass';
  end if;

  return jsonb_build_object(
    'stanje',      'ok',
    'stari_link',  stari,
    'otvoreno',    otvoreno,
    'ceka_uplatu', ceka,
    'otkljucava',  t_od,
    'zavrsava',    t_do,
    'booking', case when stari then null else jsonb_build_object(
        'id', b.id, 'guest_name', b.guest_name, 'guest_note', b.guest_note,
        'checkin_date', b.checkin_date, 'checkout_date', b.checkout_date) end,
    'property', to_jsonb(p) - 'guest_token' - 'user_id' - 'ical_booking_url' - 'ical_airbnb_url',
    'section', sek
  );
end;
$function$;

commit;
