-- =====================================================================
--  Uloge u timu i brend agencije u vodiču (v5, 20. 10. 2026. — odluke 37)
--  Pokrenuti NAKON add-team-access.sql i add-plan-features.sql.
--
--  property_members.uloga:
--    upravitelj  — sve kao do sada (sadržaj, šifre, kalendar, rezervacije, upiti)
--    recepcija   — kalendar, rezervacije, upiti, prijave gostiju, ocjene,
--                  link za čistačicu; sadržaj samo čita; NE vidi šifru vrata
--                  ni Wi-Fi (tablica sections mu je zatvorena)
--    vlasnik     — samo čita objekt, kalendar, ocjene i preglede (izvještaj);
--                  ne vidi goste, upite ni šifre
--  Čistačica nema račun — dobiva postojeći link za čistačicu (/c/<token>).
--
--  Postojeći suradnici dobiju ulogu „upravitelj” (isto što su imali).
--  Vlasnikove politike se NE mijenjaju; mijenjaju se samo politike „suradnik”.
--
--  properties.brend = {"ime": "Agencija Adria", "boja": "#0B4F6C"} —
--  vodič ga pokazuje samo ako plan vlasnika ima mogućnost „brend”
--  (Agencija). Boja mora imati kontrast ≥ 4,5:1 s bijelim (provjera u
--  dashboardu); ovdje se provjerava samo oblik.
--
--  Bez riječi za brisanje redova — smije se pokrenuti konektorom. Ponovljivo.
-- =====================================================================

begin;

alter table public.property_members add column if not exists uloga text not null default 'upravitelj';
do $$ begin
  alter table public.property_members add constraint property_members_uloga_chk
    check (uloga in ('upravitelj', 'recepcija', 'vlasnik'));
exception when duplicate_object then null; end $$;

alter table public.properties add column if not exists brend jsonb;
do $$ begin
  alter table public.properties add constraint properties_brend_chk check (brend is null or (
    jsonb_typeof(brend) = 'object'
    and char_length(coalesce(brend->>'ime', '')) <= 60
    and coalesce(brend->>'boja', '#000000') ~ '^#[0-9A-Fa-f]{6}$'));
exception when duplicate_object then null; end $$;

-- uloga prijavljenog korisnika na objektu (NULL = nije suradnik)
create or replace function public.uloga_na_objektu(p_property uuid)
returns text language sql stable security definer set search_path = public, pg_temp
as $$
  select m.uloga from public.property_members m
   where m.property_id = p_property and m.user_id = auth.uid() and m.accepted_at is not null
   limit 1
$$;
revoke all on function public.uloga_na_objektu(uuid) from public;
grant execute on function public.uloga_na_objektu(uuid) to authenticated;

create or replace function public.ima_ulogu(p_property uuid, p_uloge text[])
returns boolean language sql stable security definer set search_path = public, pg_temp
as $$ select coalesce(public.uloga_na_objektu(p_property) = any (p_uloge), false) $$;
revoke all on function public.ima_ulogu(uuid, text[]) from public;
grant execute on function public.ima_ulogu(uuid, text[]) to authenticated;

-- objekt: čitaju sve uloge, mijenja samo upravitelj
drop policy if exists "suradnik mijenja objekt" on public.properties;
create policy "suradnik mijenja objekt" on public.properties for update to authenticated
  using (public.ima_ulogu(id, array['upravitelj'])) with check (public.ima_ulogu(id, array['upravitelj']));

-- tablice objekta: „suradnik” (sve radnje) po ulozi + „suradnik čita” (samo čitanje)
do $$
declare
  t text;
  pune  jsonb := '{
    "sections":["upravitelj"], "amenities":["upravitelj"], "local_places":["upravitelj"],
    "transport":["upravitelj"], "attractions":["upravitelj"], "house_rules":["upravitelj"],
    "faq":["upravitelj"], "availability":["upravitelj","recepcija"], "bookings":["upravitelj","recepcija"],
    "inquiries":["upravitelj","recepcija"], "reviews":["upravitelj","recepcija"],
    "guest_registrations":["upravitelj","recepcija"], "cleaner_links":["upravitelj","recepcija"],
    "calendar_exports":["upravitelj","recepcija"], "kalendar_promjene":["upravitelj","recepcija"]}';
  citaj jsonb := '{
    "amenities":["recepcija","vlasnik"], "local_places":["recepcija","vlasnik"], "transport":["recepcija","vlasnik"],
    "attractions":["recepcija","vlasnik"], "house_rules":["recepcija","vlasnik"], "faq":["recepcija","vlasnik"],
    "availability":["vlasnik"], "reviews":["vlasnik"], "cleaning_status":["upravitelj","recepcija"]}';
  u text[];
begin
  for t in select jsonb_object_keys(pune) loop
    if to_regclass('public.' || t) is null then continue; end if;
    select array_agg(x) into u from jsonb_array_elements_text(pune->t) x;
    execute format('drop policy if exists "suradnik" on public.%I', t);
    execute format('create policy "suradnik" on public.%I for all to authenticated
                    using (public.ima_ulogu(property_id, %L)) with check (public.ima_ulogu(property_id, %L))', t, u, u);
  end loop;
  for t in select jsonb_object_keys(citaj) loop
    if to_regclass('public.' || t) is null then continue; end if;
    select array_agg(x) into u from jsonb_array_elements_text(citaj->t) x;
    execute format('drop policy if exists "suradnik čita" on public.%I', t);
    execute format('create policy "suradnik čita" on public.%I for select to authenticated
                    using (public.ima_ulogu(property_id, %L))', t, u);
  end loop;
  -- cleaning_status je imao „suradnik” samo za čitanje → zamijenjen „suradnik čita”
  if to_regclass('public.cleaning_status') is not null then
    execute 'drop policy if exists "suradnik" on public.cleaning_status';
  end if;
  -- page_views: sve uloge čitaju (izvještaj) — ostaje je_suradnik
end $$;

-- suradnik vidi i svoju ulogu (vlastiti red u property_members već smije čitati)

-- mogućnost „brend” (Agencija)
do $$ begin
  update public.plans set mogucnosti = mogucnosti || '["brend"]'::jsonb
   where id = 'business' and not mogucnosti ? 'brend';
exception when undefined_column then null; end $$;

-- vodič: plan, mogućnosti, oznaka i (za Agenciju) brend objekta
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
  pl public.plans%rowtype;
  br jsonb;
begin
  if p_token is null or length(p_token) < 6 or length(p_token) > 128 then
    return jsonb_build_object('stanje', 'invalid');
  end if;
  select p.user_id, p.id into vlasnik, objekt
    from public.bookings b join public.properties p on p.id = b.property_id
   where b.token = p_token and coalesce(b.is_active, false)
     and (b.token_expires_at is null or b.token_expires_at >= now())
   limit 1;
  if vlasnik is null and p_slug is not null then
    select user_id, id into vlasnik, objekt from public.properties
     where slug = p_slug and guest_token is not null and guest_token = p_token limit 1;
  end if;
  if vlasnik is null then return jsonb_build_object('stanje', 'invalid'); end if;
  select * into pl from public.plans where id = public.current_plan_id(vlasnik);
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

-- provjera:
-- select tablename, policyname, cmd, qual from pg_policies where policyname like 'suradnik%' order by 1, 2;
