-- =====================================================================
-- Recenzije po kategorijama i bez brisanja (vlasnik, 23. 10. 2026.)
--
-- 1) Gost ocjenjuje šest kategorija (1–5): čistoća, smještaj (udobnost i
--    oprema), lokacija, domaćin (komunikacija), točnost opisa, vrijednost
--    za novac. reviews.ocjene = {"cistoca":5,"smjestaj":4,…}; ukupna
--    reviews.ocjena = zaokruženi prosjek (stari prikazi rade i dalje).
-- 2) Domaćin recenziju NE MOŽE obrisati (ni suradnik). Smije je samo sakriti
--    s javne stranice (stupac skriveno), kao i prije. Brisanje ostaje samo
--    uz brisanje cijelog objekta ili računa (SECURITY DEFINER funkcije).
-- 3) javno_o_objektu() vraća i prosjek po kategoriji.
-- Pokrenuti jednom; ponavljanje ne mijenja ništa.
-- =====================================================================
begin;

alter table public.reviews add column if not exists ocjene jsonb;

create or replace function public.ocjene_ispravne(o jsonb)
 returns boolean language sql immutable as $$
  select o is null or (
    jsonb_typeof(o) = 'object'
    and not exists (
      select 1 from jsonb_each(o) e
       where e.key not in ('cistoca','smjestaj','lokacija','domacin','opis','vrijednost')
          or jsonb_typeof(e.value) <> 'number'
          or (e.value)::text !~ '^[1-5]$'))
$$;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'reviews_ocjene_ispravne') then
    alter table public.reviews add constraint reviews_ocjene_ispravne check (public.ocjene_ispravne(ocjene));
  end if;
end $$;

-- domaćin i suradnik: samo čitanje i skrivanje (bez brisanja)
revoke all on public.reviews from authenticated;
grant select on public.reviews to authenticated;
grant update (skriveno) on public.reviews to authenticated;

-- nova inačica: ocjene po kategorijama (stara s p_ocjena ostaje za stare vodiče u predmemoriji)
create or replace function public.ostavi_ocjenu(p_token text, p_ocjene jsonb, p_tekst text default null,
                                               p_ime text default null, p_javno boolean default true)
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  b public.bookings%rowtype;
  danas date := (now() at time zone 'Europe/Zagreb')::date;
  ukupno int;
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
  if p_ocjene is null or jsonb_typeof(p_ocjene) <> 'object' or p_ocjene = '{}'::jsonb
     or not public.ocjene_ispravne(p_ocjene) then
    return jsonb_build_object('stanje', 'neispravno');
  end if;
  if exists (select 1 from public.reviews where booking_id = b.id) then
    return jsonb_build_object('stanje', 'vec');
  end if;
  select round(avg((e.value)::text::numeric))::int into ukupno from jsonb_each(p_ocjene) e;
  insert into public.reviews (property_id, booking_id, ocjena, ocjene, tekst, ime, javno)
  values (b.property_id, b.id, ukupno, p_ocjene,
          nullif(left(btrim(coalesce(p_tekst, '')), 1000), ''),
          nullif(left(btrim(coalesce(p_ime, split_part(coalesce(b.guest_name, ''), ' ', 1))), 60), ''),
          coalesce(p_javno, true));
  return jsonb_build_object('stanje', 'ok');
end;
$function$;
grant execute on function public.ostavi_ocjenu(text, jsonb, text, text, boolean) to anon, authenticated;

create or replace function public.javno_o_objektu(p_slug text)
 returns jsonb
 language plpgsql
 stable security definer
 set search_path to 'public', 'pg_temp'
as $function$
declare
  p public.properties%rowtype;
  bez_oznake boolean := false;
begin
  select * into p from public.properties where slug = p_slug limit 1;
  if not found then return jsonb_build_object('stanje', 'missing'); end if;
  begin
    select coalesce(pl.can_remove_branding, false) into bez_oznake
      from public.plans pl where pl.id = public.current_plan_id(p.user_id);
  exception when others then bez_oznake := false;   -- bez planova: oznaka se vidi
  end;
  return jsonb_build_object(
    'stanje', 'ok',
    'oznaka', not coalesce(bez_oznake, false),
    'prosjek', (select round(avg(ocjena)::numeric, 1) from public.reviews
                 where property_id = p.id and javno and not skriveno),
    'broj', (select count(*) from public.reviews where property_id = p.id and javno and not skriveno),
    'kategorije', (select jsonb_object_agg(k, pr) from (
        select e.key k, round(avg((e.value)::text::numeric), 1) pr
          from public.reviews r, jsonb_each(r.ocjene) e
         where r.property_id = p.id and r.javno and not r.skriveno and r.ocjene is not null
         group by e.key) x),
    'recenzije', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select ocjena, ocjene, tekst, ime, created_at from public.reviews
         where property_id = p.id and javno and not skriveno
         order by created_at desc limit 20) x), '[]'::jsonb));
end;
$function$;

commit;
