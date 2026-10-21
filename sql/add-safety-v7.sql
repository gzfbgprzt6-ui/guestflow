-- =====================================================================
--  Sigurnost v7 (21. 10. 2026. — odluke, točka 44)
--
--  1) Dvije rezervacije za iste noći: baza odbija novu (ili promjenu datuma)
--     ako se preklapa s drugom AKTIVNOM rezervacijom istog objekta koja još
--     nije prošla. Dan odlaska jednog = dan dolaska drugog je u redu.
--     Zaključavanje po objektu (pg_advisory_xact_lock) — dvije istodobne
--     potvrde ne mogu obje proći. Stare (prošle) rezervacije se ne diraju.
--
--  2) Gost ne gubi vodič usred boravka kad domaćin padne na Free:
--     bookings.plan_pri_izradi = plan vlasnika u trenutku izrade rezervacije;
--     mogucnosti_vodica() do odlaska daje BOLJI od tog i trenutnog plana.
--
--  Pokrenuti NAKON add-team-roles.sql (zamjenjuje njegov mogucnosti_vodica).
--  Bez brisanja. Ponovljivo.
-- =====================================================================

begin;

-- 1) preklapanje rezervacija
create or replace function public.bookings_bez_preklapanja()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare
  danas date := (now() at time zone 'Europe/Zagreb')::date;
  x record;
begin
  if not coalesce(new.is_active, false) or new.checkin_date is null or new.checkout_date is null then return new; end if;
  if new.checkout_date <= new.checkin_date then
    raise exception 'Odlazak mora biti nakon dolaska.' using errcode = '23514';
  end if;
  if new.checkout_date <= danas then return new; end if;            -- upis prošlog boravka
  if tg_op = 'UPDATE' and old.checkin_date = new.checkin_date and old.checkout_date = new.checkout_date
     and coalesce(old.is_active, false) and old.property_id = new.property_id then return new; end if;
  perform pg_advisory_xact_lock(hashtext('odmoria-bookings:' || new.property_id::text));
  select b.checkin_date, b.checkout_date into x
    from public.bookings b
   where b.property_id = new.property_id and b.id is distinct from new.id
     and coalesce(b.is_active, false) and b.checkout_date > danas
     and daterange(b.checkin_date, b.checkout_date) && daterange(new.checkin_date, new.checkout_date)
   limit 1;
  if found then
    raise exception 'Termin se preklapa s drugom rezervacijom (% – %).', to_char(x.checkin_date, 'DD. MM.'), to_char(x.checkout_date, 'DD. MM. YYYY.')
      using errcode = '23P01';
  end if;
  return new;
end;
$$;
revoke all on function public.bookings_bez_preklapanja() from public, anon, authenticated;
create or replace trigger bookings_bez_preklapanja before insert or update of checkin_date, checkout_date, is_active, property_id
  on public.bookings for each row execute function public.bookings_bez_preklapanja();

-- 2) plan u trenutku izrade rezervacije
alter table public.bookings add column if not exists plan_pri_izradi text;
create or replace function public.bookings_plan_pri_izradi()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
begin
  select public.current_plan_id(p.user_id) into new.plan_pri_izradi from public.properties p where p.id = new.property_id;
  return new;
exception when others then return new;
end;
$$;
revoke all on function public.bookings_plan_pri_izradi() from public, anon, authenticated;
create or replace trigger bookings_plan_pri_izradi before insert on public.bookings
  for each row execute function public.bookings_plan_pri_izradi();
update public.bookings b set plan_pri_izradi = public.current_plan_id(p.user_id)
  from public.properties p where p.id = b.property_id and b.plan_pri_izradi is null;

create or replace function public.mogucnosti_vodica(p_token text, p_slug text default null)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  vlasnik uuid;
  objekt uuid;
  pri_izradi text;
  plan_id text;
  pl public.plans%rowtype;
  br jsonb;
  rang constant text[] := array['free', 'pro', 'business'];
begin
  if p_token is null or length(p_token) < 6 or length(p_token) > 128 then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select p.user_id, p.id, case when b.checkout_date >= (now() at time zone 'Europe/Zagreb')::date then b.plan_pri_izradi end
    into vlasnik, objekt, pri_izradi
    from public.bookings b join public.properties p on p.id = b.property_id
   where b.token = p_token and coalesce(b.is_active, false)
     and (b.token_expires_at is null or b.token_expires_at >= now())
   limit 1;
  if vlasnik is null and p_slug is not null then
    select user_id, id into vlasnik, objekt from public.properties
     where slug = p_slug and guest_token is not null and guest_token = p_token limit 1;
  end if;
  if vlasnik is null then return jsonb_build_object('stanje', 'invalid'); end if;
  plan_id := public.current_plan_id(vlasnik);
  -- gost do odlaska zadržava ono što je vodič imao kad je rezervacija nastala
  if pri_izradi is not null and coalesce(array_position(rang, pri_izradi), 0) > coalesce(array_position(rang, plan_id), 0) then
    plan_id := pri_izradi;
  end if;
  select * into pl from public.plans where id = plan_id;
  if not found then select * into pl from public.plans where id = 'free'; end if;
  if coalesce(pl.mogucnosti, '[]'::jsonb) ? 'brend' then
    select brend into br from public.properties where id = objekt;
  end if;
  return jsonb_build_object('stanje', 'ok', 'plan', pl.id,
    'mogucnosti', coalesce(pl.mogucnosti, '[]'::jsonb),
    'oznaka', not coalesce(pl.can_remove_branding, false),
    'brend', case when br ? 'ime' or br ? 'boja' then br else null end);
end;
$$;
revoke all on function public.mogucnosti_vodica(text, text) from public;
grant execute on function public.mogucnosti_vodica(text, text) to anon, authenticated;

commit;
