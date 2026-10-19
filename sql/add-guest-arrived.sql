-- =====================================================================
--  Gost javlja „Ušli smo” → domaćin dobiva obavijest (19. 10. 2026.)
--
--  Na kraju „Kako ući, korak po korak” gost sam pritisne „Ušli smo”.
--  Vodič zove gost_usao(token): baza zapiše SAMO vrijeme (bookings.usao_at)
--  i pošalje domaćinu push „Marta je ušla — Villa Maslina” (sql/add-push.sql).
--  Nema lokacije ni praćenja: samo gostov klik, o kojem mu vodič piše
--  „Domaćin dobiva obavijest”. Vrijeme se briše s rezervacijom.
--
--  Jednom po rezervaciji (drugi klik ništa ne šalje), samo s valjanim linkom
--  i samo od dana dolaska do dana odlaska. Gost ne piše u tablicu izravno.
--
--  Pokrenuti u Supabase SQL editoru JEDNOM (smije se ponoviti), NAKON
--  sql/add-push.sql. Bez push pretplate domaćina vrijeme se ipak zapiše
--  (vidi se u dashboardu), a vodič gostu nudi da sam javi domaćinu.
-- =====================================================================

begin;

alter table public.bookings add column if not exists usao_at timestamptz;

create or replace function public.gost_usao(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  b public.bookings%rowtype;
  p public.properties%rowtype;
  danas date := (now() at time zone 'Europe/Zagreb')::date;
  ima_push boolean := false;
begin
  if p_token is null or length(p_token) < 6 or length(p_token) > 128 then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select * into b from public.bookings where token = p_token limit 1;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  if not coalesce(b.is_active, false) or (b.token_expires_at is not null and b.token_expires_at < now()) then
    return jsonb_build_object('stanje', 'expired');
  end if;
  if b.checkin_date is not null and danas < b.checkin_date::date then
    return jsonb_build_object('stanje', 'rano');
  end if;
  if b.checkout_date is not null and danas > b.checkout_date::date then
    return jsonb_build_object('stanje', 'expired');
  end if;
  select * into p from public.properties where id = b.property_id;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  if to_regclass('public.push_pretplate') is not null then
    execute 'select exists (select 1 from public.push_pretplate where user_id = $1)' into ima_push using p.user_id;
  end if;
  if b.usao_at is not null then
    return jsonb_build_object('stanje', 'vec', 'kada', b.usao_at, 'obavijest', ima_push);
  end if;

  update public.bookings set usao_at = now() where id = b.id;

  if to_regprocedure('public._push_posalji(uuid, text, jsonb)') is not null then
    perform public._push_posalji(p.user_id, 'usao', jsonb_build_object(
      'property_id', p.id, 'objekt', p.name, 'booking_id', b.id,
      'ime', nullif(split_part(btrim(coalesce(b.guest_name, '')), ' ', 1), 'Gost')));
  end if;
  return jsonb_build_object('stanje', 'ok', 'obavijest', ima_push);
exception when others then
  raise warning 'Odmoria: gost_usao: %', sqlerrm;
  return jsonb_build_object('stanje', 'greska');
end;
$$;
revoke all on function public.gost_usao(text) from public;
grant execute on function public.gost_usao(text) to anon, authenticated;

commit;

-- provjera:
-- select guest_name, checkin_date, usao_at from public.bookings where usao_at is not null order by usao_at desc limit 5;
