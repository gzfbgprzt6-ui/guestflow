-- =====================================================================
--  Čistačica: popis zadataka s fotografijama (20. 10. 2026. — odluke, točka 42)
--
--  cleaner_links.popis     ["Promijeniti posteljinu", "Iznijeti smeće", …]
--                          (≤ 30, svaki ≤ 120 znakova) — sastavlja domaćin
--  cleaning_status.kvacice [0, 2, 3]  redni brojevi odrađenih stavki
--  cleaning_status.fotke   ["https://res.cloudinary.com/sck9mbg9/…", …] (≤ 12)
--
--  Čistačica nema račun: piše kroz ciscenje_popis(token, dan, kvacice,
--  fotke) — iste provjere kao javi_ciscenje (valjan token, dan od −3 do +60).
--  Fotografije (smanjene u pregledniku, mapa i oznaka „ciscenje”) smiju biti samo s našeg Cloudinaryja (isti unsigned preset
--  kao fotografije objekta), pa link ne može podmetnuti tuđu adresu.
--  raspored_ciscenja() je ista funkcija kao u add-cleaner-status.sql, uz
--  'popis' i kvačice/fotke u 'javljanja'.
--
--  Pokrenuti NAKON add-cleaner-status.sql. Bez brisanja. Ponovljivo.
-- =====================================================================

begin;

alter table public.cleaner_links   add column if not exists popis   jsonb not null default '[]'::jsonb;
alter table public.cleaning_status add column if not exists kvacice jsonb;
alter table public.cleaning_status add column if not exists fotke   jsonb;

do $$ begin
  alter table public.cleaner_links add constraint cleaner_links_popis_chk
    check (jsonb_typeof(popis) = 'array' and jsonb_array_length(popis) <= 30);
exception when duplicate_object then null; end $$;

create or replace function public.ciscenje_popis(p_token text, p_dan date, p_kvacice jsonb, p_fotke jsonb)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  l public.cleaner_links%rowtype;
  danas date := (now() at time zone 'Europe/Zagreb')::date;
  kv jsonb; fo jsonb;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 64 then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into l from public.cleaner_links where token = p_token limit 1;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  if p_dan is null or p_dan < danas - 3 or p_dan > danas + 60 then return jsonb_build_object('stanje', 'dan'); end if;
  -- samo cijeli brojevi koji postoje u popisu, bez ponavljanja
  select coalesce(jsonb_agg(distinct (x #>> '{}')::int), '[]'::jsonb) into kv
    from jsonb_array_elements(case when jsonb_typeof(p_kvacice) = 'array' then p_kvacice else '[]'::jsonb end) x
   where jsonb_typeof(x) = 'number' and (x #>> '{}') ~ '^\d{1,2}$'
     and (x #>> '{}')::int < jsonb_array_length(l.popis);
  -- samo naše Cloudinary slike, najviše 12
  select coalesce(jsonb_agg(u), '[]'::jsonb) into fo from (
    select x #>> '{}' as u
      from jsonb_array_elements(case when jsonb_typeof(p_fotke) = 'array' then p_fotke else '[]'::jsonb end) x
     where jsonb_typeof(x) = 'string'
       and (x #>> '{}') ~ '^https://res\.cloudinary\.com/sck9mbg9/image/upload/[A-Za-z0-9_./,:-]{1,250}$'
     limit 12) s;
  insert into public.cleaning_status (property_id, dan, stanje, kvacice, fotke, updated_at)
  values (l.property_id, p_dan, 'potvrdeno', kv, fo, now())
  on conflict (property_id, dan) do update
    set kvacice = excluded.kvacice, fotke = excluded.fotke, updated_at = now();
  return jsonb_build_object('stanje', 'ok', 'kvacice', kv, 'fotke', fo);
end;
$$;
revoke all on function public.ciscenje_popis(text, date, jsonb, jsonb) from public;
grant execute on function public.ciscenje_popis(text, date, jsonb, jsonb) to anon, authenticated;

create or replace function public.raspored_ciscenja(p_token text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
declare
  l public.cleaner_links%rowtype;
  p public.properties%rowtype;
  s record;
  od date := (now() at time zone 'Europe/Zagreb')::date - 3;
  do_ date := (now() at time zone 'Europe/Zagreb')::date + 60;
begin
  if p_token is null or length(p_token) < 16 or length(p_token) > 64 then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select * into l from public.cleaner_links where token = p_token limit 1;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into p from public.properties where id = l.property_id;
  if not found then return jsonb_build_object('stanje', 'invalid'); end if;
  select address, checkin_time, checkout_time into s from public.sections where property_id = p.id limit 1;

  return jsonb_build_object(
    'stanje', 'ok',
    'objekt', p.name,
    'mjesto', p.location,
    'adresa', s.address,
    'prijava', s.checkin_time,
    'odjava', s.checkout_time,
    'popis', coalesce(l.popis, '[]'::jsonb),
    'dani', coalesce((select jsonb_agg(jsonb_build_object('date', a.date, 'source', to_jsonb(a) -> 'source',
                                                'booking_id', to_jsonb(a) -> 'booking_id') order by a.date)
                        from public.availability a
                       where a.property_id = p.id and coalesce(a.is_booked, true)
                         and a.date::date between od and do_), '[]'::jsonb),
    'rezervacije', coalesce((select jsonb_agg(jsonb_build_object('id', b.id, 'od', b.checkin_date, 'do', b.checkout_date) order by b.checkin_date)
                               from public.bookings b
                              where b.property_id = p.id and coalesce(b.is_active, true)
                                and b.checkout_date::date >= od and b.checkin_date::date <= do_), '[]'::jsonb),
    'javljanja', coalesce((select jsonb_agg(jsonb_build_object('dan', c.dan, 'stanje', c.stanje, 'vrijeme', c.vrijeme, 'napomena', c.napomena,
                                                       'kvacice', coalesce(c.kvacice, '[]'::jsonb), 'fotke', coalesce(c.fotke, '[]'::jsonb)))
                             from public.cleaning_status c
                            where c.property_id = p.id and c.dan between od and do_), '[]'::jsonb));
end;
$$;
revoke all on function public.raspored_ciscenja(text) from public;
grant execute on function public.raspored_ciscenja(text) to anon, authenticated;

commit;
