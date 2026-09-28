-- ============================================================================
--  Odmoria — ocjene i recenzije gostiju + oznaka „Stranicu pokreće Odmoria”
--  ---------------------------------------------------------------------------
--  Gost na kraju boravka u vodiču (h.html → Odlazak) da ocjenu 1–5 i kratak
--  komentar, i sam odluči smije li se prikazati na javnoj stranici.
--  - Upis ide SAMO kroz funkciju `ostavi_ocjenu(token, …)`: provjeri link
--    gosta, dopušta od dana dolaska do isteka linka, jedna ocjena po boravku.
--  - Domaćin vidi sve ocjene svojih objekata i može javnu recenziju sakriti.
--  - Javna stranica (p.html) čita samo kroz `javno_o_objektu(slug)`: prosjek,
--    broj i zadnje javne recenzije (bez rezervacije i bez prezimena), i
--    smije li se pokazati oznaka „Stranicu pokreće Odmoria”.
--
--  Oznaka ovisi o planu vlasnika (plans.can_remove_branding). Odluka vlasnika
--  (28. 9. 2026.): oznaka se vidi na Free i na najjeftinijem plaćenom (Pro),
--  a ne vidi na Business → KORAK 2 niže.
--
--  Pokrenuti u Supabase SQL editoru. Idempotentno. Treba sql/plan-limits.sql
--  (tablica plans i funkcija current_plan_id).
-- ============================================================================

-- ----------------------------------------------------------------------------
--  KORAK 1 — tablica i funkcije
-- ----------------------------------------------------------------------------
create table if not exists public.reviews (
  id          uuid primary key default gen_random_uuid(),
  property_id uuid not null references public.properties(id) on delete cascade,
  booking_id  uuid unique references public.bookings(id) on delete set null,
  ocjena      smallint not null check (ocjena between 1 and 5),
  tekst       text check (tekst is null or char_length(tekst) <= 1000),
  ime         text check (ime is null or char_length(ime) <= 60),
  javno       boolean not null default true,    -- gost dopustio objavu
  skriveno    boolean not null default false,   -- domaćin sakrio s javne stranice
  created_at  timestamptz not null default now()
);
create index if not exists reviews_property on public.reviews (property_id, created_at desc);

alter table public.reviews enable row level security;

drop policy if exists "recenzije: vlasnik čita" on public.reviews;
create policy "recenzije: vlasnik čita" on public.reviews for select to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid())
         or auth.uid() = '56549320-2c02-405c-9936-770144bd9b49');

drop policy if exists "recenzije: vlasnik skriva" on public.reviews;
create policy "recenzije: vlasnik skriva" on public.reviews for update to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()))
  with check (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));

drop policy if exists "recenzije: vlasnik briše" on public.reviews;
create policy "recenzije: vlasnik briše" on public.reviews for delete to authenticated
  using (exists (select 1 from public.properties p where p.id = property_id and p.user_id = auth.uid()));

-- Nitko ne upisuje izravno (samo funkcija); domaćin mijenja samo „skriveno”.
revoke all on public.reviews from anon, authenticated;
grant select, delete on public.reviews to authenticated;
grant update (skriveno) on public.reviews to authenticated;


-- Gost ostavlja ocjenu. Vraća { stanje: ok | vec | rano | expired | invalid | neispravno }
create or replace function public.ostavi_ocjenu(p_token text, p_ocjena int, p_tekst text default null,
                                                p_ime text default null, p_javno boolean default true)
returns jsonb language plpgsql volatile security definer set search_path = public, pg_temp
as $$
declare
  b public.bookings%rowtype;
  danas date := (now() at time zone 'Europe/Zagreb')::date;
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
  if p_ocjena is null or p_ocjena < 1 or p_ocjena > 5 then
    return jsonb_build_object('stanje', 'neispravno');
  end if;
  if exists (select 1 from public.reviews where booking_id = b.id) then
    return jsonb_build_object('stanje', 'vec');
  end if;
  insert into public.reviews (property_id, booking_id, ocjena, tekst, ime, javno)
  values (b.property_id, b.id, p_ocjena,
          nullif(left(btrim(coalesce(p_tekst, '')), 1000), ''),
          nullif(left(btrim(coalesce(p_ime, split_part(coalesce(b.guest_name, ''), ' ', 1))), 60), ''),
          coalesce(p_javno, true));
  return jsonb_build_object('stanje', 'ok');
end;
$$;

-- Je li gost s ovim linkom već ocijenio (da vodič ne nudi obrazac dvaput)
create or replace function public.ocjena_gosta(p_token text)
returns jsonb language sql stable security definer set search_path = public, pg_temp
as $$
  select coalesce(
    (select jsonb_build_object('ocijenjeno', true, 'ocjena', r.ocjena)
       from public.bookings b join public.reviews r on r.booking_id = b.id
      where b.token = p_token and length(p_token) between 6 and 128 limit 1),
    jsonb_build_object('ocijenjeno', false));
$$;

-- Sve što javna stranica smije znati osim samog objekta:
-- recenzije (samo javne i ne sakrivene) i smije li se prikazati oznaka.
create or replace function public.javno_o_objektu(p_slug text)
returns jsonb language plpgsql stable security definer set search_path = public, pg_temp
as $$
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
    'recenzije', coalesce((select jsonb_agg(x order by x.created_at desc) from (
        select ocjena, tekst, ime, created_at from public.reviews
         where property_id = p.id and javno and not skriveno
         order by created_at desc limit 20) x), '[]'::jsonb));
end;
$$;

revoke all on function public.ostavi_ocjenu(text, int, text, text, boolean) from public;
revoke all on function public.ocjena_gosta(text) from public;
revoke all on function public.javno_o_objektu(text) from public;
grant execute on function public.ostavi_ocjenu(text, int, text, text, boolean) to anon, authenticated;
grant execute on function public.ocjena_gosta(text) to anon, authenticated;
grant execute on function public.javno_o_objektu(text) to anon, authenticated;


-- ----------------------------------------------------------------------------
--  KORAK 2 — oznaka „Stranicu pokreće Odmoria” i na Pro planu
--  (odluka vlasnika: vidi se na Free i najjeftinijem plaćenom planu)
-- ----------------------------------------------------------------------------
update public.plans set can_remove_branding = false where id = 'pro';
